import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	evaluation,
	subordinatingConjunctionGrammaticalResolutionExperiment,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-subordinating-conjunction/evaluation-suite";
import { evaluateSubordinatingConjunctionGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-subordinating-conjunction/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/subordinating-conjunction/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/subordinating-conjunction/prompt-source";
import {
	deSubordinatingConjunctionModelCitationSurfaceSchema,
	deSubordinatingConjunctionModelLemmaSchema,
	outputSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/subordinating-conjunction/schemas";

const expectedEvaluationIds = [
	"grammar-de-sconj-citation-dass",
	"grammar-de-sconj-complement-dass",
	"grammar-de-sconj-conditional-wenn",
	"grammar-de-sconj-temporal-nachdem",
	"grammar-de-sconj-temporal-waehrend",
	"grammar-de-sconj-interrogative-ob",
	"grammar-de-sconj-temporal-bevor",
	"grammar-de-sconj-conditional-falls",
	"grammar-de-sconj-temporal-seitdem",
	"grammar-de-sconj-temporal-sobald",
	"grammar-de-sconj-modal-indem",
	"grammar-de-sconj-causal-zumal",
	"grammar-de-sconj-comparative-als-clause",
	"grammar-de-sconj-sentence-initial-dass",
	"grammar-de-sconj-typo-wehn",
	"grammar-de-sconj-unresolved-adp-waehrend",
	"grammar-de-sconj-unresolved-adv-dann",
	"grammar-de-sconj-unresolved-cconj-denn",
	"grammar-de-sconj-unresolved-cconj-comparative-als",
	"grammar-de-sconj-unresolved-adp-als",
	"grammar-de-sconj-unresolved-adv-darum",
	"grammar-de-sconj-unresolved-overbroad-dass-er",
	"grammar-de-sconj-unresolved-two-targets",
] as const;

describe("Lexeme/SCONJ route-local schemas and corpus", () => {
	test("projects the exact Citation-only DTO and comparative Core Feature", () => {
		expect(
			deSubordinatingConjunctionModelLemmaSchema.parse({
				canonicalForm: "als",
				coreFeatures: { conjType: "Comp" },
			}),
		).toEqual({ canonicalForm: "als", coreFeatures: { conjType: "Comp" } });
		expect(() =>
			deSubordinatingConjunctionModelLemmaSchema.parse({
				language: "de",
				canonicalForm: "dass",
				coreFeatures: { conjType: null },
			}),
		).toThrow();
		expect(
			deSubordinatingConjunctionModelCitationSurfaceSchema.parse({
				normalizedSurface: "dass",
				spelling: "Canonical",
				realizationCoverage: "Full",
				surfaceKind: "Citation",
				surfaceFeatures: null,
			}),
		).toEqual({
			normalizedSurface: "dass",
			spelling: "Canonical",
			realizationCoverage: "Full",
			surfaceKind: "Citation",
			surfaceFeatures: null,
		});
		expect(() =>
			deSubordinatingConjunctionModelCitationSurfaceSchema.parse({
				normalizedSurface: "dass",
				spelling: "Canonical",
				realizationCoverage: "Full",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				inflectionalFeatures: {},
			}),
		).toThrow();
	});

	test("pins 23 held-out cases disjoint from four necessary demonstrations", () => {
		expect(corpus.all().ids).toHaveLength(34);
		expect(demonstrations.ids).toEqual([
			"grammar-de-sconj-contextual-weil",
			"grammar-de-sconj-comparative-reduced-wie",
			"grammar-de-sconj-typo-obwol",
			"grammar-de-sconj-unresolved-ambiguous-da",
		]);
		expect(
			corpus
				.all()
				.ids.some((id) =>
					/-(?:demo|eval|evaluation|held-out)-/u.test(id),
				),
		).toBe(false);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation.ids).toHaveLength(23);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(evaluation).toBe(
			subordinatingConjunctionGrammaticalResolutionExperiment.evaluation,
		);
		expect(demonstrations.union(evaluation).ids).toHaveLength(27);

		const demonstrationLemmas = new Set(
			demonstrations.cases.flatMap((testCase) =>
				testCase.idealOutput.resolution === null
					? []
					: [testCase.idealOutput.resolution.lemma.canonicalForm],
			),
		);
		expect(
			evaluation.cases.flatMap((testCase) =>
				testCase.idealOutput.resolution !== null &&
				demonstrationLemmas.has(
					testCase.idealOutput.resolution.lemma.canonicalForm,
				)
					? [testCase.idealOutput.resolution.lemma.canonicalForm]
					: [],
			),
		).toEqual([]);
	});

	test("keeps seven unsettled evidence and route policies corpus-only", () => {
		for (const caseId of [
			"grammar-de-sconj-provisional-multiword-so-dass",
			"grammar-de-sconj-provisional-v2-weil",
			"grammar-de-sconj-provisional-v2-obwohl",
			"grammar-de-sconj-provisional-historical-dass",
			"grammar-de-sconj-provisional-foreign-att",
			"grammar-de-sconj-provisional-gsd-typo-das",
			"grammar-de-sconj-provisional-gsd-typo-den",
		] as const) {
			expect(corpus.cases[caseId]).toBeDefined();
			expect(demonstrations.ids).not.toContain(caseId);
			expect(evaluation.ids).not.toContain(caseId);
		}
	});

	test("keeps comparative clause markers distinct from phrase comparisons", () => {
		expect(
			corpus.cases["grammar-de-sconj-comparative-reduced-wie"]
				?.idealOutput,
		).toMatchObject({
			decision: "Resolved",
			resolution: {
				lemma: {
					canonicalForm: "wie",
					coreFeatures: { conjType: "Comp" },
				},
			},
		});
		expect(
			corpus.cases["grammar-de-sconj-comparative-als-clause"]
				?.idealOutput,
		).toMatchObject({
			decision: "Resolved",
			resolution: {
				lemma: {
					canonicalForm: "als",
					coreFeatures: { conjType: "Comp" },
				},
			},
		});
		expect(
			corpus.cases["grammar-de-sconj-unresolved-cconj-comparative-als"]
				?.idealOutput,
		).toEqual({ decision: "Unresolved", resolution: null });
	});

	test("does not reproduce the noisy SCONJ analysis of CCONJ denn", () => {
		expect(
			corpus.cases["grammar-de-sconj-provisional-gsd-typo-den"]
				?.idealOutput,
		).toEqual({ decision: "Unresolved", resolution: null });
	});

	test("assembles demonstrations but no held-out or corpus-only probes", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("<TARGET>weil</TARGET>");
		expect(prompt).toContain("<TARGET>wie</TARGET>");
		expect(prompt).toContain("<TARGET>obwol</TARGET>");
		expect(prompt).toContain("<TARGET>da</TARGET>");
		expect(prompt).not.toContain("<TARGET>nachdem</TARGET>");
		expect(prompt).not.toContain("<TARGET>so dass</TARGET>");
		expect(prompt).not.toContain("<TARGET>daß</TARGET>");
		expect(prompt).not.toContain("<TARGET>att</TARGET>");
	});
});

describe("Lexeme/SCONJ pure diagnostic evaluator", () => {
	test("passes every pinned ideal output", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const testCase = evaluation.cases[index];
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result =
				evaluateSubordinatingConjunctionGrammaticalResolution({
					caseId,
					input: testCase.input,
					idealOutput: testCase.idealOutput,
					output: testCase.idealOutput,
				});
			expect(result.contractPass).toBe(true);
			expect(Object.values(result).every(Boolean)).toBe(true);
		}
	});

	test("reports comparative-feature and normalization misses independently", () => {
		const testCase =
			corpus.cases["grammar-de-sconj-comparative-als-clause"];
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
					normalizedSurface: "wie",
				},
				lemma: {
					...testCase.idealOutput.resolution.lemma,
					coreFeatures: { conjType: null },
				},
			},
		});
		const result = evaluateSubordinatingConjunctionGrammaticalResolution({
			caseId: "grammar-de-sconj-comparative-als-clause",
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
		const testCase = corpus.cases["grammar-de-sconj-complement-dass"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null
		) {
			throw new Error("Missing dass fixture.");
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
		const result = evaluateSubordinatingConjunctionGrammaticalResolution({
			caseId: "grammar-de-sconj-complement-dass",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(true);
		expect(result.surfaceFeaturesPass).toBe(true);
	});
});
