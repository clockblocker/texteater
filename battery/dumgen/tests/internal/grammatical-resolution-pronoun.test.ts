import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	evaluation,
	pronounGrammaticalResolutionExperiment,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-pronoun/evaluation-suite";
import { evaluatePronounGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-pronoun/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/pronoun/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/pronoun/prompt-source";
import { outputSchema } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/pronoun/schemas";

const expectedEvaluationIds = [
	"grammar-de-pron-sentence-initial-es",
	"grammar-de-pron-personal-feminine-sie",
	"grammar-de-pron-personal-plural-sie",
	"grammar-de-pron-personal-wir",
	"grammar-de-pron-formal-sie",
	"grammar-de-pron-formal-ihnen",
	"grammar-de-pron-reflexive-sich",
	"grammar-de-pron-nonreflexive-mich",
	"grammar-de-pron-reflexive-mich",
	"grammar-de-pron-indefinite-jemanden",
	"grammar-de-pron-indefinite-etwas",
	"grammar-de-pron-negative-niemandem",
	"grammar-de-pron-negative-nichts",
	"grammar-de-pron-reciprocal-einander",
	"grammar-de-pron-variant-nix",
	"grammar-de-pron-typo-ihc",
	"grammar-de-pron-unresolved-adverb-etwas",
	"grammar-de-pron-unresolved-nominalized-ich",
	"grammar-de-pron-unresolved-overbroad-mit-ihm",
	"grammar-de-pron-unresolved-repeated-sie",
	"grammar-de-pron-unresolved-unrelated-targets",
] as const;

describe("Lexeme/PRON route-local corpus", () => {
	test("keeps four minimized demonstrations, 21 authoritative cases, and 11 corpus-only cases", () => {
		expect(corpus.all().ids).toHaveLength(36);
		expect(demonstrations.ids).toEqual([
			"grammar-de-pron-citation-man",
			"grammar-de-pron-inflection-dative-ihm",
			"grammar-de-pron-unresolved-determiner-jener",
			"grammar-de-pron-unresolved-numeral-zwei",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation).toBe(
			pronounGrammaticalResolutionExperiment.evaluation,
		);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(corpus.all().ids.some((id) => id.includes("-demo-"))).toBe(
			false,
		);
		expect(Object.keys(corpus.collections)).toEqual([
			"personalAndPoliteness",
			"reflexiveAndReciprocal",
			"indefiniteAndNegative",
			"orthographyAndSurface",
			"boundaries",
			"policyProbes",
		]);

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
		expect(promptSource.route).toBe(
			"grammatical-resolution/de/lexeme/pronoun",
		);
		const selectedIds = new Set([...demonstrations.ids, ...evaluation.ids]);
		const corpusOnlyIds = corpus
			.all()
			.ids.filter((caseId) => !selectedIds.has(caseId));
		expect(corpusOnlyIds).toHaveLength(11);
		for (const caseId of [
			"grammar-de-pron-unresolved-adjective-schnell",
			"grammar-de-pron-unresolved-determiner-dieser",
			"grammar-de-pron-unresolved-numeral-eins",
		]) {
			expect(corpusOnlyIds).toContain(caseId);
		}

		for (const [demonstrationId, corpusOnlyId, contaminationKey] of [
			[
				"grammar-de-pron-unresolved-determiner-jener",
				"grammar-de-pron-unresolved-determiner-dieser",
				"de-pron-route-boundary:standalone-determiner",
			],
			[
				"grammar-de-pron-unresolved-numeral-zwei",
				"grammar-de-pron-unresolved-numeral-eins",
				"de-pron-route-boundary:standalone-cardinal",
			],
		] as const) {
			expect(corpus.cases[demonstrationId]?.contaminationKeys).toContain(
				contaminationKey,
			);
			expect(corpus.cases[corpusOnlyId]?.contaminationKeys).toContain(
				contaminationKey,
			);
			expect(demonstrations.ids).toContain(demonstrationId);
			expect(evaluation.ids).not.toContain(corpusOnlyId);
		}
		const demonstrationContaminationKeys = new Set(
			demonstrations.cases.flatMap(
				(testCase) => testCase.contaminationKeys ?? [],
			),
		);
		expect(
			evaluation.cases.flatMap((testCase) =>
				(testCase.contaminationKeys ?? []).filter((key) =>
					demonstrationContaminationKeys.has(key),
				),
			),
		).toEqual([]);
		const reflexTwinKeys = new Set(
			corpus.cases["grammar-de-pron-reflexive-mich"]?.contaminationKeys,
		);
		expect(
			(
				corpus.cases["grammar-de-pron-nonreflexive-mich"]
					?.contaminationKeys ?? []
			).some((key) => reflexTwinKeys.has(key)),
		).toBe(true);
	});

	test("assembles only the four demonstrations and explicit route policy", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("<TARGET>man</TARGET>");
		expect(prompt).toContain("<TARGET>ihm</TARGET>");
		expect(prompt).toContain("<TARGET>Jener</TARGET>");
		expect(prompt).toContain("<TARGET>zwei</TARGET>");
		expect(prompt).not.toContain("<TARGET>schnell</TARGET>");
		expect(prompt).not.toContain("<TARGET>Dieser</TARGET>");
		expect(prompt).not.toContain("<TARGET>eins</TARGET>");
		expect(prompt).not.toContain("<TARGET>Sie</TARGET>");
		expect(prompt).not.toContain("<TARGET>einander</TARGET>");
		expect(prompt).not.toContain("<TARGET>Wer</TARGET>");
		expect(prompt).not.toContain("<TARGET>'s</TARGET>");
		expect(prompt).toContain("DET/PRON boundary is lexical");
		expect(prompt).toContain("count the literal opening <TARGET> tags");
		expect(prompt).toContain(
			"Every resolved PRON Lemma requires a non-null pronType",
		);
		expect(prompt).toContain("never widen Neg to the broader Ind class");
		expect(prompt).toContain(
			"schema forbids an all-null inflectionalFeatures object",
		);
		expect(prompt).toContain("memberOrthographies value must be Typo");
		expect(prompt).toContain("requires a combined PronType value");
		expect(prompt).toContain("Reflex is a contextual Surface feature");
		expect(prompt).toContain("formal second-person address paradigm");
		expect(prompt).not.toMatch(/\b(?:Sie|Ihnen)\b/u);
		expect(prompt).not.toMatch(
			/\b(?:es|wir|sich|mich|jemanden?|etwas|niemand(?:em)?|nichts|einander|nix|dieser|eins|ich|der|wer|was)\b/iu,
		);
	});

	test("keeps all eight uncertain policies outside demonstrations and scoring", () => {
		for (const caseId of [
			"grammar-de-pron-provisional-dem-rel-der",
			"grammar-de-pron-provisional-int-rel-wer",
			"grammar-de-pron-provisional-extpos-was",
			"grammar-de-pron-provisional-informal-polite-du",
			"grammar-de-pron-provisional-native-poss-meiner",
			"grammar-de-pron-provisional-foreign-it",
			"grammar-de-pron-provisional-total-all",
			"grammar-de-pron-provisional-clitic-s",
		]) {
			expect(corpus.cases[caseId]).toBeDefined();
			expect(demonstrations.ids).not.toContain(caseId);
			expect(evaluation.ids).not.toContain(caseId);
		}
	});

	test("pins formal address, contextual Reflex, and invariant Citation identity", () => {
		expect(
			corpus.cases["grammar-de-pron-formal-sie"]?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: {
					normalizedSurface: "Sie",
					inflectionalFeatures: { case: "Nom", number: null },
				},
				lemma: {
					canonicalForm: "Sie",
					coreFeatures: {
						person: "2",
						polite: "Form",
						pronType: "Prs",
					},
				},
			},
		});
		expect(
			corpus.cases["grammar-de-pron-nonreflexive-mich"]?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: { inflectionalFeatures: { reflex: null } },
				lemma: { canonicalForm: "ich" },
			},
		});
		expect(
			corpus.cases["grammar-de-pron-reflexive-mich"]?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: { inflectionalFeatures: { reflex: "Yes" } },
				lemma: { canonicalForm: "ich" },
			},
		});
		expect(
			corpus.cases["grammar-de-pron-variant-nix"]?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: {
					normalizedSurface: "nix",
					spelling: "Variant",
					surfaceKind: "Citation",
				},
				lemma: { canonicalForm: "nichts" },
			},
		});
		for (const caseId of [
			"grammar-de-pron-indefinite-etwas",
			"grammar-de-pron-negative-nichts",
			"grammar-de-pron-reciprocal-einander",
			"grammar-de-pron-variant-nix",
		] as const) {
			const testCase = corpus.cases[caseId];
			expect(testCase?.idealOutput.resolution?.surface.surfaceKind).toBe(
				"Citation",
			);
			expect(
				testCase?.idealOutput.resolution?.surface,
			).not.toHaveProperty("inflectionalFeatures");
		}
	});

	test("derives strict minimal Dumling Citation and Inflection DTOs", () => {
		const citationCase = corpus.cases["grammar-de-pron-citation-man"];
		const inflectionCase = corpus.cases["grammar-de-pron-formal-ihnen"];
		if (
			citationCase === undefined ||
			citationCase.idealOutput.resolution === null ||
			inflectionCase === undefined ||
			inflectionCase.idealOutput.resolution === null
		) {
			throw new Error("Missing PRON fixtures.");
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
							case: "Nom",
							gender: null,
							number: "Sing",
							reflex: null,
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

describe("Lexeme/PRON diagnostic evaluator", () => {
	test("passes every pinned ideal output exactly", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const testCase = evaluation.cases[index];
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result = evaluatePronounGrammaticalResolution({
				caseId,
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: testCase.idealOutput,
			});
			expect(result.contractPass).toBe(true);
			expect(Object.values(result).every(Boolean)).toBe(true);
		}
	});

	test("reports contextual Reflex and stable PronType misses independently", () => {
		const testCase = corpus.cases["grammar-de-pron-reflexive-mich"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null
		) {
			throw new Error("Missing reflexive fixture.");
		}
		const wrongReflex = outputSchema.parse({
			...testCase.idealOutput,
			resolution: {
				...testCase.idealOutput.resolution,
				surface: {
					...testCase.idealOutput.resolution.surface,
					inflectionalFeatures: {
						case: "Acc",
						gender: null,
						number: "Sing",
						reflex: null,
					},
				},
			},
		});
		const result = evaluatePronounGrammaticalResolution({
			caseId: "grammar-de-pron-reflexive-mich",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output: wrongReflex,
		});
		expect(result.contractPass).toBe(false);
		expect(result.inflectionalFeaturesPass).toBe(false);
		expect(result.canonicalFormPass).toBe(true);
		expect(result.coreFeaturesPass).toBe(true);
	});

	test("canonicalizes a null-only Surface Feature bag", () => {
		const testCase = corpus.cases["grammar-de-pron-personal-wir"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null
		) {
			throw new Error("Missing personal fixture.");
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
		expect(
			evaluatePronounGrammaticalResolution({
				caseId: "grammar-de-pron-personal-wir",
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output,
			}).surfaceFeaturesPass,
		).toBe(true);
	});
});
