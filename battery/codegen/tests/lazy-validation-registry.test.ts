import { expect, test } from "bun:test";
import { parseValidationArtifact } from "common-utils";
import { build } from "esbuild";
import {
	emitLazyValidationRegistry,
	type Registry,
	splitRegistry,
} from "../src/lazy-validation-registry";

const fixture: Registry = {
	roots: { first: ["ref", "a"], second: ["ref", "b"] },
	definitions: {
		a: ["object", { value: ["ref", "shared"] }, "strict"],
		b: ["array", ["ref", "shared"], []],
		shared: ["string", [["min", 2]]],
	},
};
let sequence = 0;
async function materialize(registry: Registry = fixture) {
	const generated = emitLazyValidationRegistry(registry, (name) => name);
	const js = new Bun.Transpiler({ loader: "ts" }).transformSync(
		generated.source,
	);
	return import(
		`data:text/javascript;base64,${Buffer.from(`${js}\n// instance ${sequence++}`).toString("base64")}`
	);
}

test("lookup availability does not decode; first operation loads only its group", async () => {
	const { validationRegistry: registry, validationRegistryState: state } =
		await materialize();
	expect(Object.keys(registry.roots)).toEqual(["first", "second"]);
	expect(Object.hasOwn(registry.roots, "first")).toBe(true);
	expect(registry.roots.missing).toBeUndefined();
	expect(state()).toMatchObject({
		groups: [],
		sharedLoaded: false,
		decodedBytes: 0,
	});
	expect(registry.roots.first).toEqual(["ref", "a"]);
	expect(state()).toMatchObject({
		groups: ["first"],
		sharedLoaded: true,
		definitions: 2,
	});
	const shared = registry.definitions.shared;
	const firstBytes = state().decodedBytes;
	void registry.roots.first;
	expect(state().decodedBytes).toBe(firstBytes);
	void registry.roots.second;
	expect(registry.definitions.shared).toBe(shared);
	expect(state()).toMatchObject({
		groups: ["first", "second"],
		definitions: 3,
	});
});

test("valid output and nested errors match the original artifact in either load order", async () => {
	for (const order of [
		["first", "second"],
		["second", "first"],
	]) {
		const { validationRegistry: registry } = await materialize();
		for (const name of order) {
			for (const input of [
				{ value: "abc" },
				{ value: "" },
				["abc"],
				[1],
				null,
				{ value: "abc", extra: 1 },
			]) {
				const root = registry.roots[name];
				const originalRoot = fixture.roots[name];
				if (!originalRoot) throw new Error("Missing fixture root");
				expect(
					parseValidationArtifact(
						{ version: 1, root, definitions: registry.definitions },
						input,
					),
				).toEqual(
					parseValidationArtifact(
						{
							version: 1,
							root: originalRoot,
							definitions: fixture.definitions,
						},
						input,
					),
				);
			}
		}
	}
});

test("shared recursive dependencies are decoded once and remain closed", async () => {
	const recursive: Registry = {
		roots: {
			first: ["ref", "node"],
			second: ["array", ["ref", "node"], []],
		},
		definitions: {
			node: ["object", { next: ["optional", ["ref", "node"]] }, "strict"],
		},
	};
	const { validationRegistry: registry } = await materialize(recursive);
	const root = registry.roots.first;
	expect(
		parseValidationArtifact<unknown>(
			{ version: 1, root, definitions: registry.definitions },
			{ next: {} },
		),
	).toEqual({ next: {} });
	expect(
		splitRegistry(recursive, (name) => name).sharedDefinitions,
	).toHaveProperty("node");
});

test("dangling dependencies fail generation rather than weaken validation", () => {
	expect(() =>
		splitRegistry(
			{ roots: { broken: ["ref", "missing"] }, definitions: {} },
			(name) => name,
		),
	).toThrow("Missing definition missing");
});

test("shared buckets exclude definitions used only by unrelated operations", async () => {
	const registry: Registry = {
		roots: {
			first: ["ref", "a"],
			second: ["ref", "b"],
			combined: [
				"tuple",
				[
					["ref", "a"],
					["ref", "b"],
				],
			],
		},
		definitions: { a: ["string"], b: ["number"] },
	};
	const { validationRegistry: lazy, validationRegistryState: state } =
		await materialize(registry);
	void lazy.roots.first;
	expect(state().definitions).toBe(1);
	expect(lazy.definitions.b).toBeUndefined();
	void lazy.roots.combined;
	expect(state().definitions).toBe(2);
	expect(lazy.definitions.b).toEqual(["number"]);
});

test("consumers of unrelated exports can remove the registry from their bundle", async () => {
	const generated = emitLazyValidationRegistry(
		fixture,
		(name) => name,
	).source;
	const result = await build({
		stdin: {
			contents:
				'import {value} from "virtual:registry"; console.log(value);',
			loader: "ts",
		},
		bundle: true,
		write: false,
		platform: "browser",
		format: "esm",
		plugins: [
			{
				name: "operation-registry-fixture",
				setup(api) {
					api.onResolve({ filter: /^virtual:registry$/ }, () => ({
						path: "registry",
						namespace: "fixture",
					}));
					api.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
						contents: `${generated}\nexport const value = "synonym";`,
						loader: "ts",
					}));
				},
			},
		],
	});
	expect(result.outputFiles[0]?.text).not.toContain("JSON.parse");
	expect(result.outputFiles[0]?.text).not.toContain("encodedGroups");
});
