import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	evaluation,
	numeralGrammaticalResolutionExperiment,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-numeral/evaluation-suite";
import { evaluateNumeralGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-numeral/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/numeral/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/numeral/prompt-source";
import { outputSchema } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/numeral/schemas";

const expectedEvaluationIds = [
	"grammar-de-num-sentence-initial-fuenf",
	"grammar-de-num-digit-42",
	"grammar-de-num-roman-ix",
	"grammar-de-num-year-2024",
	"grammar-de-num-anderthalb",
	"grammar-de-num-citation-hundert",
	"grammar-de-num-unresolved-determiner-beide",
	"grammar-de-num-unresolved-adverb-dreimal",
	"grammar-de-num-unresolved-ordinal-zweiten",
	"grammar-de-num-unresolved-proper-name-ii",
	"grammar-de-num-unresolved-symbol-percent",
	"grammar-de-num-unresolved-multi-token-sechs-billionen",
	"grammar-de-num-unresolved-repeated-acht",
	"grammar-de-num-unresolved-two-unrelated-targets",
	"grammar-de-num-unresolved-adjective-60er",
] as const;

describe("Lexeme/NUM route-local corpus", () => {
	test("keeps four necessary demonstrations and 15 explicit held-out cases", () => {
		expect(corpus.all().ids).toHaveLength(31);
		expect(demonstrations.ids).toEqual([
			"grammar-de-num-word-vier",
			"grammar-de-num-inflected-millionen",
			"grammar-de-num-typo-dreii",
			"grammar-de-num-unresolved-overbroad-zehn-buecher",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation).toBe(
			numeralGrammaticalResolutionExperiment.evaluation,
		);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(evaluation.ids).toHaveLength(15);
		expect(demonstrations.union(evaluation).ids).toHaveLength(19);

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

	test("assembles demonstrations while hiding held-out and policy cases", () => {
		const prompt = assembleSystemPrompt(promptSource);

		expect(prompt).toContain("<TARGET>vier</TARGET> Hefte");
		expect(prompt).toContain("<TARGET>Millionen</TARGET>");
		expect(prompt).toContain("<TARGET>dreii</TARGET>");
		expect(prompt).toContain("<TARGET>zehn Bücher</TARGET>");
		expect(prompt).not.toContain("Auf dem Schild steht <TARGET>7</TARGET>");
		expect(prompt).not.toContain("<TARGET>XIV</TARGET>");
		expect(prompt).not.toContain("<TARGET>dritten</TARGET>");
		expect(prompt).not.toContain("<TARGET>zwei</TARGET> Boote");
		expect(prompt).not.toContain("<TARGET>Milliarden</TARGET>");
		expect(prompt).not.toContain("<TARGET>siebn</TARGET>");
		expect(prompt).not.toContain("Heinrich <TARGET>II</TARGET>");
		expect(prompt).not.toContain("<TARGET>½</TARGET>");
		expect(prompt).not.toContain("<TARGET>10–12</TARGET>");
		expect(prompt).not.toContain("<TARGET>T</TARGET>");
	});

	test("pins route boundaries, one occurrence, and multi-token rejection", () => {
		for (const caseId of [
			"grammar-de-num-unresolved-determiner-beide",
			"grammar-de-num-unresolved-adverb-dreimal",
			"grammar-de-num-unresolved-ordinal-zweiten",
			"grammar-de-num-unresolved-proper-name-ii",
			"grammar-de-num-unresolved-symbol-percent",
			"grammar-de-num-unresolved-multi-token-sechs-billionen",
			"grammar-de-num-unresolved-repeated-acht",
			"grammar-de-num-unresolved-overbroad-neun-haeuser",
		] as const) {
			expect(corpus.cases[caseId]?.idealOutput).toEqual({
				decision: "Unresolved",
				resolution: null,
			});
		}
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("exactly one occurrence");
		expect(prompt).toContain("no NumForm feature");
		expect(prompt).toContain("numType Card");
	});

	test("keeps route and linked fields outside the exact model DTO", () => {
		const fixture = corpus.cases["grammar-de-num-inflected-milliarden"];
		if (fixture?.idealOutput.resolution === null || fixture === undefined) {
			throw new Error("Missing resolved NUM fixture.");
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

	test("uses a structural non-empty NUM inflection union", () => {
		const fixture = corpus.cases["grammar-de-num-inflected-milliarden"];
		if (fixture?.idealOutput.resolution === null || fixture === undefined) {
			throw new Error("Missing inflected NUM fixture.");
		}
		expect(outputSchema.safeParse(fixture.idealOutput).success).toBe(true);
		for (const inflectionalFeatures of [
			{ case: "Dat", gender: null, number: null },
			{ case: null, gender: "Fem", number: null },
			{ case: null, gender: null, number: "Plur" },
		] as const) {
			expect(
				outputSchema.safeParse({
					...fixture.idealOutput,
					resolution: {
						...fixture.idealOutput.resolution,
						surface: {
							...fixture.idealOutput.resolution.surface,
							inflectionalFeatures,
						},
					},
				}).success,
			).toBe(true);
		}
		expect(
			outputSchema.safeParse({
				...fixture.idealOutput,
				resolution: {
					...fixture.idealOutput.resolution,
					surface: {
						...fixture.idealOutput.resolution.surface,
						inflectionalFeatures: {
							case: null,
							gender: null,
							number: null,
						},
					},
				},
			}).success,
		).toBe(false);
	});

	test("accepts Structured Outputs' null-only surface feature bag", () => {
		const fixture = corpus.cases["grammar-de-num-word-zwei"];
		if (fixture?.idealOutput.resolution === null || fixture === undefined) {
			throw new Error("Missing resolved NUM fixture.");
		}
		expect(
			outputSchema.safeParse({
				...fixture.idealOutput,
				resolution: {
					...fixture.idealOutput.resolution,
					surface: {
						...fixture.idealOutput.resolution.surface,
						surfaceFeatures: { historicalStatus: null },
					},
				},
			}).success,
		).toBe(true);
	});
});

describe("Lexeme/NUM diagnostic evaluator", () => {
	test("passes every pinned ideal output exactly", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const testCase = evaluation.cases[index];
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result = evaluateNumeralGrammaticalResolution({
				caseId,
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: testCase.idealOutput,
			});
			expect(result.contractPass).toBe(true);
			expect(Object.values(result).every(Boolean)).toBe(true);
		}
	});

	test("reports an agreement miss without weakening other diagnostics", () => {
		const testCase = corpus.cases["grammar-de-num-inflected-milliarden"];
		if (
			testCase?.idealOutput.resolution === null ||
			testCase === undefined
		) {
			throw new Error("Missing resolved NUM fixture.");
		}
		const surface = testCase.idealOutput.resolution.surface;
		if (surface.surfaceKind !== "Inflection") {
			throw new Error("Expected NUM inflection.");
		}
		const inflectionalFeatures = surface.inflectionalFeatures as Record<
			string,
			unknown
		>;
		const output = outputSchema.parse({
			...testCase.idealOutput,
			resolution: {
				...testCase.idealOutput.resolution,
				surface: {
					...surface,
					inflectionalFeatures: {
						...inflectionalFeatures,
						number: "Sing",
					},
				},
			},
		});
		const result = evaluateNumeralGrammaticalResolution({
			caseId: "grammar-de-num-inflected-milliarden",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(false);
		expect(result.inflectionalFeaturesPass).toBe(false);
		expect(result.canonicalFormPass).toBe(true);
		expect(result.coreFeaturesPass).toBe(true);
	});

	test("normalizes a null-only feature bag for exact scoring", () => {
		const testCase = corpus.cases["grammar-de-num-word-zwei"];
		if (
			testCase?.idealOutput.resolution === null ||
			testCase === undefined
		) {
			throw new Error("Missing resolved NUM fixture.");
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
		const result = evaluateNumeralGrammaticalResolution({
			caseId: "grammar-de-num-word-zwei",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(true);
		expect(result.surfaceFeaturesPass).toBe(true);
	});
});
