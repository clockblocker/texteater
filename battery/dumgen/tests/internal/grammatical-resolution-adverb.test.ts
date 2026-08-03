import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	adverbGrammaticalResolutionExperiment,
	evaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-adverb/evaluation-suite";
import { evaluateAdverbGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-adverb/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/adverb/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/adverb/prompt-source";
import { outputSchema } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/adverb/schemas";

const expectedEvaluationIds = [
	"grammar-de-adv-morgen",
	"grammar-de-adv-demonstrative-damit",
	"grammar-de-adv-comparative-oefter",
	"grammar-de-adv-demonstrative-dort",
	"grammar-de-adv-interrogative-warum",
	"grammar-de-adv-negative-keineswegs",
	"grammar-de-adv-multiplicative-zweimal",
	"grammar-de-adv-causal-deshalb",
	"grammar-de-adv-sentence-initial-vielleicht",
	"grammar-de-adv-typo-vielleich",
	"grammar-de-adv-unresolved-attributive-adjective",
	"grammar-de-adv-unresolved-modal-particle-doch",
	"grammar-de-adv-unresolved-subordinating-conjunction",
	"grammar-de-adv-unresolved-overbroad-target",
	"grammar-de-adv-unresolved-two-unrelated-targets",
] as const;

describe("Lexeme/ADV route-local corpus", () => {
	test("keeps nine necessary demonstrations and 15 authoritative held-out cases", () => {
		expect(corpus.all().ids).toHaveLength(32);
		expect(demonstrations.ids).toEqual([
			"grammar-de-adv-demo-contextual-heute",
			"grammar-de-adv-demo-citation-hier",
			"grammar-de-adv-demo-demonstrative-dazu",
			"grammar-de-adv-demo-indefinite-genug",
			"grammar-de-adv-demo-negative-nie",
			"grammar-de-adv-demo-comparative-lieber",
			"grammar-de-adv-demo-superlative-am-liebsten",
			"grammar-de-adv-demo-typo-gester",
			"grammar-de-adv-demo-unresolved-adverbial-adjective",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation).toBe(
			adverbGrammaticalResolutionExperiment.evaluation,
		);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(evaluation.ids).toHaveLength(15);
		expect(demonstrations.union(evaluation).ids).toHaveLength(24);

		const demonstrationLemmas = new Set(
			demonstrations.cases.flatMap((testCase) =>
				testCase.idealOutput.resolution === null
					? []
					: [testCase.idealOutput.resolution.lemma.canonicalForm],
			),
		);
		const leaked = evaluation.cases.flatMap((testCase) =>
			testCase.idealOutput.resolution !== null &&
			demonstrationLemmas.has(
				testCase.idealOutput.resolution.lemma.canonicalForm,
			)
				? [testCase.idealOutput.resolution.lemma.canonicalForm]
				: [],
		);
		expect(leaked).toEqual([]);
	});

	test("assembles demonstrations while keeping held-out and provisional cases hidden", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("<TARGET>heute</TARGET>");
		expect(prompt).toContain("Wörterbucheintrag: <TARGET>hier</TARGET>");
		expect(prompt).toContain(
			"<TARGET>Dazu</TARGET> brauchen wir mehr Zeit",
		);
		expect(prompt).toContain("<TARGET>genug</TARGET> gearbeitet");
		expect(prompt).toContain("<TARGET>nie</TARGET> zu spät");
		expect(prompt).toContain("<TARGET>lieber</TARGET>");
		expect(prompt).toContain(
			"<TARGET>am</TARGET> <TARGET>liebsten</TARGET>",
		);
		expect(prompt).toContain("<TARGET>gester</TARGET>");
		expect(prompt).toContain("Hund läuft <TARGET>schnell</TARGET>");
		expect(prompt).not.toContain("<TARGET>öfter</TARGET>");
		expect(prompt).not.toContain(
			"<TARGET>Damit</TARGET> öffnen wir die Tür",
		);
		expect(prompt).not.toContain("<TARGET>etwas</TARGET> besser");
		expect(prompt).not.toContain("<TARGET>keineswegs</TARGET> sicher");
		expect(prompt).not.toContain("<TARGET>allhier</TARGET>");
		expect(prompt).not.toContain("<TARGET>circa</TARGET>");
		expect(prompt).not.toContain("<TARGET>Erstens</TARGET>");
		expect(prompt).not.toContain("arbeitet <TARGET>viel</TARGET>");
		expect(prompt).not.toContain("<TARGET>da</TARGET> nichts");
		expect(prompt).toContain("verb-second matrix clause");
		expect(prompt).toContain("finite verb is clause-final");
		expect(prompt).toContain("nullable does not mean optional");
		expect(prompt).toContain("n-mal forms such as zweimal");
		expect(prompt).toContain("target is overbroad");
		expect(prompt).toContain(
			"return Unresolved rather than guessing one Lemma",
		);
	});

	test("keeps unresolved policy tensions corpus-only without changing their oracles", () => {
		expect(
			corpus.cases["grammar-de-adv-superlative-am-haeufigsten"]
				?.idealOutput,
		).toEqual({ decision: "Unresolved", resolution: null });
		expect(
			corpus.cases["grammar-de-adv-interrogative-identity-wo"]?.input,
		).toEqual({
			markedContext:
				"Das ist die Stadt, <TARGET>wo</TARGET> ihre Familie lebt.",
		});
		expect(corpus.cases["grammar-de-adv-indefinite-etwas"]?.input).toEqual({
			markedContext:
				"Der zweite Entwurf ist <TARGET>etwas</TARGET> besser.",
		});
		for (const caseId of [
			"grammar-de-adv-superlative-am-haeufigsten",
			"grammar-de-adv-interrogative-identity-wo",
			"grammar-de-adv-indefinite-etwas",
		]) {
			expect(corpus.cases[caseId]).toBeDefined();
			expect(demonstrations.ids).not.toContain(caseId);
			expect(evaluation.ids).not.toContain(caseId);
		}
	});

	test("pins reviewed German UD adverb PronType identity", () => {
		const expectPronType = (caseId: string, pronType: string | null) => {
			expect(corpus.cases[caseId]?.idealOutput).toMatchObject({
				resolution: { lemma: { coreFeatures: { pronType } } },
			});
		};

		expectPronType("grammar-de-adv-demo-citation-hier", null);
		expectPronType("grammar-de-adv-demo-demonstrative-dazu", "Dem");
		expectPronType("grammar-de-adv-demo-indefinite-genug", "Ind");
		expectPronType("grammar-de-adv-demo-negative-nie", "Neg");
		expectPronType("grammar-de-adv-demonstrative-dort", null);
		expectPronType("grammar-de-adv-demonstrative-damit", "Dem");
		expectPronType("grammar-de-adv-interrogative-identity-wo", "Int");
		expectPronType("grammar-de-adv-indefinite-etwas", "Ind");
		expectPronType("grammar-de-adv-negative-keineswegs", "Neg");
	});

	test("derives a minimal DTO and distinguishes Citation from Inflection", () => {
		const citationCase = corpus.cases["grammar-de-adv-demo-citation-hier"];
		const inflectionCase =
			corpus.cases["grammar-de-adv-comparative-oefter"];
		if (
			citationCase?.idealOutput.resolution === null ||
			citationCase === undefined ||
			inflectionCase?.idealOutput.resolution === null ||
			inflectionCase === undefined
		) {
			throw new Error("Missing ADV fixtures.");
		}
		expect(
			outputSchema.safeParse({
				...citationCase.idealOutput,
				resolution: {
					...citationCase.idealOutput.resolution,
					lemma: {
						...citationCase.idealOutput.resolution.lemma,
						language: "de",
					},
				},
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				...citationCase.idealOutput,
				resolution: {
					...citationCase.idealOutput.resolution,
					surface: {
						...citationCase.idealOutput.resolution.surface,
						inflectionalFeatures: { degree: null },
					},
				},
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				...inflectionCase.idealOutput,
				resolution: {
					...inflectionCase.idealOutput.resolution,
					surface: {
						...inflectionCase.idealOutput.resolution.surface,
						inflectionalFeatures: undefined,
					},
				},
			}).success,
		).toBe(false);
	});

	test("accepts Structured Outputs' null-only feature bag", () => {
		const fixture = corpus.cases["grammar-de-adv-morgen"];
		if (fixture?.idealOutput.resolution === null || fixture === undefined) {
			throw new Error("Missing ADV fixture.");
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

describe("Lexeme/ADV diagnostic evaluator", () => {
	test("passes every pinned ideal output exactly", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const testCase = evaluation.cases[index];
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result = evaluateAdverbGrammaticalResolution({
				caseId,
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: testCase.idealOutput,
			});
			expect(result.contractPass).toBe(true);
			expect(Object.values(result).every(Boolean)).toBe(true);
		}
	});

	test("reports a degree miss without weakening independent fields", () => {
		const testCase = corpus.cases["grammar-de-adv-comparative-oefter"];
		if (
			testCase?.idealOutput.resolution === null ||
			testCase === undefined
		) {
			throw new Error("Missing comparative fixture.");
		}
		const output = outputSchema.parse({
			...testCase.idealOutput,
			resolution: {
				...testCase.idealOutput.resolution,
				surface: {
					...testCase.idealOutput.resolution.surface,
					inflectionalFeatures: { degree: "Pos" },
				},
			},
		});
		const result = evaluateAdverbGrammaticalResolution({
			caseId: "grammar-de-adv-comparative-oefter",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(false);
		expect(result.inflectionalFeaturesPass).toBe(false);
		expect(result.canonicalFormPass).toBe(true);
		expect(result.coreFeaturesPass).toBe(true);
	});

	test("normalizes a null-only model feature bag for exact scoring", () => {
		const testCase = corpus.cases["grammar-de-adv-morgen"];
		if (
			testCase?.idealOutput.resolution === null ||
			testCase === undefined
		) {
			throw new Error("Missing ADV fixture.");
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
		const result = evaluateAdverbGrammaticalResolution({
			caseId: "grammar-de-adv-morgen",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(true);
		expect(result.surfaceFeaturesPass).toBe(true);
	});
});
