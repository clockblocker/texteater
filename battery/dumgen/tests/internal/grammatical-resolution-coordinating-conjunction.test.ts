import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	coordinatingConjunctionGrammaticalResolutionExperiment,
	evaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-coordinating-conjunction/evaluation-suite";
import { evaluateCoordinatingConjunctionGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-coordinating-conjunction/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/coordinating-conjunction/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/coordinating-conjunction/prompt-source";
import {
	deCoordinatingConjunctionModelCitationSurfaceSchema,
	deCoordinatingConjunctionModelLemmaSchema,
	outputSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/coordinating-conjunction/schemas";

const expectedEvaluationIds = [
	"grammar-de-cconj-citation-oder",
	"grammar-de-cconj-und-noun-phrases",
	"grammar-de-cconj-oder-clauses",
	"grammar-de-cconj-aber-clauses",
	"grammar-de-cconj-denn-clauses",
	"grammar-de-cconj-coordinating-doch",
	"grammar-de-cconj-sondern-adjectives",
	"grammar-de-cconj-sowie-noun-phrases",
	"grammar-de-cconj-correlative-noch",
	"grammar-de-cconj-repeated-second-und",
	"grammar-de-cconj-sentence-initial-und",
	"grammar-de-cconj-comparative-wie",
	"grammar-de-cconj-typo-odre",
	"grammar-de-cconj-unresolved-ambiguous-denn",
	"grammar-de-cconj-unresolved-subordinator-weil",
	"grammar-de-cconj-unresolved-overbroad-und-kaffee",
	"grammar-de-cconj-unresolved-two-targets",
	"grammar-de-cconj-unresolved-particle-aber",
] as const;

describe("Lexeme/CCONJ route-local schemas and corpus", () => {
	test("keeps exact Citation-only model schemas", () => {
		expect(
			deCoordinatingConjunctionModelLemmaSchema.parse({
				canonicalForm: "als",
				coreFeatures: { conjType: "Comp" },
			}),
		).toEqual({
			canonicalForm: "als",
			coreFeatures: { conjType: "Comp" },
		});
		expect(() =>
			deCoordinatingConjunctionModelLemmaSchema.parse({
				language: "de",
				canonicalForm: "und",
				coreFeatures: { conjType: null },
			}),
		).toThrow();
		expect(
			deCoordinatingConjunctionModelCitationSurfaceSchema.parse({
				normalizedSurface: "und",
				spelling: "Canonical",
				surfaceKind: "Citation",
				surfaceFeatures: null,
			}),
		).toEqual({
			normalizedSurface: "und",
			spelling: "Canonical",
			surfaceKind: "Citation",
			surfaceFeatures: null,
		});
		expect(() =>
			deCoordinatingConjunctionModelCitationSurfaceSchema.parse({
				normalizedSurface: "und",
				spelling: "Canonical",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				inflectionalFeatures: {},
			}),
		).toThrow();
	});

	test("pins 18 held-out cases disjoint from five necessary demonstrations", () => {
		expect(corpus.all().ids).toHaveLength(27);
		expect(demonstrations.ids).toEqual([
			"grammar-de-cconj-demo-contextual-und-citation",
			"grammar-de-cconj-demo-comparative-als",
			"grammar-de-cconj-demo-typo-udn",
			"grammar-de-cconj-demo-variant-bzw",
			"grammar-de-cconj-demo-ambiguous-doch",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation.ids).toHaveLength(18);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(evaluation).toBe(
			coordinatingConjunctionGrammaticalResolutionExperiment.evaluation,
		);
		expect(demonstrations.union(evaluation).ids).toHaveLength(23);
	});

	test("normalizes ordinary sentence-initial casing and retains a positive coordinating doch", () => {
		const sentenceInitial =
			corpus.cases["grammar-de-cconj-sentence-initial-und"];
		const coordinatingDoch =
			corpus.cases["grammar-de-cconj-coordinating-doch"];
		expect(sentenceInitial?.idealOutput.resolution?.surface).toMatchObject({
			normalizedSurface: "und",
			spelling: "Canonical",
		});
		expect(coordinatingDoch?.idealOutput).toMatchObject({
			decision: "Resolved",
			resolution: {
				lemma: {
					canonicalForm: "doch",
					coreFeatures: { conjType: null },
				},
			},
		});
	});

	test("assembles only minimized demonstrations", () => {
		const prompt = assembleSystemPrompt(promptSource);

		expect(prompt).toContain("ordinary contextual use still resolves");
		expect(prompt).toContain("größer <TARGET>als</TARGET>");
		expect(prompt).toContain("<TARGET>udn</TARGET>");
		expect(prompt).toContain("<TARGET>bzw.</TARGET>");
		expect(prompt).toContain(
			"Stichwort ohne Kontext: <TARGET>doch</TARGET>",
		);
		expect(prompt).not.toContain("<TARGET>odre</TARGET>");
		expect(prompt).not.toContain("<TARGET>weil</TARGET>");
		expect(prompt).not.toContain("<TARGET>allein</TARGET>");
	});
});

describe("Lexeme/CCONJ pure diagnostic evaluator", () => {
	test("passes every pinned ideal output", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const testCase = evaluation.cases[index];
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result = evaluateCoordinatingConjunctionGrammaticalResolution(
				{
					caseId,
					input: testCase.input,
					idealOutput: testCase.idealOutput,
					output: testCase.idealOutput,
				},
			);

			expect(result.contractPass).toBe(true);
			expect(Object.values(result).every(Boolean)).toBe(true);
		}
	});

	test("reports Core Feature and normalization misses independently", () => {
		const testCase = corpus.cases["grammar-de-cconj-comparative-wie"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null
		) {
			throw new Error("Missing comparative fixture.");
		}
		const output = outputSchema.parse({
			...testCase.idealOutput,
			resolution: {
				...testCase.idealOutput.resolution,
				surface: {
					...testCase.idealOutput.resolution.surface,
					normalizedSurface: "als",
				},
				lemma: {
					...testCase.idealOutput.resolution.lemma,
					coreFeatures: { conjType: null },
				},
			},
		});
		const result = evaluateCoordinatingConjunctionGrammaticalResolution({
			caseId: "grammar-de-cconj-comparative-wie",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});

		expect(result.contractPass).toBe(false);
		expect(result.normalizedSurfacePass).toBe(false);
		expect(result.coreFeaturesPass).toBe(false);
		expect(result.surfaceKindPass).toBe(true);
	});

	test("canonicalizes an all-null model feature bag like the codec", () => {
		const testCase = corpus.cases["grammar-de-cconj-und-noun-phrases"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null
		) {
			throw new Error("Missing und fixture.");
		}
		const output = outputSchema.parse({
			...testCase.idealOutput,
			resolution: {
				...testCase.idealOutput.resolution,
				surface: {
					...testCase.idealOutput.resolution.surface,
					surfaceFeatures: { historicalStatus: null },
				},
			},
		});
		const result = evaluateCoordinatingConjunctionGrammaticalResolution({
			caseId: "grammar-de-cconj-und-noun-phrases",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});

		expect(result.contractPass).toBe(true);
		expect(result.surfaceFeaturesPass).toBe(true);
	});
});
