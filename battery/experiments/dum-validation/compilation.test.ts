import { test, expect } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
	ParsingError,
	parseValidationArtifact,
	type Constraint,
	type ValidationOperations,
} from "../../common-utils/src/index";
import { validationOperations } from "../../dumling/src/validation/operations";
import { dumdictValidationOperations } from "../../dumdict/src/parsing/validation-operations";
import { DUM_DIFFERENTIAL_TARGETS } from "../../../tooling/dum-runtime-verification/differential-targets";
import { compareDifferentialTarget } from "../../../tooling/dum-runtime-verification/differential";
import { compileValidator, type Registry } from "./compile-validator";

const repository = resolve(import.meta.dir, "../../..");
const savedReference = join(
	repository,
	"battery/common-utils/src/__experiment_reference_validation.ts",
);
const reference = await readFile(
	(await Bun.file(savedReference).exists())
		? savedReference
		: join(repository, "battery/common-utils/src/validation-artifact.ts"),
	"utf8",
);
const referenceParse: typeof parseValidationArtifact = (await Bun.file(
	savedReference,
).exists())
	? (await import(savedReference)).parseValidationArtifact
	: parseValidationArtifact;
const normalize = (value: unknown) =>
	value instanceof ParsingError ? { issues: value.issues } : { value };
async function withCompiled(
	registry: Registry,
	work: (module: any, source: string) => Promise<void>,
) {
	const directory = await mkdtemp(join(tmpdir(), "dum-aot-test-"));
	try {
		const compiled = compileValidator(registry, reference);
		expect(compiled.source).not.toMatch(/\b(?:parseConstraint|eval)\(/);
		expect(compiled.source).not.toContain("new Function");
		expect(compileValidator(registry, reference).source).toBe(
			compiled.source,
		);
		const path = join(directory, "compiled.ts");
		await writeFile(
			path,
			compiled.source.replaceAll(
				'"common-utils"',
				JSON.stringify(
					join(repository, "battery/common-utils/src/index.ts"),
				),
			),
		);
		await work(await import(path), compiled.source);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}

test("generated functions preserve every canonical route, output and exact issue", async () => {
	const operations: ValidationOperations = {
		...validationOperations,
		"dumrel.normalize-text": (value) => ({
			value: (value as string).trim().normalize("NFC"),
		}),
	};
	let comparisons = 0;
	for (const name of ["dumling", "dumrel", "dumgen", "dumdict"]) {
		const path =
			name === "dumdict"
				? "src/generated/validation-artifacts.ts"
				: "src/generated/validation.ts";
		const module = await import(join(repository, "battery", name, path));
		const registry = JSON.parse(
			module.encodedValidation ??
				module.encodedDumdictValidationArtifacts,
		);
		await withCompiled(registry, async (compiled) => {
			for (const target of DUM_DIFFERENTIAL_TARGETS.filter((target) =>
				target.id.startsWith(name + ":"),
			)) {
				const key = target.id.slice(name.length + 1);
				const actual = compareDifferentialTarget({
					...target,
					lightweight: (input) =>
						compiled.parseCompiled(
							{
								version: 1,
								root: compiled.compiledRegistry.roots[key],
							},
							input,
							name === "dumdict"
								? dumdictValidationOperations
								: operations,
						),
				});
				expect(actual.mismatches, target.id).toEqual([]);
				comparisons +=
					actual.propertyValueCount + actual.representativeValueCount;
			}
		});
	}
	expect(comparisons).toBeGreaterThan(11000);
}, 60000);

test("generated recursion, records, effects, getters and ordered unions match the interpreter without replay", async () => {
	const roots: Record<string, Constraint> = {
		object: ["object", { a: ["optional", ["string"]] }, "strict"],
		passthrough: ["object", { a: ["string"] }, "passthrough"],
		array: [
			"array",
			[
				"nullable",
				["number", [["int"], ["min", 0, true], ["multiple", 2]]],
			],
			[
				["min", 1],
				["max", 2],
			],
		],
		tuple: ["tuple", [["string"]], ["number"]],
		fixedTuple: ["tuple", [["string"], ["boolean"]]],
		record: ["record", ["enum", ["a", "b"]], ["string"]],
		partial: ["partial-record", ["string", [["min", 2]]], ["number"]],
		recursive: ["ref", "list"],
		union: [
			"union",
			[
				["pipe", ["string"], [["operation", "reject"]]],
				["preprocess", "normalize", ["string"]],
				["unknown"],
			],
		],
		string: [
			"pipe",
			["string", [["length", 2]]],
			[
				["regex", "^a", "g"],
				["string", ["min", 3]],
			],
		],
		arrayEffect: [
			"pipe",
			["array", ["null"], []],
			[["array", ["length", 2]]],
		],
		numberEffect: ["pipe", ["number"], [["number", ["max", 1, false]]]],
		special: [
			"union",
			[
				["literal", -0],
				["enum", [NaN, Infinity]],
			],
		],
	};
	const registry: Registry = {
		version: 1,
		roots,
		definitions: {
			list: [
				"nullable",
				[
					"object",
					{ value: ["string"], next: ["ref", "list"] },
					"strip",
				],
			],
		},
	};
	await withCompiled(registry, async (compiled) => {
		const inputs = [
			undefined,
			null,
			true,
			NaN,
			Infinity,
			-0,
			0,
			1,
			2,
			"a",
			"aa",
			"abc",
			[],
			["a", 1, 2],
			[null, null, null],
			{},
			{ a: "x", b: 3 },
			{ value: "a", next: { value: "b", next: null } },
			Object.create({ a: "x" }),
			{ length: 2 },
		];
		for (const [key, root] of Object.entries(roots))
			for (const input of inputs) {
				const logs: string[][] = [[], []];
				const operations = (index: number): ValidationOperations => ({
					reject: (value) => {
						logs[index]!.push("reject");
						return {
							value,
							issues: [
								{
									code: "custom",
									path: [],
									message: "rejected",
								},
							],
						};
					},
					normalize: (value) => {
						logs[index]!.push("normalize");
						return {
							value:
								typeof value === "string"
									? value.trim()
									: value,
						};
					},
				});
				const expected = normalize(
					referenceParse(
						{ version: 1, root, definitions: registry.definitions },
						input,
						operations(0),
					),
				);
				const actual = normalize(
					compiled.parseCompiled(
						{
							version: 1,
							root: compiled.compiledRegistry.roots[key],
						},
						input,
						operations(1),
					),
				);
				expect(isDeepStrictEqual(actual, expected), key).toBe(true);
				expect(logs[1], key).toEqual(logs[0]);
			}
		const readCounts = [0, 0];
		for (const index of [0, 1]) {
			const input = {
				get a() {
					readCounts[index]++;
					return "x";
				},
			};
			if (index === 0)
				referenceParse({ version: 1, root: roots.object! }, input);
			else
				compiled.parseCompiled(
					{
						version: 1,
						root: compiled.compiledRegistry.roots.object,
					},
					input,
				);
		}
		expect(readCounts[1]).toBe(readCounts[0]);
	});
});

test("compiler rejects missing references instead of silently weakening validation", () => {
	expect(() =>
		compileValidator(
			{
				version: 1,
				roots: { test: ["ref", "missing"] },
				definitions: {},
			},
			reference,
		),
	).toThrow("Missing definition");
});
