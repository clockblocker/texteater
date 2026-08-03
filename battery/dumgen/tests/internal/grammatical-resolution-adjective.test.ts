import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	adjectiveGrammaticalResolutionExperiment,
	evaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-adjective/evaluation-suite";
import { evaluateAdjectiveGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-adjective/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/adjective/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/adjective/prompt-source";
import { outputSchema } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/adjective/schemas";

const expectedEvaluationIds = [
	"grammar-de-adj-attributive-acc-fem-rot",
	"grammar-de-adj-attributive-dat-neut-kalt",
	"grammar-de-adj-attributive-gen-plur-neu",
	"grammar-de-adj-predicative-blau",
	"grammar-de-adj-adverbial-leise",
	"grammar-de-adj-participial-geschlossen",
	"grammar-de-adj-irregular-comparative-besser",
	"grammar-de-adj-attributive-comparative-teuer",
	"grammar-de-adj-attributive-superlative-hoch",
	"grammar-de-adj-adverbial-superlative-sorgfaeltig",
	"grammar-de-adj-ordinal-erste",
	"grammar-de-adj-typo-grsser",
	"grammar-de-adj-unresolved-lexical-adverb",
	"grammar-de-adj-unresolved-perfect-participle",
	"grammar-de-adj-unresolved-overbroad-modifier",
	"grammar-de-adj-unresolved-repeated-surfaces",
	"grammar-de-adj-unresolved-unrelated-targets",
] as const;

describe("Lexeme/ADJ route-local corpus", () => {
	test("keeps two shape demonstrations and 17 authoritative held-out cases", () => {
		expect(corpus.all().ids).toHaveLength(26);
		expect(demonstrations.ids).toEqual([
			"grammar-de-adj-citation-sanft",
			"grammar-de-adj-attributive-nom-masc-klein",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation).toBe(
			adjectiveGrammaticalResolutionExperiment.evaluation,
		);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(evaluation.ids).toHaveLength(17);
		expect(corpus.all().ids.some((id) => id.includes("-demo-"))).toBe(
			false,
		);
		expect(Object.keys(corpus.collections)).toEqual([
			"surfaceKinds",
			"agreementAndPosition",
			"comparison",
			"orthography",
			"boundaries",
			"featurePolicy",
		]);

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

	test("assembles only demonstrations and explicit route policy", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("<TARGET>kleine</TARGET>");
		expect(prompt).toContain("<TARGET>sanft</TARGET>");
		expect(prompt).not.toContain("<TARGET>schnell</TARGET>");
		expect(prompt).not.toContain("<TARGET>besser</TARGET>");
		expect(prompt).not.toContain("<TARGET>freundlcih</TARGET>");
		expect(prompt).not.toContain("<TARGET>gesungen</TARGET>");
		expect(prompt).not.toContain("<TARGET>rote</TARGET>");
		expect(prompt).not.toContain("<TARGET>möglich</TARGET>");
		expect(prompt).not.toContain("<TARGET>geschlossene</TARGET>");
		expect(prompt).toContain("predicative and adverbial uses");
		expect(prompt).toContain("Degree is Pos");
		expect(prompt).toContain("syncretic plural adjective Surface");
		expect(prompt).toContain("ordinal adjective Lemmas use numType");
		expect(prompt).toContain("repeated occurrences");
	});

	test("keeps four unsettled Core Feature probes corpus-only", () => {
		for (const caseId of [
			"grammar-de-adj-provisional-short-moeglich",
			"grammar-de-adj-provisional-card-siebenhundert",
			"grammar-de-adj-provisional-foreign-cool",
			"grammar-de-adj-provisional-abbreviation-sog",
		]) {
			expect(corpus.cases[caseId]).toBeDefined();
			expect(demonstrations.ids).not.toContain(caseId);
			expect(evaluation.ids).not.toContain(caseId);
		}
	});

	test("marks known semantic twins while keeping them out of demonstrations", () => {
		const twinPairs = [
			[
				"grammar-de-adj-adverbial-schnell",
				"grammar-de-adj-adverbial-leise",
			],
			[
				"grammar-de-adj-unresolved-perfect-participle-gesungen",
				"grammar-de-adj-unresolved-perfect-participle",
			],
			["grammar-de-adj-typo-freundlcih", "grammar-de-adj-typo-grsser"],
		] as const;
		for (const [left, right] of twinPairs) {
			const leftKeys = corpus.cases[left]?.contaminationKeys ?? [];
			const rightKeys = new Set(
				corpus.cases[right]?.contaminationKeys ?? [],
			);
			expect(leftKeys.some((key) => rightKeys.has(key))).toBe(true);
			expect(demonstrations.ids).not.toContain(left);
			expect(demonstrations.ids).not.toContain(right);
		}
	});

	test("pins agreement, uninflected position, degree, and ordinal identity", () => {
		expect(
			corpus.cases["grammar-de-adj-attributive-acc-fem-rot"]?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: {
					inflectionalFeatures: {
						case: "Acc",
						degree: "Pos",
						gender: "Fem",
						number: "Sing",
					},
				},
			},
		});
		expect(
			corpus.cases["grammar-de-adj-predicative-blau"]?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: {
					inflectionalFeatures: {
						case: null,
						degree: "Pos",
						gender: null,
						number: null,
					},
				},
			},
		});
		expect(
			corpus.cases["grammar-de-adj-ordinal-erste"]?.idealOutput,
		).toMatchObject({
			resolution: { lemma: { coreFeatures: { numType: "Ord" } } },
		});
		expect(
			corpus.cases["grammar-de-adj-participial-geschlossen"]?.idealOutput,
		).toMatchObject({
			decision: "Resolved",
			resolution: {
				surface: {
					inflectionalFeatures: {
						case: "Nom",
						degree: "Pos",
						gender: "Fem",
						number: "Sing",
					},
				},
				lemma: { canonicalForm: "geschlossen" },
			},
		});
		expect(
			corpus.cases["grammar-de-adj-irregular-comparative-besser"]
				?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: { inflectionalFeatures: { degree: "Cmp" } },
				lemma: { canonicalForm: "gut" },
			},
		});
	});

	test("derives minimal Dumling DTOs and distinguishes Citation from Inflection", () => {
		const citationCase = corpus.cases["grammar-de-adj-citation-sanft"];
		const inflectionCase = corpus.cases["grammar-de-adj-predicative-blau"];
		if (
			citationCase === undefined ||
			citationCase.idealOutput.resolution === null ||
			inflectionCase === undefined ||
			inflectionCase.idealOutput.resolution === null
		) {
			throw new Error("Missing ADJ fixtures.");
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
						inflectionalFeatures: {
							case: null,
							degree: "Pos",
							gender: null,
							number: null,
						},
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
});

describe("Lexeme/ADJ diagnostic evaluator", () => {
	test("passes every pinned ideal output exactly", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const testCase = evaluation.cases[index];
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result = evaluateAdjectiveGrammaticalResolution({
				caseId,
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: testCase.idealOutput,
			});
			expect(result.contractPass).toBe(true);
			expect(Object.values(result).every(Boolean)).toBe(true);
		}
	});

	test("reports agreement and degree misses independently", () => {
		const testCase =
			corpus.cases["grammar-de-adj-attributive-comparative-teuer"];
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
					inflectionalFeatures: {
						case: "Nom",
						degree: "Pos",
						gender: "Neut",
						number: "Sing",
					},
				},
			},
		});
		const result = evaluateAdjectiveGrammaticalResolution({
			caseId: "grammar-de-adj-attributive-comparative-teuer",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(false);
		expect(result.inflectionalFeaturesPass).toBe(false);
		expect(result.canonicalFormPass).toBe(true);
		expect(result.coreFeaturesPass).toBe(true);
	});

	test("normalizes a null-only Surface Feature bag for exact scoring", () => {
		const testCase = corpus.cases["grammar-de-adj-predicative-blau"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null
		) {
			throw new Error("Missing predicative fixture.");
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
		const result = evaluateAdjectiveGrammaticalResolution({
			caseId: "grammar-de-adj-predicative-blau",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(true);
		expect(result.surfaceFeaturesPass).toBe(true);
	});
});
