import { describe, expect, test } from "bun:test";
import { encodedDumgenValidationArtifacts } from "../../src/generated/validation-artifacts";
import { decodeDumgenValidationArtifact } from "../../src/parsing/lightweight-parsers";
import {
	assertDumgenOperationSignature,
	createDumgenValidationOperations,
} from "../../src/parsing/validation-operations";

describe("lazy Dumgen validation operations", () => {
	test("constructs only requested operations and caches frozen identity", () => {
		const operations = createDumgenValidationOperations();
		expect(Object.keys(operations)).toEqual([]);
		const name = "dumgen.transitive.overwrite.dumrelTrimString";
		const first = operations[name];
		expect(Object.keys(operations)).toEqual([name]);
		expect(Object.isFrozen(first)).toBe(true);
		expect(operations[name]).toBe(first);
	});

	test("resolves the exact generated inventory and fails closed", () => {
		expect(
			decodeDumgenValidationArtifact("parseAsSegmentedSentenceId")
				.version,
		).toBe(encodedDumgenValidationArtifacts.version);
		const operations = createDumgenValidationOperations();
		for (const name of encodedDumgenValidationArtifacts.requiredOperations) {
			const operation = operations[name];
			expect(typeof operation).toBe("function");
			expect(Object.isFrozen(operation)).toBe(true);
		}
		expect(Object.keys(operations).toSorted()).toEqual(
			[...encodedDumgenValidationArtifacts.requiredOperations].toSorted(),
		);
		expect(() => Reflect.get(operations, "unknown.operation")).toThrow(
			"Missing Dumgen operation signature",
		);
	});

	test("executes every exact generated operation with a semantic witness", () => {
		const operations = createDumgenValidationOperations();
		const executed: string[] = [];
		for (const name of encodedDumgenValidationArtifacts.requiredOperations) {
			const witness = operationWitness(name);
			const result = operations[name](witness);
			expect(result).toBeObject();
			expect("value" in result).toBe(true);
			expectOperationMutationKilled(name, witness, result);
			executed.push(name);
		}
		expect(executed).toEqual([
			...encodedDumgenValidationArtifacts.requiredOperations,
		]);
	});

	test("makes normalization, freezing, and contextual paths observable", () => {
		const operations = createDumgenValidationOperations();
		expect(
			operations["dumgen.transitive.overwrite.dumrelTrimString"](
				"  value  ",
			),
		).toEqual({ value: "value" });
		expect(
			operations["dumgen.transitive.overwrite.normalizeNfc"](
				"cafe\u0301",
			),
		).toEqual({ value: "café" });
		const shallow = { nested: {} };
		expect(operations["dumgen.readonly.1"](shallow).value).toBe(shallow);
		expect(Object.isFrozen(shallow)).toBe(true);
		expect(Object.isFrozen(shallow.nested)).toBe(false);
		const knowledge = { changes: [], pendingRelations: [] };
		expect(
			operations["dumgen.finalize-knowledge-result"](knowledge).value,
		).toBe(knowledge);
		expect(Object.isFrozen(knowledge.changes)).toBe(true);
		expect(
			operations["dumgen.knowledge-reading.de"]({
				lemma: { language: "en" },
			}).issues,
		).toEqual([
			{
				code: "custom",
				message: "Knowledge generation requires a German Reading.",
				path: ["lemma", "language"],
			},
		]);
	});

	test("rejects absent, version-mismatched, and malformed signatures", () => {
		expect(() =>
			assertDumgenOperationSignature("missing", undefined),
		).toThrow("Missing Dumgen operation signature");
		expect(() =>
			assertDumgenOperationSignature("versioned", { version: 2 }),
		).toThrow("Invalid Dumgen operation signature");
		expect(() =>
			assertDumgenOperationSignature("malformed", {
				errorMessage: 42,
				version: 1,
			}),
		).toThrow("Invalid Dumgen operation signature");
		expect(() =>
			assertDumgenOperationSignature("unsupported", {
				discriminator: {},
				version: 1,
			}),
		).toThrow("Invalid Dumgen operation signature");
	});
});

function operationWitness(name: string): unknown {
	if (name.startsWith("dumgen.readonly.")) return { nested: {} };
	if (name.includes("overwrite.")) return "  cafe\u0301  ";
	if (name.includes("normalizeLemmaCanonicalForm"))
		return { canonicalForm: "  cafe\u0301  " };
	if (name.includes("normalizeReadingLemma"))
		return { canonicalForm: "  cafe\u0301  " };
	if (name.includes("isCompactEmojiSequence")) return "not emoji";
	if (name.includes("hasDistinctPair")) return ["same", "same"];
	if (name.includes("hasGermanVerbInflectionSignal"))
		return { number: null, tense: null, voice: null };
	if (
		name.includes("hasMarkedInflectionFeature") ||
		name.includes("hasMarkedSurfaceFeature")
	)
		return {};
	if (name.includes("isMorphemeReading"))
		return { lemma: { family: "Lexeme" } };
	if (name.includes("isLexemeUnitShadow")) return { family: "Phraseme" };
	if (name.includes("isLexicalUnitShadow")) return { family: "Construction" };
	if (name.includes("supported-route"))
		return { language: "de", family: "Unknown", kind: "Unknown" };
	if (name === "dumgen.knowledge-reading.de")
		return { lemma: { language: "en" } };
	if (name === "dumgen.knowledge-lemma.de") return { language: "en" };
	if (name === "dumgen.catalog-miss.lemma-route-correlation")
		return {
			route: { family: "Lexeme", kind: "VERB" },
			candidate: { family: "Lexeme", kind: "NOUN" },
		};
	if (name === "dumgen.catalog-miss.reading-knowledge-route-correlation")
		return {
			route: { family: "Lexeme", kind: "VERB" },
			reading: { lemma: { family: "Lexeme", kind: "NOUN" } },
		};
	if (name === "dumgen.relation-target.de") return { language: "en" };
	if (name === "dumgen.segment.whitespace")
		return { kind: "Whitespace", text: "  " };
	if (
		name === "dumgen.translation-request.english" ||
		name === "dumgen.semantic-relation-request.non-empty"
	)
		return {};
	if (name === "dumgen.grammatical-input.clicked-resolvable")
		return {
			clickedSegmentIndex: 0,
			sentence: { segments: [{ kind: "OpaqueText" }] },
		};
	if (name === "dumgen.grammatical-interaction.membership")
		return { clickedSegmentIndex: 0, memberSegmentIndices: [1] };
	if (name === "dumgen.knowledge-result.base-only")
		return {
			changes: [{ aspect: "definition", kind: "Retract" }],
		};
	if (name === "dumgen.finalize-knowledge-result")
		return { changes: [], pendingRelations: [] };
	return {};
}

function expectOperationMutationKilled(
	name: string,
	witness: unknown,
	result: Readonly<{ issues?: readonly unknown[]; value: unknown }>,
): void {
	if (name.startsWith("dumgen.readonly.")) {
		expect(result.value, name).toBe(witness);
		expect(Object.isFrozen(result.value), name).toBe(true);
		expect(
			Object.isFrozen((result.value as { nested: object }).nested),
			name,
		).toBe(false);
		return;
	}
	if (name === "dumgen.finalize-knowledge-result") {
		expect(Object.isFrozen(result.value), name).toBe(true);
		expect(
			Object.isFrozen(
				(result.value as { changes: readonly unknown[] }).changes,
			),
			name,
		).toBe(true);
		return;
	}
	if (name.includes("overwrite.")) {
		expect(result.value, name).not.toBe(witness);
		return;
	}
	if (
		name.includes("normalizeLemmaCanonicalForm") ||
		name.includes("normalizeReadingLemma")
	) {
		expect(result.value, name).toEqual({ canonicalForm: "café" });
		return;
	}
	if (
		name.includes(".custom.") ||
		name.includes("supported-route") ||
		name.startsWith("dumgen.catalog-miss.") ||
		name === "dumgen.knowledge-reading.de" ||
		name === "dumgen.knowledge-lemma.de" ||
		name === "dumgen.relation-target.de" ||
		name === "dumgen.segment.whitespace" ||
		name === "dumgen.translation-request.english" ||
		name === "dumgen.semantic-relation-request.non-empty" ||
		name === "dumgen.grammatical-input.clicked-resolvable" ||
		name === "dumgen.grammatical-interaction.membership" ||
		name === "dumgen.knowledge-result.base-only"
	) {
		expect(result.issues?.length, name).toBeGreaterThan(0);
		return;
	}
	if (name.includes("transform.") || name.startsWith("dumgen.bind-")) {
		expect(result.value, name).toBe(witness);
		return;
	}
	throw new Error(`Missing observable public operation witness: ${name}.`);
}
