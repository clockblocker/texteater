import { expect, test } from "bun:test";
import { type LinkInput, linkRegistries } from "../src/compiler";
import {
	bindValidationRegistry,
	ParsingError,
	parseCompiledValidation,
	parseValidationArtifact,
} from "../src/runtime";

const fixture = (
	definitions: LinkInput["definitions"],
	root = "n",
	operationSignatures = {},
): LinkInput => ({
	version: 1,
	definitions,
	roots: { x: ["ref", root] },
	operationSignatures,
});
test("recursive rules and aliases share across owners without changing enum payloads", () => {
	const a = fixture({
		n: [
			"object",
			{
				tag: ["enum", ["ref", "missing"]],
				next: ["optional", ["ref", "n"]],
			},
			"strict",
		],
	});
	const b = fixture(
		{
			alias: ["ref", "other"],
			other: [
				"object",
				{
					tag: ["enum", ["ref", "missing"]],
					next: ["optional", ["ref", "alias"]],
				},
				"strict",
			],
		},
		"alias",
	);
	const [first, second] = linkRegistries([
		{ owner: "a", registry: a },
		{ owner: "b", registry: b },
	]);
	expect(second!.statistics.ownedDefinitions).toBe(0);
	const provider = bindValidationRegistry(first!.encoded, first!.fingerprint);
	const consumer = bindValidationRegistry(
		second!.encoded,
		second!.fingerprint,
		{ registry: provider, fingerprint: second!.requiredFingerprint! },
	);
	const input = { tag: "ref", next: { tag: "missing" } };
	expect(parseCompiledValidation<unknown>(consumer, "x", input)).toEqual(
		input,
	);
	expect(Object.isFrozen(provider)).toBe(true);
	expect(Object.isFrozen(provider.roots)).toBe(true);
	expect("definitions" in provider).toBe(false);
	expect(Reflect.set(provider, "fingerprint", "changed")).toBe(false);
	expect(Reflect.set(provider.roots, "x", false)).toBe(false);
	expect(() => parseCompiledValidation({ ...provider }, "x", input)).toThrow(
		"Unknown compiled validation provider",
	);
	expect(linkRegistries([{ owner: "a", registry: a }])[0]!.fingerprint).toBe(
		first!.fingerprint,
	);
});

test("incompatible providers, operations, protocols, dangling refs and unproductive cycles fail closed", () => {
	const a = fixture({ n: ["string"] }, "n", { normalize: { version: 1 } });
	const b = fixture({ n: ["string"] }, "n", { normalize: { version: 2 } });
	expect(() =>
		linkRegistries([
			{ owner: "a", registry: a },
			{ owner: "b", registry: b },
		]),
	).toThrow("Incompatible operation");
	expect(() =>
		linkRegistries([{ owner: "bad", registry: fixture({}) }]),
	).toThrow("Missing definition");
	expect(() =>
		linkRegistries([
			{ owner: "bad", registry: fixture({ n: ["ref", "n"] }) },
		]),
	).toThrow("Unproductive reference cycle");
	const first = linkRegistries([{ owner: "a", registry: a }])[0]!;
	const provider = bindValidationRegistry(first.encoded, first.fingerprint);
	expect(() =>
		bindValidationRegistry(first.encoded, "consumer", {
			registry: provider,
			fingerprint: "wrong",
		}),
	).toThrow("Incompatible compiled validation provider");
	expect(() => bindValidationRegistry('{"version":2}', "test")).toThrow(
		"Unsupported compiled validation protocol",
	);
});

test("linking preserves inline-versus-referenced string checks and exact diagnostic order", () => {
	const a = fixture({ n: ["pipe", ["string"], [["string", ["min", 1]]]] });
	const b = fixture({
		s: ["string"],
		n: ["pipe", ["ref", "s"], [["string", ["min", 1]]]],
	});
	const linked = linkRegistries([
		{ owner: "a", registry: a },
		{ owner: "b", registry: b },
	]);
	for (const [index, original] of [a, b].entries()) {
		const r = linked[index]!.runtime;
		const expected = parseValidationArtifact(
			{
				version: 1,
				root: original.roots.x!,
				definitions: original.definitions,
			},
			[],
		);
		const actual = parseValidationArtifact(
			{ version: 1, root: r.roots.x!, definitions: r.definitions },
			[],
		);
		expect(actual).toBeInstanceOf(ParsingError);
		expect(actual).toEqual(expected);
	}
	expect(linked[0]!.runtime.roots.x).not.toEqual(linked[1]!.runtime.roots.x);
	const ordered = fixture({
		n: ["object", { a: ["string"], b: ["number"] }, "strip"],
	});
	const reordered = fixture({
		n: ["object", { b: ["number"], a: ["string"] }, "strip"],
	});
	expect(
		linkRegistries([
			{ owner: "a", registry: ordered },
			{ owner: "b", registry: reordered },
		])[1]!.statistics.ownedDefinitions,
	).toBe(1);
});

test("runtime bundles for browser and isolate consumers without compiler or external imports", async () => {
	const result = await Bun.build({
		entrypoints: [new URL("../src/runtime.ts", import.meta.url).pathname],
		target: "browser",
	});
	expect(result.success).toBe(true);
	const source = await result.outputs[0]!.text();
	expect(new Bun.Transpiler({ loader: "js" }).scanImports(source)).toEqual(
		[],
	);
});
