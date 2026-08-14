import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	developmentEvaluation,
	numeralGrammaticalResolutionAcceptanceExperiment,
	numeralGrammaticalResolutionExperiment,
	untouchedAcceptanceEvaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-numeral/evaluation-suite";
import { evaluateNumeralGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-numeral/evaluator";
import { corpus } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/numeral/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/numeral/prompt-source";
import {
	inputSchema,
	modelCitationSurfaceSchema,
	modelInflectionalFeaturesSchema,
	modelInflectionSurfaceSchema,
	modelLemmaSchema,
	outputSchema,
} from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/numeral/schemas";

const expectedDemonstrationIds = [
	"grammar-de-num-demo-word-vier",
	"grammar-de-num-demo-digit-7",
	"grammar-de-num-demo-fraction-eineinhalb",
	"grammar-de-num-demo-range-zehn-bis-zwoelf",
	"grammar-de-num-demo-inflected-millionen",
	"grammar-de-num-demo-initial-inflected-trillionen",
	"grammar-de-num-demo-typo-dreii",
] as const;

const expectedDevelopmentIds = [
	"grammar-de-num-dev-initial-fuenf",
	"grammar-de-num-dev-decimal-drei-komma-vierzehn",
	"grammar-de-num-dev-year-2024",
	"grammar-de-num-dev-roman-xiv",
	"grammar-de-num-dev-abbreviation-t",
	"grammar-de-num-dev-foreign-three",
	"grammar-de-num-dev-distributive-zwei",
	"grammar-de-num-dev-collective-zwei",
	"grammar-de-num-dev-multi-member-ein-komma-fuenf",
	"grammar-de-num-dev-multiplicative-dreifach",
	"grammar-de-num-dev-inflected-million-acc",
	"grammar-de-num-dev-inflected-millionen-gen",
	"grammar-de-num-dev-archaic-zween",
	"grammar-de-num-dev-variant-zwo",
	"grammar-de-num-dev-route-adj-drei",
	"grammar-de-num-dev-route-det-zwei",
	"grammar-de-num-dev-route-pron-drei",
	"grammar-de-num-dev-route-noun-eins",
	"grammar-de-num-dev-route-symbol-7",
] as const;

const expectedAcceptanceIds = [
	"grammar-de-num-accept-v3-word-dreizehn",
	"grammar-de-num-accept-v3-digit-73",
	"grammar-de-num-accept-v3-decimal-sieben-komma-acht",
	"grammar-de-num-accept-v3-year-1987",
	"grammar-de-num-accept-v3-roman-xix",
	"grammar-de-num-accept-v3-multi-member-vier-komma-neun",
	"grammar-de-num-accept-v3-fraction-siebenachtel",
	"grammar-de-num-accept-v3-multiplicative-sechsfach",
	"grammar-de-num-accept-v3-range-zwoelf-bis-sechzehn",
	"grammar-de-num-accept-v3-inflected-quadrillionen-nom",
	"grammar-de-num-accept-v3-typo-neunzhen",
	"grammar-de-num-accept-v3-archaic-fuenff",
] as const;

describe("Lexeme/NUM route-local schemas and corpus", () => {
	test("uses canonical input and a total flat NUM codec DTO", () => {
		expect(
			inputSchema.parse({
				markedContext: "Wir brauchen <TARGET>drei</TARGET> Kabel.",
				members: ["drei"],
			}),
		).toEqual({
			markedContext: "Wir brauchen <TARGET>drei</TARGET> Kabel.",
			members: ["drei"],
		});
		expect(() =>
			inputSchema.parse({
				markedContext: "Wir brauchen <TARGET>drei</TARGET> Kabel.",
				members: ["vier"],
			}),
		).toThrow(/members must exactly match/);

		const modelOutput = outputSchema.parse({
			memberOrthographies: ["Standard"],
			normalizedMembers: ["Millionen"],
			surface: {
				spelling: "Canonical",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				inflectionalFeatures: {
					case: "Dat",
					gender: "Fem",
					number: "Plur",
				},
			},
			lemma: {
				canonicalForm: "Million",
				coreFeatures: {
					abbr: null,
					foreign: null,
					numType: "Card",
				},
			},
		});
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
			modelLemmaSchema.parse({ ...modelOutput.lemma, language: "de" }),
		).toThrow();
		expect(
			modelCitationSurfaceSchema.safeParse({
				spelling: "Canonical",
				surfaceKind: "Citation",
				surfaceFeatures: null,
			}).success,
		).toBe(true);
		expect(
			modelInflectionSurfaceSchema.safeParse(modelOutput.surface).success,
		).toBe(true);
	});

	test("preserves every structural branch of the NUM inflection codec", () => {
		for (const features of [
			{ case: "Acc", gender: null, number: null },
			{ case: null, gender: "Neut", number: null },
			{ case: null, gender: null, number: "Sing" },
		] as const) {
			expect(
				modelInflectionalFeaturesSchema.safeParse(features).success,
			).toBe(true);
		}
		expect(
			modelInflectionalFeaturesSchema.safeParse({
				case: null,
				gender: null,
				number: null,
			}).success,
		).toBe(false);
		for (const value of ["Acc", "Dat", "Gen", "Nom"] as const) {
			expect(
				modelInflectionalFeaturesSchema.safeParse({
					case: value,
					gender: null,
					number: null,
				}).success,
			).toBe(true);
		}
		for (const value of ["Fem", "Masc", "Neut"] as const) {
			expect(
				modelInflectionalFeaturesSchema.safeParse({
					case: null,
					gender: value,
					number: null,
				}).success,
			).toBe(true);
		}
	});

	test("freezes 38 cases into disjoint grammatical partitions", () => {
		expect(corpus.all().ids).toHaveLength(38);
		expect(demonstrations.ids).toEqual(expectedDemonstrationIds);
		expect(developmentEvaluation.ids).toEqual(expectedDevelopmentIds);
		expect(untouchedAcceptanceEvaluation.ids).toEqual(
			expectedAcceptanceIds,
		);
		expect(demonstrations.ids).toHaveLength(7);
		expect(developmentEvaluation.ids).toHaveLength(19);
		expect(untouchedAcceptanceEvaluation.ids).toHaveLength(12);
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
		).toHaveLength(38);
		expect(developmentEvaluation).toBe(
			numeralGrammaticalResolutionExperiment.evaluation,
		);
		expect(untouchedAcceptanceEvaluation).toBe(
			numeralGrammaticalResolutionAcceptanceExperiment.evaluation,
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

	test("covers every NUM Core and Surface feature family", () => {
		const cases = corpus.all().cases;
		const coreFeatures = cases.map(
			(testCase) => testCase.idealOutput.lemma.coreFeatures,
		);
		for (const numType of ["Card", "Frac", "Mult", "Range"] as const) {
			expect(
				coreFeatures.some((features) => features.numType === numType),
			).toBe(true);
		}
		expect(coreFeatures.some((features) => features.abbr === "Yes")).toBe(
			true,
		);
		expect(
			coreFeatures.some((features) => features.foreign === "Yes"),
		).toBe(true);

		const inflectional = cases.flatMap((testCase) =>
			testCase.idealOutput.surface.surfaceKind === "Inflection"
				? [testCase.idealOutput.surface.inflectionalFeatures]
				: [],
		);
		for (const caseValue of ["Acc", "Dat", "Gen", "Nom"] as const) {
			expect(
				inflectional.some((features) => features.case === caseValue),
			).toBe(true);
		}
		expect(
			inflectional.some((features) => features.gender === "Masc"),
		).toBe(true);
		expect(
			inflectional.some((features) => features.number === "Sing"),
		).toBe(true);
		expect(
			cases.some(
				(testCase) =>
					testCase.idealOutput.surface.surfaceKind === "Citation",
			),
		).toBe(true);
		expect(
			cases.filter((testCase) =>
				testCase.idealOutput.memberOrthographies.includes("Typo"),
			),
		).toHaveLength(2);
		expect(
			cases.filter(
				(testCase) =>
					testCase.idealOutput.surface.spelling === "Variant",
			),
		).toHaveLength(4);
		expect(
			cases.filter(
				(testCase) =>
					testCase.idealOutput.surface.surfaceFeatures !== null,
			),
		).toHaveLength(2);
	});

	test("keeps all neighboring-route contrasts total and fixed upstream", () => {
		for (const caseId of [
			"grammar-de-num-dev-route-adj-drei",
			"grammar-de-num-dev-route-det-zwei",
			"grammar-de-num-dev-route-pron-drei",
			"grammar-de-num-dev-route-noun-eins",
			"grammar-de-num-dev-route-symbol-7",
		] as const) {
			const [testCase] = corpus.select([caseId]).cases;
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			expect(outputSchema.safeParse(testCase.idealOutput).success).toBe(
				true,
			);
			expect("decision" in testCase.idealOutput).toBe(false);
		}
	});

	test("assembles only total NUM instructions and demonstrations", () => {
		const prompt = assembleSystemPrompt(promptSource);

		expect(prompt).toContain("already-classified German Lexeme/NUM");
		expect(prompt).toContain("operation is total");
		expect(prompt).toContain('"Card" | "Frac" | "Mult" | "Range"');
		expect(prompt).toContain("does not expose Dist, Sets");
		expect(prompt).toContain("<TARGET>vier</TARGET>");
		expect(prompt).toContain("<TARGET>eineinhalb</TARGET>");
		expect(prompt).toContain("<TARGET>Millionen</TARGET>");
		expect(prompt).not.toContain("<TARGET>vierzehn</TARGET>");
		expect(prompt).not.toContain("<TARGET>drey</TARGET>");
	});
});

describe("Lexeme/NUM pure diagnostic evaluator", () => {
	test("passes every frozen development and acceptance ideal output", () => {
		for (const experiment of [
			numeralGrammaticalResolutionExperiment,
			numeralGrammaticalResolutionAcceptanceExperiment,
		]) {
			for (const [index, caseId] of experiment.evaluation.ids.entries()) {
				const testCase = experiment.evaluation.cases[index];
				if (testCase === undefined)
					throw new Error(`Missing ${caseId}.`);
				const result = experiment.evaluator({
					caseId,
					input: testCase.input,
					idealOutput: testCase.idealOutput,
					output: testCase.idealOutput,
				});
				expect(result.contractPass).toBe(true);
				expect(Object.values(result).every(Boolean)).toBe(true);
			}
		}
	});

	test("reports agreement misses independently", () => {
		const testCase =
			corpus.cases["grammar-de-num-dev-inflected-million-acc"];
		if (testCase === undefined) throw new Error("Missing inflection case.");
		if (testCase.idealOutput.surface.surfaceKind !== "Inflection") {
			throw new Error("Expected NUM Inflection.");
		}
		const result = evaluateNumeralGrammaticalResolution({
			caseId: "grammar-de-num-dev-inflected-million-acc",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output: {
				...testCase.idealOutput,
				surface: {
					...testCase.idealOutput.surface,
					inflectionalFeatures: {
						...testCase.idealOutput.surface.inflectionalFeatures,
						case: "Dat",
					},
				},
			},
		});

		expect(result.contractPass).toBe(false);
		expect(result.inflectionalFeaturesPass).toBe(false);
		expect(result.canonicalFormPass).toBe(true);
		expect(result.coreFeaturesPass).toBe(true);
	});
});
