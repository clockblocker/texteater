import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	evaluation,
	interjectionGrammaticalResolutionExperiment,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-interjection/evaluation-suite";
import { evaluateInterjectionGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-interjection/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/interjection/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/interjection/prompt-source";
import {
	modelCitationSurfaceSchema,
	modelLemmaSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/interjection/schemas";

const expectedEvaluationIds = [
	"grammar-de-intj-wupp-sound-effect",
	"grammar-de-intj-hallo-greeting",
	"grammar-de-intj-hurra-joy",
	"grammar-de-intj-oh-reaction",
	"grammar-de-intj-huch-surprise",
	"grammar-de-intj-au-pain",
	"grammar-de-intj-aeh-hesitation",
	"grammar-de-intj-tja-resignation",
	"grammar-de-intj-miau-sound",
	"grammar-de-intj-nein-response",
	"grammar-de-intj-doch-corrective-response",
	"grammar-de-intj-sentence-initial-ach",
	"grammar-de-intj-typo-huraa",
	"grammar-de-intj-unresolved-modal-particle-ja",
	"grammar-de-intj-unresolved-na-ja-formula",
	"grammar-de-intj-unresolved-nominalized-ach",
	"grammar-de-intj-unresolved-overbroad-formula",
	"grammar-de-intj-unresolved-unrelated-targets",
] as const;

describe("Lexeme/INTJ exact model contract", () => {
	test("derives the minimal Lemma schema with only the fixed route's feature", () => {
		expect(
			modelLemmaSchema.parse({
				canonicalForm: "ja",
				coreFeatures: { partType: "Res" },
			}),
		).toEqual({
			canonicalForm: "ja",
			coreFeatures: { partType: "Res" },
		});
		expect(
			modelLemmaSchema.safeParse({
				language: "de",
				canonicalForm: "ja",
				family: "Lexeme",
				kind: "INTJ",
				coreFeatures: { partType: "Res" },
			}).success,
		).toBe(false);
		expect(
			modelLemmaSchema.safeParse({
				canonicalForm: "ja",
				coreFeatures: { partType: "Inf" },
			}).success,
		).toBe(false);
	});

	test("permits only Citation Surfaces and no inflectional payload", () => {
		const citation = {
			normalizedSurface: "pfui",
			spelling: "Canonical" as const,
			surfaceKind: "Citation" as const,
			surfaceFeatures: null,
		};
		expect(modelCitationSurfaceSchema.parse(citation)).toEqual(citation);
		expect(
			modelCitationSurfaceSchema.safeParse({
				...citation,
				surfaceFeatures: { historicalStatus: null },
			}).success,
		).toBe(false);
		expect(
			modelCitationSurfaceSchema.safeParse({
				...citation,
				surfaceKind: "Inflection",
				inflectionalFeatures: {},
			}).success,
		).toBe(false);
	});
});

describe("Lexeme/INTJ Golden Corpus", () => {
	test("pins five policy demonstrations and 18 disjoint held-out cases", () => {
		expect(corpus.all().ids).toHaveLength(24);
		expect(demonstrations.ids).toEqual([
			"grammar-de-intj-demo-pfui-expressive",
			"grammar-de-intj-demo-ja-response",
			"grammar-de-intj-demo-hmm-variant",
			"grammar-de-intj-demo-o-wei-phraseme-boundary",
			"grammar-de-intj-demo-punctuation-in-target",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation).toBe(
			interjectionGrammaticalResolutionExperiment.evaluation,
		);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(evaluation.ids).toHaveLength(18);
		expect(demonstrations.union(evaluation).ids).toHaveLength(23);
		expect(evaluation.ids).not.toContain("grammar-de-intj-archaic-juchhei");
		expect(corpus.cases["grammar-de-intj-archaic-juchhei"]).toBeDefined();
	});

	test("assembles demonstrations without held-out contamination", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("<TARGET>pfui</TARGET>");
		expect(prompt).toContain("antwortete: „<TARGET>Ja</TARGET>.“");
		expect(prompt).toContain("<TARGET>hmm</TARGET>");
		expect(prompt).toContain("<TARGET>O</TARGET> wei");
		expect(prompt).toContain("<TARGET>pfui!</TARGET>");
		expect(prompt).toContain(
			"German Lexeme/INTJ has Citation Surfaces only",
		);
		expect(prompt).not.toContain("<TARGET>wupp</TARGET>");
		expect(prompt).not.toContain("<TARGET>nein</TARGET>");
		expect(prompt).not.toContain("<TARGET>Ach</TARGET>");
		expect(prompt).not.toContain("<TARGET>huraa</TARGET>");
	});
});

describe("Lexeme/INTJ diagnostic evaluator", () => {
	test("passes every pinned ideal output exactly", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const testCase = evaluation.cases[index];
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result = evaluateInterjectionGrammaticalResolution({
				caseId,
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: testCase.idealOutput,
			});
			expect(result.contractPass).toBe(true);
			expect(Object.values(result).every(Boolean)).toBe(true);
		}
	});

	test("reports exact Core Feature and Surface misses independently", () => {
		const testCase = corpus.cases["grammar-de-intj-nein-response"];
		if (
			testCase?.idealOutput.resolution === null ||
			testCase === undefined
		) {
			throw new Error("Missing resolved nein case.");
		}
		const output = {
			...testCase.idealOutput,
			resolution: {
				...testCase.idealOutput.resolution,
				surface: {
					...testCase.idealOutput.resolution.surface,
					normalizedSurface: "Nein",
				},
				lemma: {
					...testCase.idealOutput.resolution.lemma,
					coreFeatures: { partType: null },
				},
			},
		};
		const result = evaluateInterjectionGrammaticalResolution({
			caseId: "grammar-de-intj-nein-response",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(false);
		expect(result.normalizedSurfacePass).toBe(false);
		expect(result.coreFeaturesPass).toBe(false);
		expect(result.decisionPass).toBe(true);
	});
});
