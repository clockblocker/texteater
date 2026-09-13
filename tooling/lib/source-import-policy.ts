import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import {
	dirname,
	extname,
	isAbsolute,
	join,
	relative,
	resolve,
} from "node:path";
import { parseSync, Visitor } from "oxc-parser";
import { stringRecord, type Workspace } from "./workspaces";

export interface ImportPolicyIssue {
	file: string;
	message: string;
	specifier: string;
}

const sourceExtensions = new Set([
	".astro",
	".cjs",
	".js",
	".jsx",
	".mjs",
	".ts",
	".tsx",
]);
const ignoredDirectories = new Set([
	".astro",
	".git",
	"dist",
	"node_modules",
	"experimets",
]);
async function sourceFiles(dir: string): Promise<string[]> {
	const files: string[] = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		if (ignoredDirectories.has(entry.name)) continue;
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await sourceFiles(path)));
		} else if (sourceExtensions.has(extname(entry.name))) {
			files.push(path);
		}
	}
	return files;
}

function importSpecifiers(contents: string, file: string): string[] {
	const script =
		extname(file) === ".astro"
			? (contents.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] ?? "")
			: contents;
	const specifiers: string[] = [];
	const addLiteral = (node: unknown): void => {
		if (
			node &&
			typeof node === "object" &&
			"value" in node &&
			typeof node.value === "string"
		)
			specifiers.push(node.value);
	};
	const parsed = parseSync(file, script, {
		lang:
			file.endsWith(".tsx") ||
			file.endsWith(".jsx") ||
			file.endsWith(".astro")
				? "tsx"
				: "ts",
		sourceType: "unambiguous",
	});
	new Visitor({
		CallExpression(node) {
			if (
				node.callee.type === "Identifier" &&
				node.callee.name === "require"
			)
				addLiteral(node.arguments[0]);
		},
		ExportAllDeclaration(node) {
			addLiteral(node.source);
		},
		ExportNamedDeclaration(node) {
			addLiteral(node.source);
		},
		ImportDeclaration(node) {
			addLiteral(node.source);
		},
		ImportExpression(node) {
			addLiteral(node.source);
		},
		TSImportType(node) {
			addLiteral(node.source);
		},
		TSExternalModuleReference(node) {
			addLiteral(node.expression);
		},
	}).visit(parsed.program);
	return specifiers;
}

const dumSchemaAuthoringSubpaths = new Set([
	"dangerously-heavy-schema-tree",
	"model-authoring",
	"schema",
	"schemas",
	"development",
]);
const dumPackages = new Set(["dumdict", "dumgen", "dumling", "dumrel"]);

function isDumSchemaAuthoringSpecifier(specifier: string): boolean {
	const [packageName, subpath, ...rest] = specifier.split("/");
	return (
		dumPackages.has(packageName ?? "") &&
		(rest.length === 0 || subpath === "schema") &&
		dumSchemaAuthoringSubpaths.has(subpath ?? "")
	);
}

const buildSourceSeams = new Map<string, readonly string[]>([
	[
		"battery/dumdict/codegen/generate-unit-schemas.ts",
		[
			"../../dumling/codegen/routes.js",
			"../../dumrel/codegen/format-typescript.js",
		],
	],
	[
		"battery/dumdict/codegen/validation-artifacts.ts",
		[
			"../../dumling/codegen/operations.js",
			"../../dumrel/codegen/format-typescript.js",
			"../../dumrel/src/semantics.js",
		],
	],
	[
		"battery/dumgen/codegen/generate.ts",
		[
			"../../dumling/codegen/operations.js",
			"../../dumling/codegen/routes.js",
			"../../dumrel/codegen/format-typescript.js",
			"../../dumrel/src/semantics.js",
		],
	],
	[
		"battery/dumrel/codegen/generate.ts",
		["../../dumling/codegen/operations.js"],
	],
	[
		"app/laboratory/tests/evaluations.test.ts",
		["../../../battery/dumgen/cli/evaluate"],
	],
]);
function isExplicitAuthoringSource(
	workspace: Workspace,
	file: string,
	specifier: string,
): boolean {
	const path = relative(workspace.dir, file).replaceAll("\\", "/");
	if (
		specifier === "dumgen/development" &&
		((workspace.relativePath === "app/laboratory" &&
			[
				"src/evaluations.ts",
				"src/session-log.ts",
				"tests/evaluations.test.ts",
			].includes(path)) ||
			(workspace.manifest.name === "dumgen" &&
				path === "cli/evaluate.ts"))
	)
		return true;

	const segments = path.split("/");
	const topLevel = segments[0];
	if (
		workspace.kind === "app" &&
		(topLevel === "test" || topLevel === "tests")
	) {
		return (
			specifier.endsWith("/dangerously-heavy-schema-tree") ||
			specifier.endsWith("/model-authoring")
		);
	}
	if (path.startsWith("src/to-generate/docs/")) return true;
	if (
		workspace.kind === "battery" &&
		["codegen", "docs", "generate-readme", "test", "tests"].includes(
			topLevel ?? "",
		)
	) {
		return true;
	}
	if (workspace.kind !== "battery") return false;
	return (
		segments.some(
			(segment) => segment === "schema" || segment === "schemas",
		) ||
		/(?:^|\/)(?:dangerously-heavy-schema-tree|model-authoring|public-schema|[a-z-]*schemas|schema)\.[cm]?[jt]sx?$/u.test(
			path,
		) ||
		path.startsWith("src/development/") ||
		path.startsWith("src/selection-schemas.") ||
		path.startsWith("src/universal/schemas.") ||
		path.startsWith("src/promptsmith/") ||
		path.startsWith("src/catalog/laboratory/")
	);
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

function declaredDependencies(workspace: Workspace): Set<string> {
	return new Set(
		[
			"dependencies",
			"devDependencies",
			"optionalDependencies",
			"peerDependencies",
		].flatMap((field) =>
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

export async function validateSourceImports(options: {
	repositoryRoot: string;
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
		const declared = declaredDependencies(workspace);
		for (const file of await sourceFiles(workspace.dir)) {
			const contents = await readFile(file, "utf8");
			for (const specifier of importSpecifiers(contents, file)) {
				if (specifier.startsWith(".") || isAbsolute(specifier)) {
					const targetPath = resolve(dirname(file), specifier);
					const target = workspaceForPath(
						targetPath,
						options.workspaces,
					);
					if (target && target.dir !== workspace.dir) {
						if (
							!buildSourceSeams
								.get(relative(options.repositoryRoot, file))
								?.includes(specifier)
						)
							issues.push({
								file: relative(options.repositoryRoot, file),
								message: `relative/filesystem import crosses into ${target.relativePath}`,
								specifier,
							});
						graph
							.get(workspace.relativePath)
							?.add(target.relativePath);
					}
					continue;
				}

				const target = importedWorkspace(specifier, options.workspaces);
				if (!target) continue;
				if (
					isDumSchemaAuthoringSpecifier(specifier) &&
					!isExplicitAuthoringSource(workspace, file, specifier)
				) {
					issues.push({
						file: relative(options.repositoryRoot, file),
						message:
							"operational source cannot import schema-authoring surfaces",
						specifier,
					});
				}
				if (target.dir === workspace.dir) continue;
				graph.get(workspace.relativePath)?.add(target.relativePath);
				const targetName = target.manifest.name as string;
				if (workspace.kind === "battery" && target.kind === "app") {
					issues.push({
						file: relative(options.repositoryRoot, file),
						message: "batteries cannot import apps",
						specifier,
					});
				}
				if (!declared.has(targetName)) {
					issues.push({
						file: relative(options.repositoryRoot, file),
						message: `${targetName} is not declared in this package manifest`,
						specifier,
					});
				}
				const requested =
					specifier === targetName
						? "."
						: `.${specifier.slice(targetName.length)}`;
				if (
					!exportsKeys(target.manifest).some((key) =>
						matchesExport(key, requested),
					)
				) {
					issues.push({
						file: relative(options.repositoryRoot, file),
						message: `${requested} is not declared by ${targetName}#exports`,
						specifier,
					});
				}
			}
		}
	}

	for (const cycle of findCycles(graph)) {
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
		"tests",
		"test",
		"scripts",
		"generate-readme",
	].filter((path) => existsSync(join(packageDir, path)));
	return inputs.length > 0 ? inputs : ["."];
}
