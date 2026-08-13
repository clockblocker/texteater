import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	developmentEvaluation,
	particleGrammaticalResolutionAcceptanceExperiment,
	particleGrammaticalResolutionExperiment,
	untouchedAcceptanceEvaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-particle/evaluation-suite";
import { evaluateParticleGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-particle/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/particle/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/particle/prompt-source";
import {
	deParticleModelCitationSurfaceSchema,
	deParticleModelLemmaSchema,
	inputSchema,
	outputSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/particle/schemas";

const expectedDemonstrationIds = [
	"grammar-de-part-demo-negative-nicht",
	"grammar-de-part-demo-infinitival-zu",
	"grammar-de-part-demo-modal-halt",
	"grammar-de-part-demo-focus-sogar",
	"grammar-de-part-demo-typo-ebn",
	"grammar-de-part-demo-archaic-nit",
	"grammar-de-part-demo-distinct-archaic-ni",
	"grammar-de-part-demo-foreign-yes",
	"grammar-de-part-demo-abbreviation-aff",
] as const;

const expectedAcceptanceIds = [
	"grammar-de-part-accept-v2-negative-nicht",
	"grammar-de-part-accept-v2-infinitival-zu",
	"grammar-de-part-accept-v2-answer-doch",
	"grammar-de-part-accept-v2-foreign-never",
	"grammar-de-part-accept-v2-abbreviation-pos",
	"grammar-de-part-accept-v2-modal-bloss",
	"grammar-de-part-accept-v2-focus-lediglich",
	"grammar-de-part-accept-v2-intensifying-gar",
	"grammar-de-part-accept-v2-modal-ja-not-intj",
	"grammar-de-part-accept-v2-typo-nciht",
	"grammar-de-part-accept-v2-explicit-variant-nedd",
	"grammar-de-part-accept-v2-distinct-archaic-en",
] as const;

describe("Lexeme/PART route-local migration", () => {
	test("uses exact input and the smallest total flat codec-derived DTO", () => {
		expect(
			inputSchema.parse({
				markedContext: "Heute fährt er <TARGET>nicht</TARGET>.",
				members: ["nicht"],
			}),
		).toEqual({
			markedContext: "Heute fährt er <TARGET>nicht</TARGET>.",
			members: ["nicht"],
		});
		expect(() =>
			inputSchema.parse({
				markedContext: "Heute fährt er <TARGET>nicht</TARGET>.",
				members: ["heute"],
			}),
		).toThrow(/members must exactly match/);

		const fixture = corpus.cases["grammar-de-part-demo-negative-nicht"];
		if (fixture === undefined)
			throw new Error("Expected PART demonstration fixture.");
		const modelOutput = fixture.idealOutput;
		expect(outputSchema.parse(modelOutput)).toEqual(modelOutput);
		expect(Object.keys(modelOutput)).toEqual([
			"memberOrthographies",
			"normalizedMembers",
			"surface",
			"lemma",
		]);
		expect(
			outputSchema.safeParse({
				decision: "Resolved",
				resolution: modelOutput,
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				...modelOutput,
				realizationCoverage: "Full",
			}).success,
		).toBe(false);
		expect(() =>
			deParticleModelLemmaSchema.parse({
				...modelOutput.lemma,
				language: "de",
			}),
		).toThrow();
		expect(
			deParticleModelCitationSurfaceSchema.safeParse({
				...modelOutput.surface,
				surfaceKind: "Citation",
			}).success,
		).toBe(false);
	});

	test("freezes 42 realistic cases into disjoint 9/21/12 partitions", () => {
		expect(corpus.all().ids).toHaveLength(42);
		expect(demonstrations.ids).toEqual(expectedDemonstrationIds);
		expect(developmentEvaluation.ids).toHaveLength(21);
		expect(untouchedAcceptanceEvaluation.ids).toEqual(
			expectedAcceptanceIds,
		);
		expect(demonstrations.isDisjointFrom(developmentEvaluation)).toBe(true);
		expect(
			demonstrations.isDisjointFrom(untouchedAcceptanceEvaluation),
		).toBe(true);
		expect(
			developmentEvaluation.isDisjointFrom(untouchedAcceptanceEvaluation),
		).toBe(true);
		expect(
			demonstrations
				.union(developmentEvaluation)
				.union(untouchedAcceptanceEvaluation).ids,
		).toHaveLength(42);
		expect(developmentEvaluation).toBe(
			particleGrammaticalResolutionExperiment.evaluation,
		);
		expect(untouchedAcceptanceEvaluation).toBe(
			particleGrammaticalResolutionAcceptanceExperiment.evaluation,
		);

		for (const testCase of corpus.all().cases) {
			const markedMembers = [
				...testCase.input.markedContext.matchAll(
					/<TARGET>([^<>]+)<\/TARGET>/gu,
				),
			].map((match) => match[1]);
			expect(markedMembers).toEqual(testCase.input.members);
			expect(testCase.idealOutput.memberOrthographies).toHaveLength(1);
			expect(testCase.idealOutput.normalizedMembers).toHaveLength(1);
			expect("decision" in testCase.idealOutput).toBe(false);
			expect("realizationCoverage" in testCase.idealOutput).toBe(false);
			expect("surfaceKind" in testCase.idealOutput.surface).toBe(false);
		}
	});

	test("covers every codec feature, route distinction, and form policy", () => {
		const cases = corpus.all().cases;
		for (const key of [
			"abbr",
			"foreign",
			"partType",
			"polarity",
		] as const) {
			expect(
				cases.some(
					(testCase) =>
						testCase.idealOutput.lemma.coreFeatures[key] !== null,
				),
			).toBe(true);
		}
		for (const polarity of ["Neg", "Pos"] as const) {
			expect(
				cases.some(
					(testCase) =>
						testCase.idealOutput.lemma.coreFeatures.polarity ===
						polarity,
				),
			).toBe(true);
		}
		expect(
			cases.some(
				(testCase) =>
					testCase.idealOutput.memberOrthographies[0] === "Typo",
			),
		).toBe(true);
		expect(
			cases.some(
				(testCase) =>
					testCase.idealOutput.surface.spelling === "Variant",
			),
		).toBe(true);
		expect(
			cases.some(
				(testCase) =>
					testCase.idealOutput.surface.surfaceFeatures !== null,
			),
		).toBe(true);
		for (const anchor of [
			"not ADP membership",
			"not the later temporal ADV",
			"unmarked weil remains SCONJ",
			"not the clause-linking CCONJ",
			"separable VERB element",
		]) {
			expect(
				cases.some((testCase) =>
					testCase.explanation?.includes(anchor),
				),
			).toBe(true);
		}
	});

	test("assembles total fixed-route policy and scores exact diagnostics", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("already-classified German Lexeme/PART");
		expect(prompt).toContain("operation is total");
		expect(prompt).toContain("members: string[]");
		expect(prompt).toContain("fixed PART route remains authoritative");
		expect(prompt).toContain('partType: "Inf" | null');
		expect(prompt).toContain('polarity: "Neg" | "Pos" | null');
		expect(prompt).toContain("realizationCoverage Full");
		expect(prompt).toContain("<TARGET>ebn</TARGET>");
		expect(prompt).not.toContain("<TARGET>nihct</TARGET>");

		const testCase = corpus.cases["grammar-de-part-dev-foreign-not"];
		if (testCase === undefined)
			throw new Error("Expected PART scored fixture.");
		expect(
			evaluateParticleGrammaticalResolution({
				caseId: "grammar-de-part-dev-foreign-not",
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: testCase.idealOutput,
			}),
		).toEqual({
			contractPass: true,
			memberCountPass: true,
			memberOrthographiesPass: true,
			normalizedSurfacePass: true,
			spellingPass: true,
			surfaceFeaturesPass: true,
			canonicalFormPass: true,
			coreFeaturesPass: true,
		});
	});
});
