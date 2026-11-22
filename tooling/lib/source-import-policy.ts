import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { dependencyFields } from "./manifest-policy";
import {
	fileReadConcurrency,
	type ImportReference,
	importReferences,
	mapWithConcurrency,
	type PathAlias,
	pathAliases,
	resolveFile,
	resolveLocalImport,
	sourceFiles,
} from "./source-import-parsing";
import {
	breaksBoundary,
	codegenOnlyEntries,
	generatedSource,
	isDumSchemaAuthoringSpecifier,
	isExplicitAuthoringSource,
	loadsCorpusOutsideRuntimeEntry,
	type ModuleBoundary,
	mayLoadCodegenOnlyEntry,
	moduleBoundaries,
	runtimeCorpusEntry,
	toolingReaches,
} from "./source-import-rules";
import { stringRecord, type Workspace } from "./workspaces";

export interface ImportPolicyIssue {
	file: string;
	message: string;
	specifier: string;
}

function workspaceForPath(
	path: string,
	workspaces: Workspace[],
): Workspace | undefined {
	return workspaces.find(
		(workspace) =>
			path === workspace.dir ||
			path.startsWith(
				`${workspace.dir}${process.platform === "win32" ? "\\" : "/"}`,
			),
	);
}

/** Whether an issue involving these workspaces belongs to the scope's report. */
function inScope(
	scope: string | undefined,
	...workspaces: (Workspace | undefined)[]
): boolean {
	return (
		scope === undefined ||
		workspaces.some((workspace) => workspace?.relativePath === scope)
	);
}

function importedWorkspace(
	specifier: string,
	workspaces: Workspace[],
): Workspace | undefined {
	return workspaces.find((workspace) => {
		const name = workspace.manifest.name;
		return (
			typeof name === "string" &&
			(specifier === name || specifier.startsWith(`${name}/`))
		);
	});
}

function exportsKeys(manifest: Workspace["manifest"]): string[] {
	const exports = manifest.exports;
	if (typeof exports === "string" || Array.isArray(exports)) return ["."];
	if (!exports || typeof exports !== "object") return [];
	const keys = Object.keys(exports);
	return keys.some((key) => key.startsWith(".")) ? keys : ["."];
}

function matchesExport(exportKey: string, requested: string): boolean {
	if (!exportKey.includes("*")) return exportKey === requested;
	const escaped = exportKey
		.replace(/[.+?^${}()|[\]\\]/g, "\\$&")
		.replace("*", ".*");
	return new RegExp(`^${escaped}$`).test(requested);
}

/**
 * The file in the repository an export target names: its `bun` condition or
 * a plain string. The `types` and `import` targets point into `dist/`, which
 * is build output and may not exist.
 */
function sourceExportTarget(value: unknown): string | undefined {
	if (typeof value === "string") return value;
	if (
		value &&
		typeof value === "object" &&
		"bun" in value &&
		typeof value.bun === "string"
	)
		return value.bun;
	return undefined;
}

/**
 * Why `requested` (`.` or `./subpath`) is not a usable entry of `target`:
 * no `exports` key matches it, or the key is a wildcard whose source target
 * has no file behind the requested path.
 */
function exportIssue(
	repositoryRoot: string,
	target: Workspace,
	requested: string,
): string | undefined {
	const targetName = target.manifest.name as string;
	const key = exportsKeys(target.manifest).find((candidate) =>
		matchesExport(candidate, requested),
	);
	if (key === undefined)
		return `${requested} is not declared by ${targetName}#exports`;
	if (!key.includes("*")) return undefined;
	const pattern = sourceExportTarget(
		(target.manifest.exports as Record<string, unknown>)[key],
	);
	if (!pattern?.includes("*")) return undefined;
	const [prefix = "", suffix = ""] = key.split("*");
	const matched = requested.slice(
		prefix.length,
		requested.length - suffix.length,
	);
	const file = join(target.dir, pattern.replace("*", matched));
	if (existsSync(file)) return undefined;
	return `${requested} matches ${targetName}#exports "${key}", but its target ${relative(repositoryRoot, file).replaceAll("\\", "/")} does not exist`;
}

function declaredDependencies(workspace: Workspace): Set<string> {
	return new Set(
		dependencyFields.flatMap((field) =>
			Object.keys(stringRecord(workspace.manifest[field])),
		),
	);
}

function findCycles(edges: Map<string, Set<string>>): string[][] {
	const cycles: string[][] = [];
	const visiting = new Set<string>();
	const visited = new Set<string>();
	const stack: string[] = [];

	function visit(node: string): void {
		if (visiting.has(node)) {
			const start = stack.indexOf(node);
			cycles.push([...stack.slice(start), node]);
			return;
		}
		if (visited.has(node)) return;
		visiting.add(node);
		stack.push(node);
		for (const next of edges.get(node) ?? []) visit(next);
		stack.pop();
		visiting.delete(node);
		visited.add(node);
	}

	for (const node of edges.keys()) visit(node);
	return cycles;
}

function requestedEntry(specifier: string, packageName: string): string {
	return specifier === packageName
		? "."
		: `.${specifier.slice(packageName.length)}`;
}

/**
 * `tooling/` is no workspace, but its imports follow the same boundaries: a
 * package only through its declared `exports`, a package's internals only
 * through a `toolingReaches` entry. Tooling is development code, so the
 * schema-authoring, codegen-only and runtime-corpus rules don't apply. Nor
 * does the declared-dependency check: the root manifest is the workspace
 * root, which Bun links every workspace into, not a package, and declaring
 * the workspaces there would make the root depend on its own members.
 */
async function validateToolingImports(options: {
	repositoryRoot: string;
	scope?: string;
	workspaces: Workspace[];
}): Promise<ImportPolicyIssue[]> {
	const toolingDir = join(options.repositoryRoot, "tooling");
	if (!existsSync(toolingDir)) return [];
	const repositoryPath = (path: string) =>
		relative(options.repositoryRoot, path).replaceAll("\\", "/");
	const files = await sourceFiles(toolingDir);
	const perFileIssues = await mapWithConcurrency(
		files,
		fileReadConcurrency,
		async (file) => {
			const issues: ImportPolicyIssue[] = [];
			const importer = repositoryPath(file);
			const contents = await readFile(file, "utf8");
			for (const { specifier } of importReferences(contents, file)) {
				if (specifier.startsWith(".") || isAbsolute(specifier)) {
					const resolved = resolveFile(
						resolve(dirname(file), specifier),
					);
					const target = workspaceForPath(
						resolved,
						options.workspaces,
					);
					if (!target || !inScope(options.scope, target)) continue;
					const targetPath = repositoryPath(resolved);
					if (
						!toolingReaches.some(
							(reach) =>
								reach.importer === importer &&
								reach.target === targetPath,
						)
					)
						issues.push({
							file: importer,
							message: `tooling reaches into ${target.relativePath} by path; import a declared export or list the reach in toolingReaches with a reason`,
							specifier,
						});
					continue;
				}
				const target = importedWorkspace(specifier, options.workspaces);
				if (!target || !inScope(options.scope, target)) continue;
				const message = exportIssue(
					options.repositoryRoot,
					target,
					requestedEntry(specifier, target.manifest.name as string),
				);
				if (message)
					issues.push({ file: importer, message, specifier });
			}
			return issues;
		},
	);
	return perFileIssues.flat();
}

interface WorkspaceImportContext {
	aliases: readonly PathAlias[];
	boundaries: readonly ModuleBoundary[];
	declared: ReadonlySet<string>;
	repositoryRoot: string;
	scope?: string;
	workspace: Workspace;
	workspaces: Workspace[];
}

interface FileImportValidation {
	edges: string[];
	issues: ImportPolicyIssue[];
}

function boundaryIssuesForImport(
	context: WorkspaceImportContext,
	file: string,
	importer: string,
	reference: ImportReference,
): ImportPolicyIssue[] {
	if (context.boundaries.length === 0 || generatedSource.test(importer))
		return [];
	const resolved = resolveLocalImport(
		file,
		reference.specifier,
		context.aliases,
	);
	if (!resolved || !workspaceForPath(resolved, [context.workspace]))
		return [];
	if (!inScope(context.scope, context.workspace)) return [];
	const target = relative(context.repositoryRoot, resolved).replaceAll(
		"\\",
		"/",
	);
	const issues: ImportPolicyIssue[] = [];
	for (const boundary of context.boundaries) {
		if (breaksBoundary(boundary, importer, target, reference)) {
			issues.push({
				file: importer,
				message: `${boundary.name}: ${boundary.comment}`,
				specifier: reference.specifier,
			});
		}
	}
	return issues;
}

function checkRelativeCrossWorkspaceImport(
	context: WorkspaceImportContext,
	file: string,
	specifier: string,
): { edge?: string; issue?: ImportPolicyIssue } {
	const targetPath = resolve(dirname(file), specifier);
	const target = workspaceForPath(targetPath, context.workspaces);
	if (!target || target.dir === context.workspace.dir) return {};
	return {
		edge: target.relativePath,
		...(inScope(context.scope, context.workspace, target)
			? {
					issue: {
						file: relative(context.repositoryRoot, file),
						message: `relative/filesystem import crosses into ${target.relativePath}`,
						specifier,
					},
				}
			: {}),
	};
}

function checkWorkspacePackageImport(
	context: WorkspaceImportContext,
	file: string,
	importer: string,
	reference: ImportReference,
	target: Workspace,
): FileImportValidation {
	const { specifier } = reference;
	const edges: string[] = [];
	const issues: ImportPolicyIssue[] = [];
	const report = (message: string): void => {
		if (inScope(context.scope, context.workspace, target)) {
			issues.push({
				file: relative(context.repositoryRoot, file),
				message,
				specifier,
			});
		}
	};

	if (
		isDumSchemaAuthoringSpecifier(specifier) &&
		!isExplicitAuthoringSource(context.workspace, file, specifier)
	) {
		report("operational source cannot import schema-authoring surfaces");
	}
	if (
		codegenOnlyEntries.has(specifier) &&
		!reference.typeOnly &&
		!mayLoadCodegenOnlyEntry(
			context.repositoryRoot,
			context.workspace,
			file,
		)
	) {
		report(
			"only code generators, scripts and tests may load a codegen-only entry",
		);
	}
	if (loadsCorpusOutsideRuntimeEntry(importer, specifier, reference)) {
		report(
			`runtime code may load only ${runtimeCorpusEntry}; the gold loader and review tooling are for development and evaluation`,
		);
	}
	if (target.dir === context.workspace.dir) return { edges, issues };

	edges.push(target.relativePath);
	const targetName = target.manifest.name as string;
	if (context.workspace.kind === "battery" && target.kind === "app") {
		report("batteries cannot import apps");
	}
	if (!context.declared.has(targetName)) {
		report(`${targetName} is not declared in this package manifest`);
	}
	const message = exportIssue(
		context.repositoryRoot,
		target,
		requestedEntry(specifier, targetName),
	);
	if (message) report(message);
	return { edges, issues };
}

async function validateFileImports(
	context: WorkspaceImportContext,
	file: string,
): Promise<FileImportValidation> {
	const contents = await readFile(file, "utf8");
	const importer = relative(context.repositoryRoot, file).replaceAll(
		"\\",
		"/",
	);
	const edges: string[] = [];
	const issues: ImportPolicyIssue[] = [];

	for (const reference of importReferences(contents, file)) {
		issues.push(
			...boundaryIssuesForImport(context, file, importer, reference),
		);
		const { specifier } = reference;
		if (specifier.startsWith(".") || isAbsolute(specifier)) {
			const result = checkRelativeCrossWorkspaceImport(
				context,
				file,
				specifier,
			);
			if (result.issue) issues.push(result.issue);
			if (result.edge) edges.push(result.edge);
			continue;
		}
		const target = importedWorkspace(specifier, context.workspaces);
		if (!target) continue;
		const result = checkWorkspacePackageImport(
			context,
			file,
			importer,
			reference,
			target,
		);
		issues.push(...result.issues);
		edges.push(...result.edges);
	}
	return { edges, issues };
}

async function validateWorkspaceImports(
	options: {
		repositoryRoot: string;
		scope?: string;
		workspaces: Workspace[];
	},
	workspace: Workspace,
): Promise<FileImportValidation> {
	const boundaries = moduleBoundaries.get(workspace.relativePath) ?? [];
	const context: WorkspaceImportContext = {
		aliases: boundaries.length > 0 ? await pathAliases(workspace.dir) : [],
		boundaries,
		declared: declaredDependencies(workspace),
		repositoryRoot: options.repositoryRoot,
		...(options.scope !== undefined ? { scope: options.scope } : {}),
		workspace,
		workspaces: options.workspaces,
	};
	const files = await sourceFiles(workspace.dir);
	const results = await mapWithConcurrency(
		files,
		fileReadConcurrency,
		(file) => validateFileImports(context, file),
	);
	const edges: string[] = [];
	const issues: ImportPolicyIssue[] = [];
	for (const result of results) {
		issues.push(...result.issues);
		edges.push(...result.edges);
	}
	return { edges, issues };
}

/**
 * With a `scope` (a workspace's repository-relative path), reports only the
 * issues that touch that workspace: its own files' imports, imports into it
 * from other workspaces or tooling, and cross-workspace cycles through it.
 * Every workspace is still read, since edges into the scope start elsewhere.
 */
export async function validateSourceImports(options: {
	repositoryRoot: string;
	scope?: string;
	workspaces: Workspace[];
}): Promise<ImportPolicyIssue[]> {
	const issues: ImportPolicyIssue[] = [];
	const graph = new Map(
		options.workspaces.map((workspace) => [
			workspace.relativePath,
			new Set<string>(),
		]),
	);

	for (const workspace of options.workspaces) {
		const result = await validateWorkspaceImports(options, workspace);
		issues.push(...result.issues);
		const workspaceEdges = graph.get(workspace.relativePath);
		for (const edge of result.edges) workspaceEdges?.add(edge);
	}
	issues.push(...(await validateToolingImports(options)));

	for (const cycle of findCycles(graph)) {
		if (options.scope !== undefined && !cycle.includes(options.scope))
			continue;
		issues.push({
			file: cycle[0] ?? ".",
			message: `cross-workspace cycle: ${cycle.join(" -> ")}`,
			specifier: cycle.join(" -> "),
		});
	}
	return issues;
}

export function conventionalArchitectureInputs(packageDir: string): string[] {
	const inputs = [
		"src",
		"shared",
		"lib",
		"workspace",
		"server",
		"convex",
		"codegen",
		"cli",
		"lab",
		"tests",
		"test",
		"scripts",
		"generate-readme",
	].filter((path) => existsSync(join(packageDir, path)));
	return inputs.length > 0 ? inputs : ["."];
}
