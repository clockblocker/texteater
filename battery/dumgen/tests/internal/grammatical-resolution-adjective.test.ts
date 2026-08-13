import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	adjectiveGrammaticalResolutionAcceptanceExperiment,
	adjectiveGrammaticalResolutionExperiment,
	developmentEvaluation,
	untouchedAcceptanceEvaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-adjective/evaluation-suite";
import { evaluateAdjectiveGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-adjective/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/adjective/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/adjective/prompt-source";
import {
	inputSchema,
	modelCitationSurfaceSchema,
	modelInflectionSurfaceSchema,
	modelLemmaSchema,
	outputSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/adjective/schemas";

const expectedDemonstrationIds = [
	"grammar-de-adj-demo-citation-sanft",
	"grammar-de-adj-demo-attributive-klein",
	"grammar-de-adj-demo-adverbial-schnell",
	"grammar-de-adj-demo-comparative-besser",
	"grammar-de-adj-demo-ordinal-erste",
	"grammar-de-adj-demo-typo-freundlcih",
] as const;

const expectedDevelopmentIds = [
	"grammar-de-adj-dev-attributive-acc-fem-rot",
	"grammar-de-adj-dev-attributive-dat-neut-kalt",
	"grammar-de-adj-dev-attributive-gen-plur-neu",
	"grammar-de-adj-dev-attributive-nom-plur-alt",
	"grammar-de-adj-dev-predicative-blau",
	"grammar-de-adj-dev-adverbial-leise",
	"grammar-de-adj-dev-attributive-comparative-teuer",
	"grammar-de-adj-dev-attributive-superlative-hoch",
	"grammar-de-adj-dev-adverbial-superlative-sorgfaeltig",
	"grammar-de-adj-dev-predicative-comparative-nah",
	"grammar-de-adj-dev-cardinal-siebenhundert",
	"grammar-de-adj-dev-foreign-special",
	"grammar-de-adj-dev-abbreviation-sog",
	"grammar-de-adj-dev-typo-grsser",
	"grammar-de-adj-dev-participial-geschlossen",
	"grammar-de-adj-dev-participial-spannend",
	"grammar-de-adj-dev-invariant-lila",
	"grammar-de-adj-dev-archaic-hold",
] as const;

const expectedAcceptanceIds = [
	"grammar-de-adj-accept-citation-mild",
	"grammar-de-adj-accept-attributive-dat-fem-lang",
	"grammar-de-adj-accept-attributive-acc-neut-gruen",
	"grammar-de-adj-accept-attributive-gen-masc-stark",
	"grammar-de-adj-accept-predicative-ruhig",
	"grammar-de-adj-accept-adverbial-deutlich",
	"grammar-de-adj-accept-irregular-superlative-beste",
	"grammar-de-adj-accept-adverbial-comparative-schnell",
	"grammar-de-adj-accept-ordinal-zweite",
	"grammar-de-adj-accept-typo-wunderschoen",
	"grammar-de-adj-accept-participial-glaenzend",
	"grammar-de-adj-accept-invariant-rosa",
] as const;

describe("Lexeme/ADJ route-local schemas and corpus", () => {
	test("uses canonical input and the smallest total flat codec-derived DTO", () => {
		expect(
			inputSchema.parse({
				markedContext: "Der <TARGET>kleine</TARGET> Hund schläft.",
				members: ["kleine"],
			}),
		).toEqual({
			markedContext: "Der <TARGET>kleine</TARGET> Hund schläft.",
			members: ["kleine"],
		});
		expect(() =>
			inputSchema.parse({
				markedContext: "Der <TARGET>kleine</TARGET> Hund schläft.",
				members: ["Hund"],
			}),
		).toThrow(/members must exactly match/);

		const modelOutput = outputSchema.parse({
			memberOrthographies: ["Standard"],
			normalizedMembers: ["kleine"],
			surface: {
				spelling: "Canonical",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				inflectionalFeatures: {
					case: "Nom",
					degree: "Pos",
					gender: "Masc",
					number: "Sing",
				},
			},
			lemma: {
				canonicalForm: "klein",
				coreFeatures: {
					abbr: null,
					foreign: null,
					numType: null,
					variant: null,
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
			modelLemmaSchema.parse({
				...modelOutput.lemma,
				language: "de",
			}),
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

	test("freezes 36 realistic total cases into disjoint grammatical partitions", () => {
		expect(corpus.all().ids).toHaveLength(36);
		expect(demonstrations.ids).toEqual(expectedDemonstrationIds);
		expect(developmentEvaluation.ids).toEqual(expectedDevelopmentIds);
		expect(untouchedAcceptanceEvaluation.ids).toEqual(
			expectedAcceptanceIds,
		);
		expect(demonstrations.ids).toHaveLength(6);
		expect(developmentEvaluation.ids).toHaveLength(18);
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
		).toHaveLength(36);
		expect(developmentEvaluation).toBe(
			adjectiveGrammaticalResolutionExperiment.evaluation,
		);
		expect(untouchedAcceptanceEvaluation).toBe(
			adjectiveGrammaticalResolutionAcceptanceExperiment.evaluation,
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

	test("covers agreement, position, comparison, route anchors, and form policies", () => {
		const cases = corpus.all().cases;
		expect(
			cases.filter(
				(testCase) =>
					testCase.idealOutput.surface.surfaceKind === "Citation",
			),
		).toHaveLength(2);
		expect(
			cases.filter((testCase) => {
				const surface = testCase.idealOutput.surface;
				return (
					surface.surfaceKind === "Inflection" &&
					(surface.inflectionalFeatures.degree === "Cmp" ||
						surface.inflectionalFeatures.degree === "Sup")
				);
			}),
		).toHaveLength(7);
		expect(
			cases.filter(
				(testCase) =>
					testCase.idealOutput.lemma.coreFeatures.numType === "Ord",
			),
		).toHaveLength(2);
		expect(
			cases.filter(
				(testCase) =>
					testCase.idealOutput.memberOrthographies[0] === "Typo",
			),
		).toHaveLength(3);
		expect(
			cases.filter(
				(testCase) =>
					testCase.idealOutput.surface.surfaceFeatures !== null,
			),
		).toHaveLength(1);
		for (const coreKey of ["abbr", "foreign", "numType"] as const) {
			expect(
				cases.some(
					(testCase) =>
						testCase.idealOutput.lemma.coreFeatures[coreKey] !==
						null,
				),
			).toBe(true);
		}
		for (const anchor of [
			"not lexical adv",
			"not num",
			"not color-name noun",
			"not verbal participle",
		]) {
			expect(
				cases.some((testCase) =>
					testCase.explanation
						?.toLocaleLowerCase("de")
						.includes(anchor),
				),
			).toBe(true);
		}
	});

	test("assembles only the total classified-target contract and demonstrations", () => {
		const prompt = assembleSystemPrompt(promptSource);

		expect(prompt).toContain("already-classified German Lexeme/ADJ");
		expect(prompt).toContain("members: string[]");
		expect(prompt).toContain("At least one value must be non-null");
		expect(prompt).toContain(
			"Never return decision, resolution, Unresolved",
		);
		expect(prompt).toContain("<TARGET>kleine</TARGET>");
		expect(prompt).toContain("<TARGET>besser</TARGET>");
		expect(prompt).toContain("<TARGET>freundlcih</TARGET>");
		expect(prompt).not.toContain("<TARGET>teureres</TARGET>");
		expect(prompt).not.toContain("<TARGET>wundershcön</TARGET>");
	});
});

describe("Lexeme/ADJ pure diagnostic evaluator", () => {
	test("passes every frozen development and acceptance ideal output", () => {
		for (const experiment of [
			adjectiveGrammaticalResolutionExperiment,
			adjectiveGrammaticalResolutionAcceptanceExperiment,
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

	test("reports normalization, inflection, and Core Feature misses independently", () => {
		const testCase =
			corpus.cases["grammar-de-adj-dev-attributive-comparative-teuer"];
		if (
			testCase === undefined ||
			testCase.idealOutput.surface.surfaceKind !== "Inflection"
		) {
			throw new Error("Missing comparative fixture.");
		}
		const output = outputSchema.parse({
			...testCase.idealOutput,
			normalizedMembers: ["teures"],
			surface: {
				...testCase.idealOutput.surface,
				inflectionalFeatures: {
					...testCase.idealOutput.surface.inflectionalFeatures,
					degree: "Pos",
				},
			},
			lemma: {
				...testCase.idealOutput.lemma,
				coreFeatures: {
					...testCase.idealOutput.lemma.coreFeatures,
					abbr: "Yes",
				},
			},
		});
		const result = evaluateAdjectiveGrammaticalResolution({
			caseId: "grammar-de-adj-dev-attributive-comparative-teuer",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});

		expect(result.contractPass).toBe(false);
		expect(result.normalizedSurfacePass).toBe(false);
		expect(result.inflectionalFeaturesPass).toBe(false);
		expect(result.coreFeaturesPass).toBe(false);
		expect(result.surfaceKindPass).toBe(true);
	});

	test("canonicalizes an all-null model feature bag like the route seam", () => {
		const testCase = corpus.cases["grammar-de-adj-dev-adverbial-leise"];
		if (testCase === undefined) throw new Error("Missing ADJ fixture.");
		const output = outputSchema.parse({
			...testCase.idealOutput,
			surface: {
				...testCase.idealOutput.surface,
				surfaceFeatures: { historicalStatus: null },
			},
		});
		const result = evaluateAdjectiveGrammaticalResolution({
			caseId: "grammar-de-adj-dev-adverbial-leise",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});

		expect(result.contractPass).toBe(true);
		expect(result.surfaceFeaturesPass).toBe(true);
	});
});
