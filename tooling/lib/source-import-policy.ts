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
	".runs",
	"dist",
	"node_modules",
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

interface ImportReference {
	specifier: string;
	/**
	 * Erased before runtime: `import type`, `export type` and `import("…")`
	 * type nodes. An inline `type` specifier still loads its module under
	 * `verbatimModuleSyntax`, so it does not count.
	 */
	typeOnly: boolean;
}

function importReferences(contents: string, file: string): ImportReference[] {
	const script =
		extname(file) === ".astro"
			? (contents.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] ?? "")
			: contents;
	const references: ImportReference[] = [];
	const addLiteral = (node: unknown, typeOnly = false): void => {
		if (
			node &&
			typeof node === "object" &&
			"value" in node &&
			typeof node.value === "string"
		)
			references.push({ specifier: node.value, typeOnly });
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
			addLiteral(node.source, node.exportKind === "type");
		},
		ExportNamedDeclaration(node) {
			addLiteral(node.source, node.exportKind === "type");
		},
		ImportDeclaration(node) {
			addLiteral(node.source, node.importKind === "type");
		},
		ImportExpression(node) {
			addLiteral(node.source);
		},
		TSImportType(node) {
			addLiteral(node.source, true);
		},
		TSExternalModuleReference(node) {
			addLiteral(node.expression);
		},
	}).visit(parsed.program);
	return references;
}

/**
 * A boundary inside one app: a file matching `from`, or not matching
 * `fromNot`, may not import a module matching `to`. Paths are
 * repository-relative. Relative and tsconfig-alias imports from every folder
 * count, type-only ones included unless `allowTypeOnly` says they erase.
 */
interface ModuleBoundary {
	name: string;
	comment: string;
	from?: RegExp;
	fromNot?: RegExp;
	to: RegExp;
	allowTypeOnly?: boolean;
}

const moduleBoundaries = new Map<string, readonly ModuleBoundary[]>([
	[
		"battery/dumling",
		[
			{
				name: "dumling-runtime-does-not-import-codegen",
				comment:
					"Dumling's codegen folder, its `dumling/codegen` entry included, is for generators only (ADR 0001).",
				from: /^battery\/dumling\/src\//,
				to: /^battery\/dumling\/codegen\//,
				allowTypeOnly: true,
			},
		],
	],
	[
		"app/tf-demo",
		[
			{
				name: "tf-demo-server-does-not-import-convex",
				comment:
					"Application logic must not depend on the Convex adapter layer at runtime. Type-only imports erase, so server code may name a type the Convex schema owns.",
				from: /^app\/tf-demo\/server\//,
				to: /^app\/tf-demo\/convex\//,
				allowTypeOnly: true,
			},
			{
				name: "tf-demo-convex-does-not-import-ui",
				comment:
					"Convex modules must not depend on browser implementation code.",
				from: /^app\/tf-demo\/convex\//,
				to: /^app\/tf-demo\/src\//,
			},
			{
				name: "tf-demo-dumdict-storage-implementation-is-private",
				comment:
					"Callers must choose the action-level or transaction-local Dumdict interface; its implementation folder is private.",
				fromNot:
					/^app\/tf-demo\/convex\/(?:dumdictStorage|dumdictActionStorage|dumdictTransaction)(?:\.ts|\/)/,
				to: /^app\/tf-demo\/convex\/dumdictStorage\//,
			},
			{
				name: "tf-demo-notes-hide-their-internals",
				comment:
					"Outside code, including tests, may use only the Notes root interface.",
				fromNot: /^app\/tf-demo\/src\/notes\//,
				to: /^app\/tf-demo\/src\/notes\/(?!index\.ts$)/,
			},
			{
				name: "tf-demo-notes-universal-does-not-import-languages",
				comment:
					"Universal Note rendering must not depend on a language module.",
				from: /^app\/tf-demo\/src\/notes\/universal\//,
				to: /^app\/tf-demo\/src\/notes\/de\//,
			},
			{
				name: "tf-demo-german-renderer-overrides-are-private",
				comment:
					"Private German renderer leaves may only be imported by the auditable German registry.",
				fromNot: /^app\/tf-demo\/src\/notes\/de\/registry\.ts$/,
				to: /^app\/tf-demo\/src\/notes\/de\/block-renderer-overrides\//,
			},
		],
	],
]);

/** Generated code imports what its generator decides; no boundary applies. */
const generatedSource = /\/convex\/_generated\//;

function breaksBoundary(
	boundary: ModuleBoundary,
	importer: string,
	target: string,
	reference: ImportReference,
): boolean {
	if (boundary.from && !boundary.from.test(importer)) return false;
	if (boundary.fromNot?.test(importer)) return false;
	if (!boundary.to.test(target)) return false;
	return !(boundary.allowTypeOnly && reference.typeOnly);
}

interface PathAlias {
	prefix: string;
	suffix: string;
	wildcard: boolean;
	targets: string[];
}

/** The `compilerOptions.paths` of a workspace's root tsconfig. */
async function pathAliases(workspaceDir: string): Promise<PathAlias[]> {
	const path = join(workspaceDir, "tsconfig.json");
	if (!existsSync(path)) return [];
	const config = Bun.JSONC.parse(await readFile(path, "utf8")) as {
		compilerOptions?: {
			baseUrl?: string;
			paths?: Record<string, string[]>;
		};
	};
	const base = join(workspaceDir, config.compilerOptions?.baseUrl ?? ".");
	return Object.entries(config.compilerOptions?.paths ?? {}).map(
		([pattern, targets]) => {
			const [prefix = "", suffix = ""] = pattern.split("*");
			return {
				prefix,
				suffix,
				wildcard: pattern.includes("*"),
				targets: targets.map((target) => join(base, target)),
			};
		},
	);
}

const resolvableExtensions = [".ts", ".tsx", ".d.ts", ".js", ".jsx", ".mjs"];

function resolveFile(base: string): string {
	const candidates = [
		base,
		base.replace(/\.([cm]?)js(x?)$/, ".$1ts$2"),
		...resolvableExtensions.map((extension) => `${base}${extension}`),
		...resolvableExtensions.map((extension) =>
			join(base, `index${extension}`),
		),
	];
	return (
		candidates.find(
			(candidate) =>
				existsSync(candidate) &&
				sourceExtensions.has(extname(candidate)),
		) ?? base
	);
}

/** The file a relative or aliased specifier names, or undefined for a package. */
function resolveLocalImport(
	file: string,
	specifier: string,
	aliases: readonly PathAlias[],
): string | undefined {
	if (specifier.startsWith(".")) {
		return resolveFile(resolve(dirname(file), specifier));
	}
	for (const alias of aliases) {
		const matches = alias.wildcard
			? specifier.startsWith(alias.prefix) &&
				specifier.endsWith(alias.suffix)
			: specifier === alias.prefix;
		const target = alias.targets[0];
		if (!matches || !target) continue;
		const matched = specifier.slice(
			alias.prefix.length,
			specifier.length - alias.suffix.length,
		);
		return resolveFile(target.replace("*", matched));
	}
	return undefined;
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

/**
 * Package entries only generators read: Dumling's route manifest and
 * operation table (Dumling ADR 0001). Operational code may name their types
 * but not load them.
 */
const codegenOnlyEntries = new Set(["dumling/codegen"]);
const codegenFolders = new Set([
	"codegen",
	"generate-readme",
	"scripts",
	"test",
	"tests",
]);
/** Source modules outside those folders that only scripts and tests load. */
const codegenOnlyConsumers = new Set([
	"battery/dumcorpus/src/worklist/schema-values.ts",
]);

function mayLoadCodegenOnlyEntry(
	repositoryRoot: string,
	workspace: Workspace,
	file: string,
): boolean {
	const path = relative(workspace.dir, file).replaceAll("\\", "/");
	return (
		codegenFolders.has(path.split("/")[0] ?? "") ||
		codegenOnlyConsumers.has(
			relative(repositoryRoot, file).replaceAll("\\", "/"),
		)
	);
}

function isExplicitAuthoringSource(
	workspace: Workspace,
	file: string,
	specifier: string,
): boolean {
	const path = relative(workspace.dir, file).replaceAll("\\", "/");
	if (
		specifier === `${workspace.manifest.name}/development` &&
		workspace.manifest.name === "dumgen" &&
		path === "cli/evaluate.ts"
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
		path.startsWith("src/universal/schemas.") ||
		path.startsWith("src/promptsmith/")
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
		const boundaries = moduleBoundaries.get(workspace.relativePath) ?? [];
		const aliases =
			boundaries.length > 0 ? await pathAliases(workspace.dir) : [];
		for (const file of await sourceFiles(workspace.dir)) {
			const contents = await readFile(file, "utf8");
			const importer = relative(options.repositoryRoot, file).replaceAll(
				"\\",
				"/",
			);
			for (const reference of importReferences(contents, file)) {
				const { specifier } = reference;
				const resolved =
					boundaries.length > 0 && !generatedSource.test(importer)
						? resolveLocalImport(file, specifier, aliases)
						: undefined;
				if (resolved && workspaceForPath(resolved, [workspace])) {
					const target = relative(
						options.repositoryRoot,
						resolved,
					).replaceAll("\\", "/");
					for (const boundary of boundaries) {
						if (
							breaksBoundary(
								boundary,
								importer,
								target,
								reference,
							)
						)
							issues.push({
								file: importer,
								message: `${boundary.name}: ${boundary.comment}`,
								specifier,
							});
					}
				}
				if (specifier.startsWith(".") || isAbsolute(specifier)) {
					const targetPath = resolve(dirname(file), specifier);
					const target = workspaceForPath(
						targetPath,
						options.workspaces,
					);
					if (target && target.dir !== workspace.dir) {
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
				if (
					codegenOnlyEntries.has(specifier) &&
					!reference.typeOnly &&
					!mayLoadCodegenOnlyEntry(
						options.repositoryRoot,
						workspace,
						file,
					)
				) {
					issues.push({
						file: relative(options.repositoryRoot, file),
						message:
							"only code generators, scripts and tests may load a codegen-only entry",
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
