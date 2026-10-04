import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	type FileNode,
	type ImportMaps,
	type ModuleGraph,
	publicEntryFiles,
	unusedPublicExports,
} from "../lib/knip-public-surface";

const root = "/repo";
const pkg = `${root}/battery/pkg`;
const entry = `${pkg}/src/index.ts`;
const declarations = `${pkg}/src/values.ts`;

function importMaps(maps: Partial<ImportMaps> = {}): ImportMaps {
	return {
		refs: new Set(),
		import: new Map(),
		importAs: new Map(),
		importNs: new Map(),
		reExport: new Map(),
		reExportAs: new Map(),
		reExportNs: new Map(),
		...maps,
	};
}

/** A graph from `importer → imported → maps`, with `importedBy` merged. */
function graphOf(
	edges: [string, string, ImportMaps][],
	exports: Record<string, Record<string, string | [string, string]>> = {},
): ModuleGraph {
	const graph: ModuleGraph = new Map();
	const node = (file: string): FileNode => {
		let found = graph.get(file);
		if (!found) {
			found = {
				imports: { internal: new Map() },
				exports: new Map(),
				importedBy: undefined,
			};
			graph.set(file, found);
		}
		return found;
	};
	for (const [file, items] of Object.entries(exports)) {
		for (const [name, item] of Object.entries(items)) {
			const [type, tag] = typeof item === "string" ? [item] : item;
			node(file).exports.set(name, {
				type,
				jsDocTags: new Set(tag ? [tag] : []),
				isReExport: false,
			});
		}
	}
	for (const [importer, imported, maps] of edges) {
		node(importer).imports.internal.set(imported, maps);
		const importedNode = node(imported);
		importedNode.importedBy ??= importMaps();
		const by = importedNode.importedBy;
		for (const key of [
			"import",
			"importNs",
			"reExport",
			"reExportNs",
		] as const) {
			for (const id of maps[key].keys()) {
				by[key].set(
					id,
					new Set([...(by[key].get(id) ?? []), importer]),
				);
			}
		}
		for (const key of ["importAs", "reExportAs"] as const) {
			for (const id of maps[key].keys()) {
				by[key].set(id, new Map([["alias", new Set([importer])]]));
			}
		}
	}
	return graph;
}

const reExportsAll = (...names: string[]) =>
	importMaps({
		reExport: new Map(names.map((name) => [name, new Set([entry])])),
	});
const names = (...ids: string[]) =>
	new Map(ids.map((id) => [id, new Set<string>()]));

const findings = (graph: ModuleGraph) =>
	unusedPublicExports(graph, [{ dir: pkg, entries: [entry] }], root).map(
		({ file, type, name }) => `${file}: ${type} ${name}`,
	);

test("the package's own files and tests don't keep a public export alive", () => {
	const graph = graphOf(
		[
			[entry, declarations, reExportsAll("used", "internal", "Shape")],
			[
				`${pkg}/src/other.ts`,
				declarations,
				importMaps({ import: names("internal") }),
			],
			[
				`${pkg}/tests/index.test.ts`,
				entry,
				importMaps({ import: names("internal", "Shape") }),
			],
			[
				`${root}/app/demo/main.ts`,
				entry,
				importMaps({ import: names("used") }),
			],
		],
		{
			[declarations]: {
				used: "function",
				internal: "const",
				Shape: "type",
			},
		},
	);

	expect(findings(graph)).toEqual([
		"battery/pkg/src/index.ts: exports internal",
		"battery/pkg/src/index.ts: types Shape",
	]);
});

test("namespace members count per name, and a whole namespace reads only values", () => {
	const graph = graphOf(
		[
			[entry, declarations, reExportsAll("value", "Member", "Unread")],
			[
				`${root}/app/demo/types.ts`,
				entry,
				importMaps({
					importNs: names("Pkg"),
					refs: new Set(["Pkg.Member"]),
				}),
			],
			[
				`${root}/tooling/pin.test.ts`,
				entry,
				importMaps({
					importNs: names("pkg"),
					import: names("__opaque"),
				}),
			],
		],
		{
			[declarations]: {
				value: "const",
				Member: "type",
				Unread: "interface",
			},
		},
	);

	expect(findings(graph)).toEqual(["battery/pkg/src/index.ts: types Unread"]);
});

test("re-exports outside the package are followed to their users", () => {
	const barrel = `${root}/battery/other/src/index.ts`;
	const graph = graphOf(
		[
			[entry, declarations, reExportsAll("relayed", "stranded")],
			[
				barrel,
				entry,
				importMaps({ reExport: names("relayed", "stranded") }),
			],
			[
				`${root}/app/demo/main.ts`,
				barrel,
				importMaps({ import: names("relayed") }),
			],
		],
		{ [declarations]: { relayed: "function", stranded: "function" } },
	);

	expect(findings(graph)).toEqual([
		"battery/pkg/src/index.ts: exports stranded",
	]);
});

test("a declaration tagged @public stays public without a caller", () => {
	const graph = graphOf(
		[[entry, declarations, reExportsAll("seam", "dead", "Dead")]],
		{
			[declarations]: {
				seam: ["function", "@public"],
				dead: "function",
				Dead: "interface",
			},
		},
	);
	// Knip records an entry's `export { … } from` lines with no declared type
	// or tags; they resolve to the declaration.
	for (const name of ["seam", "dead", "Dead"]) {
		graph.get(entry)?.exports.set(name, {
			type: "unknown",
			jsDocTags: new Set(),
			isReExport: true,
		});
	}

	expect(findings(graph)).toEqual([
		"battery/pkg/src/index.ts: exports dead",
		"battery/pkg/src/index.ts: types Dead",
	]);
});

test("public entries are the manifest's exports under the convex condition", () => {
	const dir = mkdtempSync(join(tmpdir(), "knip-public-surface-"));
	mkdirSync(join(dir, "src/schemas"), { recursive: true });
	for (const file of [
		"src/index.ts",
		"src/schemas/a.ts",
		"src/schemas/b.ts",
	]) {
		writeFileSync(join(dir, file), "");
	}

	expect(
		publicEntryFiles(dir, {
			exports: {
				".": {
					convex: "./src/index.ts",
					types: "./dist/index.d.ts",
					default: "./dist/index.js",
				},
				"./schema/*": { convex: "./src/schemas/*.ts" },
				"./styles.css": "./src/styles.css",
				"./package.json": "./package.json",
			},
		}),
	).toEqual([
		join(dir, "src/index.ts"),
		join(dir, "src/schemas/a.ts"),
		join(dir, "src/schemas/b.ts"),
	]);
});
