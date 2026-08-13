import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	developmentEvaluation,
	symbolGrammaticalResolutionAcceptanceExperiment,
	symbolGrammaticalResolutionExperiment,
	untouchedAcceptanceEvaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-symbol/evaluation-suite";
import { evaluateSymbolGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-symbol/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/symbol/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/symbol/prompt-source";
import {
	deSymbolModelCitationSurfaceSchema,
	deSymbolModelInflectionalFeaturesSchema,
	deSymbolModelInflectionSurfaceSchema,
	deSymbolModelLemmaSchema,
	inputSchema,
	outputSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/symbol/schemas";

const expectedDemoIds = [
	"grammar-de-sym-demo-percent-unit",
	"grammar-de-sym-demo-times-nominal",
	"grammar-de-sym-demo-euro-currency",
	"grammar-de-sym-demo-section-dative",
	"grammar-de-sym-demo-equals-genitive",
	"grammar-de-sym-demo-feminine-hash",
	"grammar-de-sym-demo-foreign-arabic-percent",
	"grammar-de-sym-demo-card-number-sign",
	"grammar-de-sym-demo-range-dash",
	"grammar-de-sym-demo-variant-fullwidth-plus",
	"grammar-de-sym-demo-typo-ocr-euro",
	"grammar-de-sym-demo-sections-plural",
] as const;

const expectedAcceptanceIds = [
	"grammar-de-sym-accept-v2-division-inflection",
	"grammar-de-sym-accept-v2-not-equal",
	"grammar-de-sym-accept-v2-sum",
	"grammar-de-sym-accept-v2-rupee",
	"grammar-de-sym-accept-v2-registered",
	"grammar-de-sym-accept-v2-double-arrow",
	"grammar-de-sym-accept-v2-basis-point",
	"grammar-de-sym-accept-v2-card-numero",
	"grammar-de-sym-accept-v2-range-tilde",
	"grammar-de-sym-accept-v2-foreign-japanese-reference",
	"grammar-de-sym-accept-v2-variant-small-percent",
	"grammar-de-sym-accept-v2-typo-double-permille",
] as const;

describe("Lexeme/SYM route-local migration", () => {
	test("uses exact input and the smallest total flat C|I DTO", () => {
		expect(
			inputSchema.parse({
				markedContext: "Die Rechnung enthält ein <TARGET>+</TARGET>.",
				members: ["+"],
			}),
		).toBeDefined();
		expect(() =>
			inputSchema.parse({
				markedContext: "Die Rechnung enthält ein <TARGET>+</TARGET>.",
				members: ["−"],
			}),
		).toThrow(/members must exactly match/);

		const citation = corpus.cases["grammar-de-sym-demo-percent-unit"];
		const inflection = corpus.cases["grammar-de-sym-demo-times-nominal"];
		if (citation === undefined || inflection === undefined) {
			throw new Error("Expected SYM fixtures.");
		}
		expect(outputSchema.parse(citation.idealOutput)).toEqual(
			citation.idealOutput,
		);
		expect(Object.keys(citation.idealOutput)).toEqual([
			"memberOrthographies",
			"normalizedMembers",
			"surface",
			"lemma",
		]);
		expect(
			outputSchema.safeParse({
				decision: "Resolved",
				resolution: citation.idealOutput,
			}).success,
		).toBe(false);
		expect(
			deSymbolModelCitationSurfaceSchema.safeParse(
				citation.idealOutput.surface,
			).success,
		).toBe(true);
		expect(
			deSymbolModelInflectionSurfaceSchema.safeParse(
				inflection.idealOutput.surface,
			).success,
		).toBe(true);
		expect(
			deSymbolModelInflectionalFeaturesSchema.safeParse({
				case: null,
				gender: null,
				number: null,
			}).success,
		).toBe(false);
		expect(() =>
			deSymbolModelLemmaSchema.parse({
				...citation.idealOutput.lemma,
				language: "de",
			}),
		).toThrow();
	});

	test("freezes 45 realistic cases into disjoint 12/21/12 partitions", () => {
		expect(corpus.all().ids).toHaveLength(45);
		expect(demonstrations.ids).toEqual(expectedDemoIds);
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
		).toHaveLength(45);
		expect(developmentEvaluation).toBe(
			symbolGrammaticalResolutionExperiment.evaluation,
		);
		expect(untouchedAcceptanceEvaluation).toBe(
			symbolGrammaticalResolutionAcceptanceExperiment.evaluation,
		);

		for (const testCase of corpus.all().cases) {
			const markedMembers = [
				...testCase.input.markedContext.matchAll(
					/<TARGET>([^<>]+)<\/TARGET>/gu,
				),
			].map((match) => match[1]);
			expect(markedMembers).toEqual(testCase.input.members);
			expect(testCase.idealOutput.memberOrthographies).toHaveLength(
				testCase.input.members.length,
			);
			expect(testCase.idealOutput.normalizedMembers).toHaveLength(
				testCase.input.members.length,
			);
			expect("decision" in testCase.idealOutput).toBe(false);
			expect("realizationCoverage" in testCase.idealOutput).toBe(false);
		}
	});

	test("covers codec fields, symbol domains, forms, and fixed neighbors", () => {
		const cases = corpus.all().cases;
		for (const numType of ["Card", "Range"] as const) {
			expect(
				cases.some(
					(testCase) =>
						testCase.idealOutput.lemma.coreFeatures.numType ===
						numType,
				),
			).toBe(true);
		}
		expect(
			cases.some(
				(testCase) =>
					testCase.idealOutput.lemma.coreFeatures.foreign === "Yes",
			),
		).toBe(true);
		for (const caseValue of ["Acc", "Dat", "Gen", "Nom"] as const) {
			expect(
				cases.some(
					(testCase) =>
						"inflectionalFeatures" in
							testCase.idealOutput.surface &&
						testCase.idealOutput.surface.inflectionalFeatures
							.case === caseValue,
				),
			).toBe(true);
		}
		expect(
			cases.some((testCase) =>
				testCase.idealOutput.memberOrthographies.includes("Typo"),
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
			"nicht anklickbaren Emoji",
			"Abs. 2",
			"47 <TARGET>%</TARGET>",
			"abschließenden Komma",
		]) {
			expect(
				cases.some((testCase) =>
					testCase.input.markedContext.includes(anchor),
				),
			).toBe(true);
		}
	});

	test("assembles fixed-route policy and scores exact diagnostics", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("already-classified German Lexeme/SYM");
		expect(prompt).toContain("Always return one total");
		expect(prompt).toContain("members: string[]");
		expect(prompt).toContain("NUM digits, sentence PUNCT");
		expect(prompt).toContain("numType is Card");
		expect(prompt).toContain("realizationCoverage Full");
		expect(prompt).toContain("<TARGET>٪</TARGET>");
		expect(prompt).not.toContain("<TARGET>÷</TARGET>");

		const testCase = corpus.cases["grammar-de-sym-dev-inflection-acc-plus"];
		if (testCase === undefined) throw new Error("Expected SYM fixture.");
		expect(
			evaluateSymbolGrammaticalResolution({
				caseId: "grammar-de-sym-dev-inflection-acc-plus",
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: testCase.idealOutput,
			}).contractPass,
		).toBe(true);

		const wrong = {
			...testCase.idealOutput,
			lemma: {
				...testCase.idealOutput.lemma,
				coreFeatures: { foreign: "Yes" as const, numType: null },
			},
		};
		const result = evaluateSymbolGrammaticalResolution({
			caseId: "grammar-de-sym-dev-inflection-acc-plus",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output: wrong,
		});
		expect(result.contractPass).toBe(false);
		expect(result.coreFeaturesPass).toBe(false);
		expect(result.memberOrthographiesPass).toBe(true);
	});
});
