/**
 * #419's rule: an export is public only while something outside its package
 * calls it. Knip judges an export at its declaration and counts every
 * importer, the package's own `src/`, tests and codegen included, and it
 * doesn't treat an entry file's `export { … } from` lines as exports of that
 * entry. This pass reads knip's module graph from the other side: for every
 * name a package's public entry point exports, declared there or re-exported,
 * it asks whether a file outside the package references that name through
 * the entry, following re-exports the way knip does.
 */
import { existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { Glob } from "bun";

/** The parts of knip's per-import record (`ImportMaps`) this pass reads. */
export interface ImportMaps {
	refs: Set<string>;
	import: Map<string, Set<string>>;
	importAs: Map<string, Map<string, Set<string>>>;
	importNs: Map<string, Set<string>>;
	reExport: Map<string, Set<string>>;
	reExportAs: Map<string, Map<string, Set<string>>>;
	reExportNs: Map<string, Set<string>>;
}

/** The parts of knip's export record (`Export`) this pass reads. */
interface ExportItem {
	type: string;
	jsDocTags: Set<string>;
	/** Set on an `export { … } from` line, whose declaration lies elsewhere. */
	isReExport: boolean;
}

/** The parts of knip's module graph node (`FileNode`) this pass reads. */
export interface FileNode {
	imports: { internal: Map<string, ImportMaps> };
	exports: Map<string, ExportItem>;
	importedBy: ImportMaps | undefined;
}

export type ModuleGraph = Map<string, FileNode>;

/** A workspace with a manifest `exports` field. */
export interface PublicPackage {
	/** Absolute directory. */
	dir: string;
	/** Absolute source files the manifest's `exports` resolve to. */
	entries: string[];
}

export interface PublicSurfaceFinding {
	/** The entry file, relative to the repository root. */
	file: string;
	type: "exports" | "types";
	name: string;
}

// Knip's markers (`knip/dist/constants.js`): `*` keys an `export * from`, and
// `__opaque` marks a namespace import used as a whole value, such as
// `Object.keys(ns)`, which may read any of its names.
const importStar = "*";
const opaque = "__opaque";
const typeKinds = new Set(["type", "interface", "enum"]);
// The condition order of `tooling/lib/knip-convex-condition.ts`: in-house
// packages resolve to their source through `convex`.
const conditions = ["convex", "bun", "import", "default"];
const sourceFile = /\.(?:[cm]?[jt]sx?)$/;

function conditionTarget(value: unknown): string | undefined {
	if (typeof value === "string") return value;
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return undefined;
	}
	const record = value as Record<string, unknown>;
	for (const condition of conditions) {
		if (condition in record) return conditionTarget(record[condition]);
	}
	return undefined;
}

/** The source files a manifest's `exports` resolve to under `convex`. */
export function publicEntryFiles(
	dir: string,
	manifest: Record<string, unknown>,
): string[] {
	const exportsField = manifest.exports;
	if (!exportsField || typeof exportsField !== "object") return [];
	const targets = Object.values(exportsField).flatMap((value) => {
		const target = conditionTarget(value);
		return target ? [target] : [];
	});
	const files = targets.flatMap((target) => {
		if (!sourceFile.test(target)) return [];
		if (!target.includes("*")) {
			const file = join(dir, target);
			return existsSync(file) ? [file] : [];
		}
		return [...new Glob(target).scanSync({ cwd: dir, absolute: true })];
	});
	return [...new Set(files)].sort();
}

function importersOf(node: FileNode): Set<string> {
	const importers = new Set<string>();
	const by = node.importedBy;
	if (!by) return importers;
	for (const map of [by.import, by.importNs, by.reExport, by.reExportNs]) {
		for (const files of map.values())
			for (const file of files) {
				importers.add(file);
			}
	}
	for (const map of [by.importAs, by.reExportAs]) {
		for (const aliases of map.values()) {
			for (const files of aliases.values())
				for (const file of files) {
					importers.add(file);
				}
		}
	}
	return importers;
}

/**
 * Whether one importer's record of a file references `id`. A namespace used
 * as a whole value, `Object.keys(ns)` or `{ ...ns }`, may read any value but
 * no type.
 */
function directlyReferences(
	maps: ImportMaps,
	id: string,
	isTypeName: boolean,
): boolean {
	const namespaces = [...maps.importNs.keys()];
	if (
		!isTypeName &&
		(maps.import.has(opaque) ||
			namespaces.some((namespace) => maps.refs.has(namespace)))
	) {
		return true;
	}
	const [head = "", ...rest] = id.split(".");
	if (maps.import.has(head) && (rest.length === 0 || maps.refs.has(id))) {
		return true;
	}
	for (const alias of maps.importAs.get(head)?.keys() ?? []) {
		if (rest.length === 0 || maps.refs.has([alias, ...rest].join("."))) {
			return true;
		}
	}
	return namespaces.some((namespace) => maps.refs.has(`${namespace}.${id}`));
}

/**
 * Whether a file outside `packageDir` references `id` as exported by `file`.
 * Re-exports are followed through any file, inside the package or not.
 */
function isReferencedOutside(
	graph: ModuleGraph,
	packageDir: string,
	file: string,
	id: string,
	isTypeName: boolean,
	seen = new Set<string>(),
): boolean {
	const key = `${file}\0${id}`;
	if (seen.has(key)) return false;
	seen.add(key);
	const node = graph.get(file);
	if (!node) return false;
	const [head = "", ...rest] = id.split(".");
	for (const importer of importersOf(node)) {
		const maps = graph.get(importer)?.imports.internal.get(file);
		if (!maps) continue;
		const outside = !importer.startsWith(`${packageDir}${sep}`);
		if (outside && directlyReferences(maps, id, isTypeName)) return true;
		const next: string[] = [];
		if (maps.reExport.has(head) || maps.reExport.has(importStar)) {
			next.push(id);
		}
		for (const alias of maps.reExportAs.get(head)?.keys() ?? []) {
			next.push([alias, ...rest].join("."));
		}
		for (const namespace of maps.reExportNs.keys()) {
			next.push(`${namespace}.${id}`);
		}
		for (const nextId of next) {
			if (
				isReferencedOutside(
					graph,
					packageDir,
					importer,
					nextId,
					isTypeName,
					seen,
				)
			) {
				return true;
			}
		}
	}
	return false;
}

/** The declaration that `id`, as `file` exports it, resolves to. */
function declarationOf(
	graph: ModuleGraph,
	file: string,
	id: string,
	seen = new Set<string>(),
): ExportItem | undefined {
	const key = `${file}\0${id}`;
	if (seen.has(key)) return undefined;
	seen.add(key);
	const node = graph.get(file);
	if (!node) return undefined;
	const own = node.exports.get(id);
	if (own && !own.isReExport) return own;
	return reExportedDeclaration(graph, node, id, seen) ?? own;
}

function reExportedDeclaration(
	graph: ModuleGraph,
	node: FileNode,
	id: string,
	seen: Set<string>,
): ExportItem | undefined {
	for (const [source, maps] of node.imports.internal) {
		if (maps.reExport.has(id))
			return declarationOf(graph, source, id, seen);
		for (const [original, aliases] of maps.reExportAs) {
			if (aliases.has(id)) {
				return declarationOf(graph, source, original, seen);
			}
		}
	}
	for (const [source, maps] of node.imports.internal) {
		if (
			maps.reExport.has(importStar) &&
			exportedNames(graph, source).has(id)
		) {
			return declarationOf(graph, source, id, seen);
		}
	}
	return undefined;
}

/** Every name `file` exports: declared, re-exported, or through `export *`. */
function exportedNames(
	graph: ModuleGraph,
	file: string,
	seen = new Set<string>(),
): Set<string> {
	const names = new Set<string>();
	if (seen.has(file)) return names;
	seen.add(file);
	const node = graph.get(file);
	if (!node) return names;
	for (const name of node.exports.keys()) names.add(name);
	for (const [source, maps] of node.imports.internal) {
		for (const name of maps.reExport.keys()) {
			if (name !== importStar) names.add(name);
		}
		for (const aliases of maps.reExportAs.values()) {
			for (const alias of aliases.keys()) names.add(alias);
		}
		for (const namespace of maps.reExportNs.keys()) names.add(namespace);
		if (maps.reExport.has(importStar)) {
			for (const name of exportedNames(graph, source, seen)) {
				if (name !== "default") names.add(name);
			}
		}
	}
	return names;
}

/**
 * Names that a package's public entry points export and that no file outside
 * the package references through them. A declaration tagged `@public` is
 * skipped, as knip skips it.
 */
export function unusedPublicExports(
	graph: ModuleGraph,
	packages: PublicPackage[],
	repositoryRoot: string,
): PublicSurfaceFinding[] {
	const findings: PublicSurfaceFinding[] = [];
	for (const { dir, entries } of packages) {
		for (const entry of entries) {
			for (const name of exportedNames(graph, entry)) {
				const declaration = declarationOf(graph, entry, name);
				if (declaration?.jsDocTags.has("@public")) continue;
				const isTypeName = typeKinds.has(declaration?.type ?? "");
				if (isReferencedOutside(graph, dir, entry, name, isTypeName)) {
					continue;
				}
				findings.push({
					file: relative(repositoryRoot, entry).split(sep).join("/"),
					type: isTypeName ? "types" : "exports",
					name,
				});
			}
		}
	}
	return findings;
}
