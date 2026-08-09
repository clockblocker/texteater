import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	evaluation,
	otherGrammaticalResolutionExperiment,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-other/evaluation-suite";
import { evaluateOtherGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-other/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/other/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/other/prompt-source";
import {
	buildDeOtherInflectionSurfaceCodec,
	deOtherLemmaCodec,
	deOtherModelCitationSurfaceSchema,
	deOtherModelInflectionalFeaturesSchema,
	deOtherModelInflectionSurfaceSchema,
	deOtherModelLemmaSchema,
	outputSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/other/schemas";

const expectedEvaluationIds = [
	"grammar-de-x-unresolved-opaque-hebrew-shalom",
	"grammar-de-x-unresolved-opaque-french-bonjour",
	"grammar-de-x-unresolved-opaque-japanese-arigatou",
	"grammar-de-x-unresolved-opaque-swedish-chocktillstand",
	"grammar-de-x-unresolved-abbreviation-zb",
	"grammar-de-x-unresolved-typo-gelauffen",
	"grammar-de-x-unresolved-foreign-noun-house",
	"grammar-de-x-unresolved-propn-paris",
	"grammar-de-x-unresolved-propn-apple",
	"grammar-de-x-unresolved-intj-ouch",
	"grammar-de-x-unresolved-sym-percent",
	"grammar-de-x-unresolved-sym-dagger",
	"grammar-de-x-unresolved-punct-exclamation",
	"grammar-de-x-unresolved-opaque-question-marks",
	"grammar-de-x-unresolved-fragment-unver",
	"grammar-de-x-unresolved-email",
	"grammar-de-x-unresolved-overbroad-good-morning",
	"grammar-de-x-unresolved-repeated-bonjour",
	"grammar-de-x-unresolved-unbalanced-bonjour",
] as const;

const dormantCoreFeatures = {
	abbr: null,
	foreign: null,
	hyph: null,
	numType: null,
} as const;

function dormantCitation(surfaceFeatures: unknown = null) {
	return outputSchema.parse({
		decision: "Resolved",
		resolution: {
			memberOrthographies: ["Standard"],
			realizationCoverage: "Full",
			normalizedMembers: ["x"],
			surface: {
				spelling: "Canonical",
				surfaceKind: "Citation",
				surfaceFeatures,
			},
			lemma: { canonicalForm: "x", coreFeatures: dormantCoreFeatures },
		},
	});
}

function dormantInflection(number: "Plur" | "Sing" | null = null) {
	return outputSchema.parse({
		decision: "Resolved",
		resolution: {
			memberOrthographies: ["Standard"],
			realizationCoverage: "Full",
			normalizedMembers: ["x"],
			surface: {
				spelling: "Canonical",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				inflectionalFeatures: {
					case: "Nom",
					gender: null,
					mood: null,
					number,
					verbForm: null,
				},
			},
			lemma: { canonicalForm: "x", coreFeatures: dormantCoreFeatures },
		},
	});
}

describe("Lexeme/X route-local schemas and corpus", () => {
	test("faithfully projects dormant Citation and non-empty Inflection DTOs", () => {
		expect(
			deOtherModelLemmaSchema.parse({
				canonicalForm: "x",
				coreFeatures: dormantCoreFeatures,
			}),
		).toEqual({
			canonicalForm: "x",
			coreFeatures: dormantCoreFeatures,
		});
		expect(() =>
			deOtherModelLemmaSchema.parse({
				language: "de",
				canonicalForm: "x",
				coreFeatures: dormantCoreFeatures,
			}),
		).toThrow();

		expect(
			deOtherModelCitationSurfaceSchema.parse(
				dormantCitation().resolution?.surface,
			),
		).toMatchObject({ surfaceKind: "Citation" });
		expect(
			deOtherModelInflectionSurfaceSchema.parse(
				dormantInflection().resolution?.surface,
			),
		).toMatchObject({
			surfaceKind: "Inflection",
			inflectionalFeatures: { case: "Nom" },
		});
		expect(() =>
			deOtherModelInflectionalFeaturesSchema.parse({
				case: null,
				gender: null,
				mood: null,
				number: null,
				verbForm: null,
			}),
		).toThrow();

		const canonicalLemma = deOtherLemmaCodec.decode({
			canonicalForm: "x",
			coreFeatures: dormantCoreFeatures,
		});
		const inflectionCodec =
			buildDeOtherInflectionSurfaceCodec(canonicalLemma);
		const modelInflection = dormantInflection().resolution?.surface;
		if (
			modelInflection === undefined ||
			modelInflection.surfaceKind !== "Inflection"
		) {
			throw new Error("Missing dormant Inflection fixture.");
		}
		expect(
			inflectionCodec.encode(
				inflectionCodec.decode({
					...modelInflection,
					normalizedSurface:
						dormantInflection().resolution?.normalizedMembers.join(
							" ",
						) ?? "x",
				}),
			),
		).toEqual({ ...modelInflection, normalizedSurface: "x" });
	});

	test("pins an intentionally all-Unresolved 26/4/19/3 split", () => {
		expect(corpus.all().ids).toHaveLength(26);
		expect(demonstrations.ids).toEqual([
			"grammar-de-x-unresolved-opaque-english-green",
			"grammar-de-x-unresolved-typo-kaffe",
			"grammar-de-x-unresolved-noun-computer",
			"grammar-de-x-unresolved-gibberish-xqzv",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation.ids).toHaveLength(19);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(evaluation).toBe(
			otherGrammaticalResolutionExperiment.evaluation,
		);
		expect(demonstrations.union(evaluation).ids).toHaveLength(23);
		expect(
			corpus
				.all()
				.cases.every(
					(testCase) =>
						testCase.idealOutput.decision === "Unresolved" &&
						testCase.idealOutput.resolution === null,
				),
		).toBe(true);
	});

	test("keeps dormant Core Feature ownership probes corpus-only and negative", () => {
		for (const caseId of [
			"grammar-de-x-provisional-hyph-drive-in",
			"grammar-de-x-provisional-abbr-og",
			"grammar-de-x-provisional-numtype-s8",
		] as const) {
			expect(corpus.cases[caseId]?.idealOutput).toEqual({
				decision: "Unresolved",
				resolution: null,
			});
			expect(demonstrations.ids).not.toContain(caseId);
			expect(evaluation.ids).not.toContain(caseId);
		}
	});

	test("assembles the negative leaf policy without positive twins", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("<TARGET>green</TARGET>");
		expect(prompt).toContain("<TARGET>Kaffe</TARGET>");
		expect(prompt).toContain("<TARGET>Computer</TARGET>");
		expect(prompt).toContain("<TARGET>xqzv</TARGET>");
		expect(prompt).not.toContain("<TARGET>bonjour</TARGET>");
		expect(prompt).not.toContain("<TARGET>Drive-in</TARGET>");
		expect(prompt).not.toContain("<TARGET>S8</TARGET>");
		expect(prompt).toContain("reachable successful");
		expect(prompt).toContain("Always return");
		expect(prompt).toContain("non-primary-language span as OpaqueText");
		expect(prompt).toContain("Issue #19");
		expect(prompt).toContain(
			"Citation and structurally non-null Inflection Surface alternatives",
		);
	});
});

describe("Lexeme/X pure diagnostic evaluator", () => {
	test("passes every pinned rejection oracle", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const testCase = evaluation.cases[index];
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result = evaluateOtherGrammaticalResolution({
				caseId,
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: testCase.idealOutput,
			});
			expect(result.contractPass).toBe(true);
			expect(Object.values(result).every(Boolean)).toBe(true);
		}
	});

	test("still scores dormant Inflection fields independently", () => {
		const idealOutput = dormantInflection();
		const output = dormantInflection("Sing");
		const result = evaluateOtherGrammaticalResolution({
			caseId: "dormant-inflection-contract",
			input: { markedContext: "<TARGET>x</TARGET>" },
			idealOutput,
			output,
		});
		expect(result.contractPass).toBe(false);
		expect(result.inflectionalFeaturesPass).toBe(false);
		expect(result.surfaceKindPass).toBe(true);
		expect(result.coreFeaturesPass).toBe(true);
	});

	test("canonicalizes an all-null model Surface Feature bag", () => {
		const idealOutput = dormantCitation();
		const output = dormantCitation({ historicalStatus: null });
		const result = evaluateOtherGrammaticalResolution({
			caseId: "dormant-citation-contract",
			input: { markedContext: "<TARGET>x</TARGET>" },
			idealOutput,
			output,
		});
		expect(result.contractPass).toBe(true);
		expect(result.surfaceFeaturesPass).toBe(true);
	});
});
