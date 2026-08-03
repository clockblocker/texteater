import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	auxiliaryGrammaticalResolutionExperiment,
	evaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-auxiliary/evaluation-suite";
import { evaluateAuxiliaryGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-auxiliary/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/auxiliary/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/auxiliary/prompt-source";
import { outputSchema } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/auxiliary/schemas";

const expectedEvaluationIds = [
	"grammar-de-aux-perfect-ist-gegangen",
	"grammar-de-aux-perfect-hat-gegessen",
	"grammar-de-aux-copula-ist-alt",
	"grammar-de-aux-perfect-waren-gegangen",
	"grammar-de-aux-subjunctive-waeren-gekommen",
	"grammar-de-aux-participle-gewesen",
	"grammar-de-aux-copular-imperative-sei",
	"grammar-de-aux-infinitive-sein",
	"grammar-de-aux-modal-will-gehen",
	"grammar-de-aux-modal-wollt-gehen",
	"grammar-de-aux-modal-musste-gehen",
	"grammar-de-aux-modal-muessen-plural",
	"grammar-de-aux-modal-wollen-citation",
	"grammar-de-aux-typo-mus",
	"grammar-de-aux-sentence-initial-wollen",
	"grammar-de-aux-repeated-second-mag",
	"grammar-de-aux-unresolved-full-verb-hat",
	"grammar-de-aux-unresolved-full-verb-mag",
	"grammar-de-aux-unresolved-overbroad-will-gehen",
	"grammar-de-aux-unresolved-two-unrelated-targets",
	"grammar-de-aux-unresolved-repeated-same-lemma",
	"grammar-de-aux-unresolved-particle-zu",
] as const;

describe("Lexeme/AUX route-local corpus", () => {
	test("keeps five necessary demonstrations and 22 explicit held-out cases", () => {
		expect(corpus.all().ids).toHaveLength(29);
		expect(demonstrations.ids).toEqual([
			"grammar-de-aux-demo-future-wird",
			"grammar-de-aux-demo-modal-kann",
			"grammar-de-aux-demo-modal-citation-duerfen",
			"grammar-de-aux-demo-typo-sol",
			"grammar-de-aux-demo-unresolved-full-verb-schlaeft",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation).toBe(
			auxiliaryGrammaticalResolutionExperiment.evaluation,
		);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(evaluation.ids).toHaveLength(22);
		expect(demonstrations.union(evaluation).ids).toHaveLength(27);

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

	test("assembles demonstrations while hiding held-out and corpus-only cases", () => {
		const prompt = assembleSystemPrompt(promptSource);

		expect(prompt).toContain("<TARGET>wird</TARGET> morgen abreisen");
		expect(prompt).toContain("<TARGET>kann</TARGET> schwimmen");
		expect(prompt).toContain("Modalauxiliar: <TARGET>dürfen</TARGET>");
		expect(prompt).toContain("<TARGET>sol</TARGET> jetzt gehen");
		expect(prompt).toContain("<TARGET>schläft</TARGET>");
		expect(prompt).toContain("copular sein");
		expect(prompt).not.toContain("<TARGET>ist</TARGET> früh gegangen");
		expect(prompt).not.toContain("<TARGET>hat</TARGET> schon gegessen");
		expect(prompt).not.toContain("<TARGET>gewesen</TARGET>");
		expect(prompt).not.toContain("<TARGET>Sei</TARGET> vorsichtig");
		expect(prompt).not.toContain("<TARGET>wollt</TARGET> heute gehen");
		expect(prompt).not.toContain("<TARGET>möchte</TARGET> gern bleiben");
		expect(prompt).not.toContain("Wetter <TARGET>wird</TARGET> besser");
	});

	test("requires exactly one TARGET even for repeated forms of one Lemma", () => {
		const repeated =
			corpus.cases["grammar-de-aux-unresolved-repeated-same-lemma"];
		expect(repeated?.idealOutput).toEqual({
			decision: "Unresolved",
			resolution: null,
		});
		expect(assembleSystemPrompt(promptSource)).toMatch(
			/more than one\s+TARGET pair/u,
		);
	});

	test("treats only TARGET contents as scope and states German subjunctive tense", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain(
			"Material outside TARGET is grammatical context and evidence",
		);
		expect(prompt).toContain("Copular sein is AUX");
		expect(prompt).toContain("Konjunktiv I has tense Pres");
		expect(prompt).toContain("Konjunktiv II has tense Past");
		expect(
			corpus.cases["grammar-de-aux-participle-gewesen"]?.input
				.markedContext,
		).toBe("Es wäre schön <TARGET>gewesen</TARGET>.");
	});

	test("keeps route and linked fields outside the exact model DTO", () => {
		const fixture = corpus.cases["grammar-de-aux-perfect-ist-gegangen"];
		if (fixture?.idealOutput.resolution === null || fixture === undefined) {
			throw new Error("Missing resolved AUX fixture.");
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

	test("accepts Structured Outputs' null-only feature bag", () => {
		const fixture = corpus.cases["grammar-de-aux-perfect-ist-gegangen"];
		if (fixture?.idealOutput.resolution === null || fixture === undefined) {
			throw new Error("Missing resolved AUX fixture.");
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

	test("uses a structural Fin/Imp/Inf/Part union with required verbForm", () => {
		for (const caseId of [
			"grammar-de-aux-perfect-ist-gegangen",
			"grammar-de-aux-copular-imperative-sei",
			"grammar-de-aux-infinitive-sein",
			"grammar-de-aux-participle-gewesen",
		] as const) {
			const fixture = corpus.cases[caseId];
			expect(outputSchema.safeParse(fixture?.idealOutput).success).toBe(
				true,
			);
		}

		const fixture = corpus.cases["grammar-de-aux-perfect-ist-gegangen"];
		if (fixture?.idealOutput.resolution === null || fixture === undefined) {
			throw new Error("Missing finite AUX fixture.");
		}
		expect(
			outputSchema.safeParse({
				...fixture.idealOutput,
				resolution: {
					...fixture.idealOutput.resolution,
					surface: {
						...fixture.idealOutput.resolution.surface,
						inflectionalFeatures: {
							mood: null,
							number: null,
							person: null,
							tense: null,
							verbForm: null,
							voice: null,
						},
					},
				},
			}).success,
		).toBe(false);
	});
});

describe("Lexeme/AUX diagnostic evaluator", () => {
	test("passes every pinned ideal output exactly", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const testCase = evaluation.cases[index];
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result = evaluateAuxiliaryGrammaticalResolution({
				caseId,
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: testCase.idealOutput,
			});
			expect(result.contractPass).toBe(true);
			expect(Object.values(result).every(Boolean)).toBe(true);
		}
	});

	test("reports an inflection miss without weakening other diagnostics", () => {
		const testCase = corpus.cases["grammar-de-aux-perfect-ist-gegangen"];
		if (
			testCase?.idealOutput.resolution === null ||
			testCase === undefined
		) {
			throw new Error("Missing resolved AUX fixture.");
		}
		const surface = testCase.idealOutput.resolution.surface;
		if (surface.surfaceKind !== "Inflection")
			throw new Error("Expected inflection.");
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
						tense: "Past",
					},
				},
			},
		});
		const result = evaluateAuxiliaryGrammaticalResolution({
			caseId: "grammar-de-aux-perfect-ist-gegangen",
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
		const testCase = corpus.cases["grammar-de-aux-perfect-ist-gegangen"];
		if (
			testCase?.idealOutput.resolution === null ||
			testCase === undefined
		) {
			throw new Error("Missing resolved AUX fixture.");
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
		const result = evaluateAuxiliaryGrammaticalResolution({
			caseId: "grammar-de-aux-perfect-ist-gegangen",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(true);
		expect(result.surfaceFeaturesPass).toBe(true);
	});
});
