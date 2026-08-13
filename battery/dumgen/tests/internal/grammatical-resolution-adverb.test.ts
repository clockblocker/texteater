import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	adverbGrammaticalResolutionAcceptanceExperiment,
	adverbGrammaticalResolutionExperiment,
	developmentEvaluation,
	untouchedAcceptanceEvaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-adverb/evaluation-suite";
import { evaluateAdverbGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-adverb/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/adverb/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/adverb/prompt-source";
import {
	inputSchema,
	modelCitationSurfaceSchema,
	modelInflectionalFeaturesSchema,
	modelInflectionSurfaceSchema,
	modelLemmaSchema,
	outputSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/adverb/schemas";

const expectedDemonstrationIds = [
	"grammar-de-adv-demo-temporal-heute",
	"grammar-de-adv-demo-demonstrative-dazu",
	"grammar-de-adv-demo-interrogative-warum",
	"grammar-de-adv-demo-comparative-lieber",
	"grammar-de-adv-demo-superlative-am-liebsten",
	"grammar-de-adv-demo-typo-gester",
] as const;

const expectedDevelopmentIds = [
	"grammar-de-adv-dev-temporal-morgen",
	"grammar-de-adv-dev-initial-vielleicht",
	"grammar-de-adv-dev-demonstrative-damit",
	"grammar-de-adv-dev-relative-weshalb",
	"grammar-de-adv-dev-negative-keineswegs",
	"grammar-de-adv-dev-multiplicative-zweimal",
	"grammar-de-adv-dev-positive-viel",
	"grammar-de-adv-dev-cardinal-2x",
	"grammar-de-adv-dev-foreign-remotely",
	"grammar-de-adv-dev-comparative-weniger",
	"grammar-de-adv-dev-superlative-am-fruehesten",
	"grammar-de-adv-dev-typo-vielleich",
	"grammar-de-adv-dev-variant-bisschen",
	"grammar-de-adv-dev-abbreviation-ca",
	"grammar-de-adv-dev-route-sconj-da",
	"grammar-de-adv-dev-route-part-doch",
	"grammar-de-adv-dev-route-adp-davor",
	"grammar-de-adv-dev-route-adj-gern",
	"grammar-de-adv-dev-route-paired-frame-auch",
] as const;

const expectedAcceptanceIds = [
	"grammar-de-adv-accept-temporal-gestern",
	"grammar-de-adv-accept-locative-hier",
	"grammar-de-adv-accept-initial-draussen",
	"grammar-de-adv-accept-demonstrative-dafuer",
	"grammar-de-adv-accept-indefinite-wenig",
	"grammar-de-adv-accept-interrogative-wo",
	"grammar-de-adv-accept-relative-wobei",
	"grammar-de-adv-accept-negative-nie",
	"grammar-de-adv-accept-multiplicative-dreimal",
	"grammar-de-adv-accept-comparative-oefter",
	"grammar-de-adv-accept-typo-morgne",
	"grammar-de-adv-accept-archaic-allhier",
] as const;

describe("Lexeme/ADV route-local schemas and corpus", () => {
	test("uses canonical input and a total flat ADV codec DTO", () => {
		expect(
			inputSchema.parse({
				markedContext: "Wir kommen <TARGET>morgen</TARGET>.",
				members: ["morgen"],
			}),
		).toEqual({
			markedContext: "Wir kommen <TARGET>morgen</TARGET>.",
			members: ["morgen"],
		});
		expect(() =>
			inputSchema.parse({
				markedContext: "Wir kommen <TARGET>morgen</TARGET>.",
				members: ["heute"],
			}),
		).toThrow(/members must exactly match/);

		const modelOutput = outputSchema.parse({
			memberOrthographies: ["Standard"],
			normalizedMembers: ["öfter"],
			surface: {
				spelling: "Canonical",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				inflectionalFeatures: { degree: "Cmp" },
			},
			lemma: {
				canonicalForm: "oft",
				coreFeatures: {
					foreign: null,
					numType: null,
					pronType: null,
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

	test("preserves every codec-supported non-null ADV Degree", () => {
		for (const degree of ["Cmp", "Pos", "Sup"] as const) {
			expect(
				modelInflectionalFeaturesSchema.safeParse({ degree }).success,
			).toBe(true);
		}
		expect(
			modelInflectionalFeaturesSchema.safeParse({ degree: null }).success,
		).toBe(false);
		expect(modelInflectionalFeaturesSchema.safeParse({}).success).toBe(
			false,
		);
	});

	test("freezes 37 cases into disjoint grammatical partitions", () => {
		expect(corpus.all().ids).toHaveLength(37);
		expect(demonstrations.ids).toEqual(expectedDemonstrationIds);
		expect(developmentEvaluation.ids).toEqual(expectedDevelopmentIds);
		expect(untouchedAcceptanceEvaluation.ids).toEqual(
			expectedAcceptanceIds,
		);
		expect(demonstrations.ids).toHaveLength(6);
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
		).toHaveLength(37);
		expect(developmentEvaluation).toBe(
			adverbGrammaticalResolutionExperiment.evaluation,
		);
		expect(untouchedAcceptanceEvaluation).toBe(
			adverbGrammaticalResolutionAcceptanceExperiment.evaluation,
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

	test("covers ADV core features, Surface kinds, degrees, and orthography", () => {
		const cases = corpus.all().cases;
		const coreFeatures = cases.map(
			(testCase) => testCase.idealOutput.lemma.coreFeatures,
		);
		expect(
			coreFeatures.some((features) => features.foreign === "Yes"),
		).toBe(true);
		for (const numType of ["Card", "Mult"] as const) {
			expect(
				coreFeatures.some((features) => features.numType === numType),
			).toBe(true);
		}
		for (const pronType of ["Dem", "Ind", "Int", "Neg", "Rel"] as const) {
			expect(
				coreFeatures.some((features) => features.pronType === pronType),
			).toBe(true);
		}
		const inflectional = cases.flatMap((testCase) =>
			testCase.idealOutput.surface.surfaceKind === "Inflection"
				? [testCase.idealOutput.surface.inflectionalFeatures]
				: [],
		);
		for (const degree of ["Cmp", "Pos", "Sup"] as const) {
			expect(
				inflectional.some((features) => features.degree === degree),
			).toBe(true);
		}
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
		).toHaveLength(3);
		expect(
			cases.filter(
				(testCase) =>
					testCase.idealOutput.surface.spelling === "Variant",
			),
		).toHaveLength(2);
		expect(
			cases.filter(
				(testCase) =>
					testCase.idealOutput.surface.surfaceFeatures !== null,
			),
		).toHaveLength(1);
	});

	test("keeps all route contrasts total and fixed upstream", () => {
		for (const caseId of [
			"grammar-de-adv-dev-route-sconj-da",
			"grammar-de-adv-dev-route-part-doch",
			"grammar-de-adv-dev-route-adp-davor",
			"grammar-de-adv-dev-route-adj-gern",
			"grammar-de-adv-dev-route-paired-frame-auch",
		] as const) {
			const [testCase] = corpus.select([caseId]).cases;
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			expect(outputSchema.safeParse(testCase.idealOutput).success).toBe(
				true,
			);
			expect("decision" in testCase.idealOutput).toBe(false);
		}
	});

	test("assembles only total ADV instructions and demonstrations", () => {
		const prompt = assembleSystemPrompt(promptSource);

		expect(prompt).toContain("already-classified German Lexeme/ADV");
		expect(prompt).toContain("operation is total");
		expect(prompt).toContain('degree: "Cmp" | "Pos" | "Sup"');
		expect(prompt).toContain("Context determines Int versus Rel");
		expect(prompt).toContain("<TARGET>heute</TARGET>");
		expect(prompt).toContain("<TARGET>lieber</TARGET>");
		expect(prompt).toContain("<TARGET>gester</TARGET>");
		expect(prompt).not.toContain("<TARGET>keineswegs</TARGET>");
		expect(prompt).not.toContain("<TARGET>allhier</TARGET>");
	});
});

describe("Lexeme/ADV pure diagnostic evaluator", () => {
	test("passes every frozen development and acceptance ideal output", () => {
		for (const experiment of [
			adverbGrammaticalResolutionExperiment,
			adverbGrammaticalResolutionAcceptanceExperiment,
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

	test("reports structural and grammatical misses independently", () => {
		const [testCase] = developmentEvaluation.cases;
		if (testCase === undefined)
			throw new Error("Missing development case.");
		const result = evaluateAdverbGrammaticalResolution({
			caseId: developmentEvaluation.ids[0] ?? "missing",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output: {
				...testCase.idealOutput,
				normalizedMembers: ["gestern"],
				lemma: {
					...testCase.idealOutput.lemma,
					canonicalForm: "gestern",
				},
			},
		});

		expect(result.contractPass).toBe(false);
		expect(result.normalizedSurfacePass).toBe(false);
		expect(result.canonicalFormPass).toBe(false);
		expect(result.memberOrthographiesPass).toBe(true);
	});
});
