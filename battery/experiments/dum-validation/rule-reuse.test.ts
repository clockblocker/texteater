import { afterAll, expect, test } from "bun:test";
import { ParsingError, parseValidationArtifact } from "common-utils";
import { validationOperations } from "dumling/validation";
import { z } from "zod";
import { DUM_DIFFERENTIAL_TARGETS } from "../../../tooling/dum-runtime-verification/differential-targets";
import { encodedValidation } from "../../dumgen/src/generated/validation";
import { parse } from "../../dumgen/src/universal/validation";
import { loadRoutes } from "../../dumling/codegen/routes";
import { unitFixtures } from "../../dumling/tests/unit-fixtures";
import { proveReusableUnits, ruleSignature } from "./apply-rule-reuse";
import type { Registry } from "./split-registries";

const registry: Registry = JSON.parse(encodedValidation);
const operations = {
	...validationOperations,
	"dumrel.normalize-text": (value: unknown) => ({
		value: (value as string).trim().normalize("NFC"),
	}),
};
let comparisons = 0;
let failures = 0;
const reference = (name: string, input: unknown, output: boolean) => {
	const result = parseValidationArtifact(
		{
			version: 1,
			root: registry.roots[name]!,
			definitions: registry.definitions,
		},
		input,
		operations,
	);
	return result instanceof ParsingError
		? {
				failure: {
					message: result.message,
					tag: output ? "InvalidModelOutput" : "InvalidInput",
					stage: "experiment",
				},
			}
		: { value: result };
};
function actual(name: string, input: unknown, output: boolean) {
	try {
		return { value: parse(name, input, "experiment", output) };
	} catch (error) {
		if (!(error instanceof Error)) throw error;
		return {
			failure: {
				message: error.message,
				tag: Reflect.get(error, "_tag"),
				stage: Reflect.get(error, "stage"),
			},
		};
	}
}
function compare(name: string, input: unknown, output = false) {
	comparisons++;
	try {
		expect(actual(name, input, output)).toEqual(
			reference(name, input, output),
		);
	} catch (error) {
		failures++;
		throw error;
	}
}

test("actual Dumgen consumer preserves every canonical fixture, rejection, and error message", () => {
	for (const target of DUM_DIFFERENTIAL_TARGETS.filter((t) =>
		t.id.startsWith("dumgen:"),
	)) {
		const name = target.id.slice("dumgen:".length);
		for (const input of [
			...target.representativeValues,
			...target.propertyValues,
		]) {
			compare(name, input);
			compare(name, input, true);
		}
	}
});

test("all 99 linguistic routes preserve unit outputs, normalization, and malformed-input failures", async () => {
	for (const route of await loadRoutes()) {
		const fixtures = unitFixtures(route, z);
		for (const [name, kind] of [
			["lemmaSchema", "Lemma"],
			["readingSchema", "Reading"],
			["attestationSchema", "Attestation"],
		] as const) {
			const input = fixtures[kind];
			compare(name, input);
			compare(name, { ...input, unexpected: true });
			compare(name, { ...input, unitKind: "INVALID" }, true);
			if (kind === "Lemma")
				compare(name, { ...input, canonicalForm: "  Bank  " });
		}
	}
});

test("accessor inputs stay on the original path without extra value reads", () => {
	const base = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Bank",
		coreFeatures: { gender: "Fem", hyph: null },
	};
	let expectedReads = 0,
		actualReads = 0;
	const expectedInput = {
		...base,
		get canonicalForm() {
			expectedReads++;
			return "Bank";
		},
	};
	const actualInput = {
		...base,
		get canonicalForm() {
			actualReads++;
			return "Bank";
		},
	};
	expect(actual("lemmaSchema", actualInput, false)).toEqual(
		reference("lemmaSchema", expectedInput, false),
	);
	expect(actualReads).toBe(expectedReads);
});

test("structural proof ignores node names but rejects changed constraints and field order", () => {
	const a: Registry = {
		roots: { x: ["ref", "a"] },
		definitions: {
			a: ["object", { a: ["string"], b: ["number"] }, "strict"],
		},
	};
	const b: Registry = {
		roots: { x: ["ref", "b"] },
		definitions: { b: a.definitions.a! },
	};
	expect(ruleSignature(a, a.roots.x!)).toBe(ruleSignature(b, b.roots.x!));
	b.definitions.b = ["object", { b: ["number"], a: ["string"] }, "strict"];
	expect(ruleSignature(a, a.roots.x!)).not.toBe(ruleSignature(b, b.roots.x!));
	expect(() =>
		proveReusableUnits(
			{
				roots: { lemmaSchema: ["union", [["string"]]] },
				definitions: {},
			},
			{ roots: { "Lemma/de/Lexeme/NOUN": ["number"] }, definitions: {} },
		),
	).toThrow("No identical Dumling validator");
});

afterAll(async () => {
	if (process.env.DUM_RULE_REUSE_REPORT)
		await Bun.write(
			process.env.DUM_RULE_REUSE_REPORT,
			JSON.stringify(
				{ comparisons, failures, passed: failures === 0 },
				null,
				2,
			) + "\n",
		);
});
