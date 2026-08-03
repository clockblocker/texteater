import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	adpositionGrammaticalResolutionExperiment,
	evaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-adposition/evaluation-suite";
import { evaluateAdpositionGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-adposition/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/adposition/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/adposition/prompt-source";
import { outputSchema } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/adposition/schemas";

const expectedEvaluationIds = [
	"grammar-de-adp-preposition-durch-acc",
	"grammar-de-adp-preposition-zu-dat",
	"grammar-de-adp-two-way-vor-acc",
	"grammar-de-adp-abbreviation-inkl",
	"grammar-de-adp-postposition-zuliebe-dat",
	"grammar-de-adp-preposition-seit-dat",
	"grammar-de-adp-citation-label-jenseits",
	"grammar-de-adp-mid-sentence-casing-typo-unter",
	"grammar-de-adp-lexical-typo-gegen",
	"grammar-de-adp-archaic-ob",
	"grammar-de-adp-repeated-second-bei",
	"grammar-de-adp-unresolved-sconj-weil",
	"grammar-de-adp-unresolved-verb-particle-auf",
	"grammar-de-adp-unresolved-fusion-im",
	"grammar-de-adp-unresolved-two-unrelated-targets",
	"grammar-de-adp-unresolved-target-includes-adverb",
	"grammar-de-adp-unresolved-adjective-route",
] as const;

describe("Lexeme/ADP route-local corpus", () => {
	test("keeps seven necessary demonstrations and 17 explicit held-out cases", () => {
		expect(corpus.all().ids).toHaveLength(27);
		expect(demonstrations.ids).toEqual([
			"grammar-de-adp-demo-contextual-mit-citation",
			"grammar-de-adp-demo-two-way-auf",
			"grammar-de-adp-demo-postposition-entlang",
			"grammar-de-adp-demo-sentence-initial-wegen",
			"grammar-de-adp-demo-typo-one",
			"grammar-de-adp-demo-unresolved-overbroad-mit",
			"grammar-de-adp-demo-unresolved-ambiguous-entlang",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation).toBe(
			adpositionGrammaticalResolutionExperiment.evaluation,
		);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(evaluation.ids).toHaveLength(17);
		expect(demonstrations.union(evaluation).ids).toHaveLength(24);

		const demonstrationLemmas = new Set(
			demonstrations.cases.flatMap((testCase) =>
				testCase.idealOutput.resolution === null
					? []
					: [testCase.idealOutput.resolution.lemma.canonicalForm],
			),
		);
		const evaluationLemmas = evaluation.cases.flatMap((testCase) =>
			testCase.idealOutput.resolution === null
				? []
				: [testCase.idealOutput.resolution.lemma.canonicalForm],
		);
		expect(
			evaluationLemmas.filter((lemma) => demonstrationLemmas.has(lemma)),
		).toEqual([]);
	});

	test("assembles demonstrations but keeps held-out and provisional cases hidden", () => {
		const prompt = assembleSystemPrompt(promptSource);

		expect(prompt).toContain("Sie fährt <TARGET>mit</TARGET> dem Bus.");
		expect(prompt).toContain("liegt <TARGET>auf</TARGET> dem Tisch");
		expect(prompt).toContain("Fluss <TARGET>entlang</TARGET>");
		expect(prompt).toContain("<TARGET>Wegen</TARGET> des Sturms");
		expect(prompt).toContain("<TARGET>one</TARGET> Mantel");
		expect(prompt).toContain("<TARGET>mit einem Messer</TARGET>");
		expect(prompt).toContain("Stichwort ohne Kontext");
		expect(prompt).toContain("only Citation Surfaces");
		expect(prompt).not.toContain("<TARGET>durch</TARGET> den Park");
		expect(prompt).not.toContain("Den Kindern <TARGET>zuliebe</TARGET>");
		expect(prompt).not.toContain("<TARGET>Von</TARGET> morgen");
		expect(prompt).not.toContain("<TARGET>Anstatt</TARGET> dass");
		expect(prompt).not.toContain("<TARGET>wegen</TARGET> dem Regen");
	});

	test("keeps fixed route and linked fields outside the model DTO", () => {
		const fixture = corpus.cases["grammar-de-adp-preposition-durch-acc"];
		if (fixture?.idealOutput.resolution === null || fixture === undefined) {
			throw new Error("Missing resolved durch fixture.");
		}
		const resolution = fixture.idealOutput.resolution;

		expect(
			outputSchema.safeParse({
				...fixture.idealOutput,
				resolution: {
					...resolution,
					lemma: { ...resolution.lemma, language: "de" },
				},
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				...fixture.idealOutput,
				resolution: {
					...resolution,
					surface: {
						...resolution.surface,
						language: "de",
						lemma: resolution.lemma,
					},
				},
			}).success,
		).toBe(false);
	});

	test("rejects invented Inflection Surfaces on this Citation-only route", () => {
		const fixture = corpus.cases["grammar-de-adp-preposition-durch-acc"];
		if (fixture?.idealOutput.resolution === null || fixture === undefined) {
			throw new Error("Missing resolved durch fixture.");
		}
		const resolution = fixture.idealOutput.resolution;
		expect(
			outputSchema.safeParse({
				...fixture.idealOutput,
				resolution: {
					...resolution,
					surface: {
						...resolution.surface,
						surfaceKind: "Inflection",
						inflectionalFeatures: {},
					},
				},
			}).success,
		).toBe(false);
	});

	test("accepts the Structured Outputs null-only feature bag", () => {
		const fixture = corpus.cases["grammar-de-adp-preposition-durch-acc"];
		if (fixture?.idealOutput.resolution === null || fixture === undefined) {
			throw new Error("Missing resolved durch fixture.");
		}
		const resolution = fixture.idealOutput.resolution;
		expect(
			outputSchema.safeParse({
				...fixture.idealOutput,
				resolution: {
					...resolution,
					surface: {
						...resolution.surface,
						surfaceFeatures: { historicalStatus: null },
					},
				},
			}).success,
		).toBe(true);
	});
});

describe("Lexeme/ADP diagnostic evaluator", () => {
	test("passes every pinned ideal output exactly", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const testCase = evaluation.cases[index];
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result = evaluateAdpositionGrammaticalResolution({
				caseId,
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: testCase.idealOutput,
			});

			expect(result.contractPass).toBe(true);
			expect(Object.values(result).every(Boolean)).toBe(true);
		}
	});

	test("reports a governed-case miss without weakening other fields", () => {
		const testCase = corpus.cases["grammar-de-adp-preposition-durch-acc"];
		if (
			testCase?.idealOutput.resolution === null ||
			testCase === undefined
		) {
			throw new Error("Missing durch fixture.");
		}
		const coreFeatures = testCase.idealOutput.resolution.lemma
			.coreFeatures as Record<string, unknown>;
		const output = outputSchema.parse({
			...testCase.idealOutput,
			resolution: {
				...testCase.idealOutput.resolution,
				lemma: {
					...testCase.idealOutput.resolution.lemma,
					coreFeatures: {
						...coreFeatures,
						governedCase: "Gen",
					},
				},
			},
		});
		const result = evaluateAdpositionGrammaticalResolution({
			caseId: "grammar-de-adp-preposition-durch-acc",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});

		expect(result.contractPass).toBe(false);
		expect(result.coreFeaturesPass).toBe(false);
		expect(result.normalizedSurfacePass).toBe(true);
		expect(result.canonicalFormPass).toBe(true);
	});

	test("normalizes a null-only model feature bag for exact scoring", () => {
		const testCase = corpus.cases["grammar-de-adp-preposition-durch-acc"];
		if (
			testCase?.idealOutput.resolution === null ||
			testCase === undefined
		) {
			throw new Error("Missing through fixture.");
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
		const result = evaluateAdpositionGrammaticalResolution({
			caseId: "grammar-de-adp-preposition-durch-acc",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});

		expect(result.contractPass).toBe(true);
		expect(result.surfaceFeaturesPass).toBe(true);
	});

	test("requires exact Unresolved/null output and matching marker count", () => {
		const unresolved =
			corpus.cases["grammar-de-adp-unresolved-two-unrelated-targets"];
		const resolved = corpus.cases["grammar-de-adp-preposition-durch-acc"];
		if (
			unresolved === undefined ||
			resolved?.idealOutput.resolution === null ||
			resolved === undefined
		) {
			throw new Error("Missing ADP boundary fixtures.");
		}
		const wrong = evaluateAdpositionGrammaticalResolution({
			caseId: "grammar-de-adp-unresolved-two-unrelated-targets",
			input: unresolved.input,
			idealOutput: unresolved.idealOutput,
			output: resolved.idealOutput,
		});

		expect(wrong.contractPass).toBe(false);
		expect(wrong.decisionPass).toBe(false);
		expect(wrong.memberCountPass).toBe(false);
	});
});
