import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	evaluation,
	particleGrammaticalResolutionExperiment,
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
	outputSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/particle/schemas";

const expectedEvaluationIds = [
	"grammar-de-part-negative-nicht",
	"grammar-de-part-negative-sentence-initial-nicht",
	"grammar-de-part-negative-typo-nicth",
	"grammar-de-part-infinitival-zu",
	"grammar-de-part-modal-doch",
	"grammar-de-part-modal-denn",
	"grammar-de-part-modal-wohl",
	"grammar-de-part-modal-bloss",
	"grammar-de-part-modal-mal",
	"grammar-de-part-modal-ja",
	"grammar-de-part-modal-label-eigentlich",
	"grammar-de-part-repeated-second-doch",
	"grammar-de-part-unresolved-verb-particle-an",
	"grammar-de-part-unresolved-adverb-gerne",
	"grammar-de-part-unresolved-response-ja",
	"grammar-de-part-unresolved-cconj-aber",
	"grammar-de-part-unresolved-sconj-weil",
	"grammar-de-part-unresolved-phraseme-na-ja",
	"grammar-de-part-unresolved-adposition-zu",
	"grammar-de-part-unresolved-overbroad-doch-mal",
	"grammar-de-part-unresolved-two-targets",
	"grammar-de-part-unresolved-ambiguous-doch-label",
] as const;

describe("Lexeme/PART route-local schemas and corpus", () => {
	test("projects the exact Dumling Citation-only DTOs", () => {
		expect(
			deParticleModelLemmaSchema.parse({
				canonicalForm: "nicht",
				coreFeatures: {
					abbr: null,
					foreign: null,
					partType: null,
					polarity: "Neg",
				},
			}),
		).toEqual({
			canonicalForm: "nicht",
			coreFeatures: {
				abbr: null,
				foreign: null,
				partType: null,
				polarity: "Neg",
			},
		});
		expect(() =>
			deParticleModelLemmaSchema.parse({
				language: "de",
				canonicalForm: "zu",
				coreFeatures: {
					abbr: null,
					foreign: null,
					partType: "Inf",
					polarity: null,
				},
			}),
		).toThrow();
		expect(() =>
			deParticleModelLemmaSchema.parse({
				canonicalForm: "doch",
				coreFeatures: {
					abbr: null,
					foreign: null,
					partType: "Mod",
					polarity: null,
				},
			}),
		).toThrow();
		expect(
			deParticleModelLemmaSchema.parse({
				canonicalForm: "ja",
				coreFeatures: {
					abbr: null,
					foreign: null,
					partType: null,
					polarity: "Pos",
				},
			}),
		).toBeDefined();
		expect(
			deParticleModelCitationSurfaceSchema.parse({
				normalizedSurface: "nicht",
				spelling: "Canonical",
				realizationCoverage: "Full",
				surfaceKind: "Citation",
				surfaceFeatures: null,
			}),
		).toBeDefined();
		expect(() =>
			deParticleModelCitationSurfaceSchema.parse({
				normalizedSurface: "nicht",
				spelling: "Canonical",
				realizationCoverage: "Full",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				inflectionalFeatures: {},
			}),
		).toThrow();
	});

	test("pins 22 held-out cases disjoint from four lemma-disjoint demonstrations", () => {
		expect(corpus.all().ids).toHaveLength(28);
		expect(demonstrations.ids).toEqual([
			"grammar-de-part-demo-modal-halt",
			"grammar-de-part-demo-typo-ebn",
			"grammar-de-part-demo-unresolved-verb-particle-auf",
			"grammar-de-part-demo-unresolved-response-nein",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation.ids).toHaveLength(22);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(evaluation).toBe(
			particleGrammaticalResolutionExperiment.evaluation,
		);
		expect(demonstrations.union(evaluation).ids).toHaveLength(26);
		expect(evaluation.ids).not.toContain(
			"grammar-de-part-provisional-affirmative-ja",
		);
		expect(evaluation.ids).not.toContain(
			"grammar-de-part-provisional-foreign-not",
		);

		const demonstratedLemmas = new Set(
			demonstrations.cases.flatMap((goldenCase) =>
				goldenCase.idealOutput.resolution === null
					? []
					: [goldenCase.idealOutput.resolution.lemma.canonicalForm],
			),
		);
		const evaluatedLemmas = new Set(
			evaluation.cases.flatMap((goldenCase) =>
				goldenCase.idealOutput.resolution === null
					? []
					: [goldenCase.idealOutput.resolution.lemma.canonicalForm],
			),
		);
		expect(
			[...demonstratedLemmas].filter((lemma) =>
				evaluatedLemmas.has(lemma),
			),
		).toEqual([]);
	});

	test("assembles only the selected policy demonstrations", () => {
		const prompt = assembleSystemPrompt(promptSource);

		expect(prompt).toContain("Das ist <TARGET>halt</TARGET> so.");
		expect(prompt).toContain("<TARGET>ebn</TARGET>");
		expect(prompt).toContain("Er hört <TARGET>auf</TARGET>");
		expect(prompt).toContain("<TARGET>Nein</TARGET>");
		expect(prompt).not.toContain("<TARGET>nicth</TARGET>");
		expect(prompt).not.toContain("<TARGET>bloß</TARGET>");
		expect(prompt).not.toContain("<TARGET>not</TARGET>");
		expect(prompt).not.toMatch(
			/\b(?:doch|denn|wohl|bloß|mal|ja|eigentlich)\b/iu,
		);
	});

	test("keeps modal ja distinct from a response and a discourse formula", () => {
		expect(
			corpus.cases["grammar-de-part-modal-ja"]?.idealOutput,
		).toMatchObject({
			decision: "Resolved",
			resolution: {
				lemma: {
					canonicalForm: "ja",
					coreFeatures: { polarity: null, partType: null },
				},
			},
		});
		expect(
			corpus.cases["grammar-de-part-unresolved-response-ja"]?.idealOutput,
		).toEqual({ decision: "Unresolved", resolution: null });
		expect(
			corpus.cases["grammar-de-part-unresolved-phraseme-na-ja"]
				?.idealOutput,
		).toEqual({ decision: "Unresolved", resolution: null });
	});
});

describe("Lexeme/PART pure diagnostic evaluator", () => {
	test("passes every pinned ideal output", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const goldenCase = evaluation.cases[index];
			if (goldenCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result = evaluateParticleGrammaticalResolution({
				caseId,
				input: goldenCase.input,
				idealOutput: goldenCase.idealOutput,
				output: goldenCase.idealOutput,
			});

			expect(result.contractPass).toBe(true);
			expect(Object.values(result).every(Boolean)).toBe(true);
		}
	});

	test("reports normalization and Core Feature misses independently", () => {
		const goldenCase = corpus.cases["grammar-de-part-negative-nicht"];
		if (
			goldenCase === undefined ||
			goldenCase.idealOutput.resolution === null
		) {
			throw new Error("Missing negative-particle fixture.");
		}
		const output = outputSchema.parse({
			...goldenCase.idealOutput,
			resolution: {
				...goldenCase.idealOutput.resolution,
				surface: {
					...goldenCase.idealOutput.resolution.surface,
					normalizedSurface: "nie",
				},
				lemma: {
					...goldenCase.idealOutput.resolution.lemma,
					coreFeatures: {
						...goldenCase.idealOutput.resolution.lemma.coreFeatures,
						polarity: null,
					},
				},
			},
		});
		const result = evaluateParticleGrammaticalResolution({
			caseId: "grammar-de-part-negative-nicht",
			input: goldenCase.input,
			idealOutput: goldenCase.idealOutput,
			output,
		});

		expect(result.contractPass).toBe(false);
		expect(result.normalizedSurfacePass).toBe(false);
		expect(result.coreFeaturesPass).toBe(false);
		expect(result.surfaceKindPass).toBe(true);
	});

	test("canonicalizes only the codec-equivalent all-null Surface feature bag", () => {
		const goldenCase = corpus.cases["grammar-de-part-modal-doch"];
		if (
			goldenCase === undefined ||
			goldenCase.idealOutput.resolution === null
		) {
			throw new Error("Missing modal-particle fixture.");
		}
		const output = outputSchema.parse({
			...goldenCase.idealOutput,
			resolution: {
				...goldenCase.idealOutput.resolution,
				surface: {
					...goldenCase.idealOutput.resolution.surface,
					surfaceFeatures: { historicalStatus: null },
				},
			},
		});
		const result = evaluateParticleGrammaticalResolution({
			caseId: "grammar-de-part-modal-doch",
			input: goldenCase.input,
			idealOutput: goldenCase.idealOutput,
			output,
		});

		expect(result.contractPass).toBe(true);
		expect(result.surfaceFeaturesPass).toBe(true);
	});
});
