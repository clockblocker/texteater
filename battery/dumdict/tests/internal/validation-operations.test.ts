import { describe, expect, test } from "bun:test";
import { parseValidationArtifact } from "common-utils";
import { encodedDumdictValidationArtifacts } from "../../src/generated/validation-artifacts";
import {
	assertDumdictOperationSignature,
	createDumdictValidationOperations,
} from "../../src/parsing/validation-operations";

describe("lazy Dumdict validation operations", () => {
	test("constructs and freezes only the requested operation, then reuses it", () => {
		const operations = createDumdictValidationOperations();
		expect(Object.keys(operations)).toEqual([]);
		const name = "dumdict.transitive.overwrite.dumrelTrimString";
		const first = operations[name];
		expect(Object.keys(operations)).toEqual([name]);
		expect(Object.isFrozen(first)).toBe(true);
		expect(operations[name]).toBe(first);
		expect(Object.keys(operations)).toEqual([name]);
	});

	test("resolves every exact generated operation and fails closed for unknown names", () => {
		const operations = createDumdictValidationOperations();
		for (const name of encodedDumdictValidationArtifacts.requiredOperations) {
			const operation = operations[name];
			expect(typeof operation).toBe("function");
			expect(Object.isFrozen(operation)).toBe(true);
		}
		expect(Object.keys(operations).toSorted()).toEqual(
			[
				...encodedDumdictValidationArtifacts.requiredOperations,
			].toSorted(),
		);
		expect(() => Reflect.get(operations, "unknown.operation")).toThrow(
			"Missing Dumdict operation signature",
		);
	});

	test("makes normalization, identity, and contextual semantics observable", () => {
		const operations = createDumdictValidationOperations();
		expect(
			operations["dumdict.transitive.overwrite.dumrelTrimString"](
				"  value  ",
			),
		).toEqual({ value: "value" });
		expect(
			operations["dumdict.transitive.overwrite.normalizeNfc"](
				"cafe\u0301",
			),
		).toEqual({ value: "café" });
		const retained = ["one", "two"];
		expect(
			operations["dumdict.transitive.transform.retainAtLeastTwo"](
				retained,
			).value,
		).toBe(retained);
		expect(
			operations["dumdict.transitive.contextual.anonymous"]({
				canonicalForm: "bad",
				family: "Lexeme",
				kind: "NOT_A_KIND",
				language: "de",
			}).issues,
		).toEqual([
			{
				code: "custom",
				message:
					"de/Lexeme/NOT_A_KIND is not a supported Dumling Lemma route.",
				path: ["kind"],
			},
		]);
		expect(
			operations["dumdict.transitive.custom.hasDistinctPair"]([
				"Masc",
				"Masc",
			]).issues,
		).toHaveLength(1);
		expect(
			operations[
				"dumdict.transitive.custom.hasGermanVerbInflectionSignal"
			]({ number: null, tense: null, voice: null }).issues,
		).toHaveLength(1);
		expect(
			operations["dumdict.transitive.custom.hasMarkedInflectionFeature"]({
				case: null,
			}).issues,
		).toHaveLength(1);
		expect(
			operations["dumdict.transitive.custom.hasMarkedSurfaceFeature"]({
				historicalStatus: null,
			}).issues,
		).toHaveLength(1);
	});

	test("rejects missing, version-mismatched, and malformed signatures", () => {
		expect(() =>
			assertDumdictOperationSignature("missing", undefined),
		).toThrow("Missing Dumdict operation signature");
		expect(() =>
			assertDumdictOperationSignature("versioned", { version: 2 }),
		).toThrow("Unsupported Dumdict operation signature version");
		expect(() =>
			assertDumdictOperationSignature("malformed", {
				errorMessage: 42,
				version: 1,
			}),
		).toThrow("Invalid Dumdict operation signature");
		for (const discriminator of [
			null,
			{},
			{ key: "", options: ["ready"] },
			{ key: "kind", options: [] },
			{ key: "kind", options: ["ready", "ready"] },
			{ key: "kind", options: ["ready", 1] },
			{ branches: [], key: "kind", options: ["ready"] },
			{
				branches: [["unknown"], ["unknown"]],
				key: "kind",
				options: ["ready"],
			},
			{ branches: ["not-a-constraint"], key: "kind", options: ["ready"] },
		]) {
			expect(() =>
				assertDumdictOperationSignature("discriminator", {
					discriminator,
					version: 1,
				}),
			).toThrow("Invalid Dumdict operation signature");
		}
		expect(() =>
			assertDumdictOperationSignature("discriminator", {
				discriminator: { key: "kind", options: ["ready"] },
				errorMessage: "must not coexist",
				version: 1,
			}),
		).toThrow("Invalid Dumdict operation signature");
	});

	test("constructs exact generated discriminator selectors and caches their identity", () => {
		const name = encodedDumdictValidationArtifacts.requiredOperations.find(
			(candidate) =>
				"discriminator" in
				encodedDumdictValidationArtifacts.operationSignatures[
					candidate
				],
		);
		if (name === undefined)
			throw new Error("missing discriminator operation");
		const signature =
			encodedDumdictValidationArtifacts.operationSignatures[name];
		if (!("discriminator" in signature))
			throw new Error("missing discriminator signature");
		const { branches, key, options } = signature.discriminator;
		let selectedBranch: unknown;
		const operations = createDumdictValidationOperations(
			(branch, value) => {
				selectedBranch = branch;
				return { ...(value as object), normalized: true };
			},
		);
		const selector = operations[name];
		expect(selector({ [key]: options[0] })).toEqual({
			value: { [key]: options[0], normalized: true },
		});
		expect(selectedBranch).toBe(branches[0]);
		expect(selector({ [key]: "unknown" })).toEqual({
			issues: [
				{
					code: "invalid_union",
					discriminator: key,
					errors: [],
					message: `Invalid discriminator value. Expected ${options
						.map((option) => `'${option}'`)
						.join(" | ")}`,
					note: "No matching discriminator",
					options: [...options],
					path: [key],
				},
			],
			value: { [key]: "unknown" },
		});
		expect(selector(null)).toEqual({
			issues: [
				{
					code: "invalid_type",
					expected: "object",
					message: "Invalid input: expected object, received null",
					path: [],
				},
			],
			value: null,
		});
		expect(operations[name]).toBe(selector);
	});

	test("fails closed for recursive selectors and corrupt selected branch roots", () => {
		const name = encodedDumdictValidationArtifacts.requiredOperations.find(
			(candidate) =>
				"discriminator" in
				encodedDumdictValidationArtifacts.operationSignatures[
					candidate
				],
		);
		if (name === undefined)
			throw new Error("missing discriminator operation");
		const signature =
			encodedDumdictValidationArtifacts.operationSignatures[name];
		if (!("discriminator" in signature))
			throw new Error("missing discriminator signature");
		const input = {
			[signature.discriminator.key]: signature.discriminator.options[0],
		};
		let recursiveOperations: ReturnType<
			typeof createDumdictValidationOperations
		>;
		recursiveOperations = createDumdictValidationOperations(
			(_branch, value) => recursiveOperations[name](value),
		);
		expect(() => recursiveOperations[name](input)).toThrow(
			"Recursive Dumdict discriminator selection",
		);

		const corruptOperations = createDumdictValidationOperations(
			(_branch, value) =>
				parseValidationArtifact(
					{
						definitions: {},
						root: ["ref", "missing"],
						version: 1,
					},
					value,
					corruptOperations,
				),
		);
		expect(() => corruptOperations[name](input)).toThrow(
			"Unknown validation artifact reference",
		);
	});
});
