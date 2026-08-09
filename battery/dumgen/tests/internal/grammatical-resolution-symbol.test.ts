import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	evaluation,
	symbolGrammaticalResolutionExperiment,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-symbol/evaluation-suite";
import { evaluateSymbolGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-symbol/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/symbol/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/symbol/prompt-source";
import {
	modelCitationSurfaceSchema,
	modelInflectionalFeaturesSchema,
	modelInflectionSurfaceSchema,
	modelLemmaSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/symbol/schemas";

const expectedEvaluationIds = [
	"grammar-de-sym-equals-equation",
	"grammar-de-sym-slash-per",
	"grammar-de-sym-plus-operator",
	"grammar-de-sym-ampersand-symbolic-coordinator",
	"grammar-de-sym-euro-currency",
	"grammar-de-sym-degree-unit",
	"grammar-de-sym-asterisk-birth",
	"grammar-de-sym-emoticon-smile",
	"grammar-de-sym-emoji-smile",
	"grammar-de-sym-hashtag-sign",
	"grammar-de-sym-letter-x-multiplication",
	"grammar-de-sym-middle-dot-dative",
	"grammar-de-sym-unresolved-numeral-seven",
	"grammar-de-sym-unresolved-noun-prozent",
	"grammar-de-sym-unresolved-proper-name-plus",
	"grammar-de-sym-unresolved-function-word-und",
	"grammar-de-sym-unresolved-overbroad-emoji-punctuation",
	"grammar-de-sym-unresolved-two-symbol-occurrences",
] as const;

describe("Lexeme/SYM exact model contract", () => {
	test("derives only the fixed route Core fields", () => {
		const lemma = {
			canonicalForm: "%",
			coreFeatures: { foreign: null, numType: null },
		};
		expect(modelLemmaSchema.parse(lemma)).toEqual(lemma);
		expect(
			modelLemmaSchema.safeParse({
				...lemma,
				language: "de",
				family: "Lexeme",
				kind: "SYM",
			}).success,
		).toBe(false);
		expect(
			modelLemmaSchema.safeParse({
				...lemma,
				coreFeatures: { foreign: null, numType: "Ord" },
			}).success,
		).toBe(false);
	});

	test("supports Citation and structurally non-empty Inflection Surfaces", () => {
		const citation = {
			spelling: "Canonical" as const,
			surfaceKind: "Citation" as const,
			surfaceFeatures: null,
		};
		expect(modelCitationSurfaceSchema.parse(citation)).toEqual(citation);
		expect(
			modelInflectionalFeaturesSchema.safeParse({
				case: null,
				gender: null,
				number: null,
			}).success,
		).toBe(false);
		const inflection = {
			...citation,
			surfaceKind: "Inflection" as const,
			inflectionalFeatures: {
				case: "Nom" as const,
				gender: "Neut" as const,
				number: "Sing" as const,
			},
		};
		expect(modelInflectionSurfaceSchema.parse(inflection)).toEqual(
			inflection,
		);
	});
});

describe("Lexeme/SYM Golden Corpus", () => {
	test("pins role-neutral IDs, four demonstrations, and 18 held-out cases", () => {
		expect(corpus.all().ids).toHaveLength(29);
		expect(demonstrations.ids).toEqual([
			"grammar-de-sym-percent-unit-citation",
			"grammar-de-sym-times-nominal-inflection",
			"grammar-de-sym-punctuation-comma",
			"grammar-de-sym-overbroad-five-percent",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation).toBe(
			symbolGrammaticalResolutionExperiment.evaluation,
		);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(evaluation.ids).toHaveLength(18);
		expect(demonstrations.union(evaluation).ids).toHaveLength(22);
		expect(corpus.all().ids.some((id) => /-(?:demo|eval)-/u.test(id))).toBe(
			false,
		);
		expect(evaluation.ids).not.toContain(
			"grammar-de-sym-provisional-cardinal-percent",
		);
		expect(evaluation.ids).not.toContain(
			"grammar-de-sym-unresolved-name-ampersand",
		);
		expect(evaluation.ids).not.toContain(
			"grammar-de-sym-unresolved-period",
		);
		expect(evaluation.ids).not.toContain(
			"grammar-de-sym-unresolved-exclamation",
		);
	});

	test("contamination-links sentence-punctuation semantic twins", () => {
		for (const caseId of [
			"grammar-de-sym-punctuation-comma",
			"grammar-de-sym-unresolved-period",
			"grammar-de-sym-unresolved-exclamation",
		] as const) {
			expect(corpus.cases[caseId]?.contaminationKeys).toContain(
				"de-sym-boundary:sentence-punctuation",
			);
		}
	});

	test("keeps unsupported middle-dot gender null", () => {
		const output =
			corpus.cases["grammar-de-sym-middle-dot-dative"]?.idealOutput;
		if (output?.resolution === null || output === undefined) {
			throw new Error("Missing resolved middle-dot case.");
		}
		const surface = output.resolution.surface;
		if (surface.surfaceKind !== "Inflection") {
			throw new Error("Expected an Inflection Surface.");
		}
		expect(surface.inflectionalFeatures).toEqual({
			case: "Dat",
			gender: null,
			number: "Sing",
		});
	});

	test("assembles only demonstrations and explicit route policy", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("80 <TARGET>%</TARGET> Ladezustand");
		expect(prompt).toContain("Ein einziges <TARGET>×</TARGET>");
		expect(prompt).toContain("Brot<TARGET>,</TARGET>");
		expect(prompt).toContain("<TARGET>5 %</TARGET>");
		expect(prompt).toContain("German GSD attests no\nSYM NumType");
		expect(prompt).not.toContain("a <TARGET>=</TARGET> b");
		expect(prompt).not.toContain("<TARGET>😀</TARGET>");
		expect(prompt).not.toContain("Disney<TARGET>+</TARGET>");
	});
});

describe("Lexeme/SYM diagnostic evaluator", () => {
	test("passes every pinned ideal output exactly", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const testCase = evaluation.cases[index];
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result = evaluateSymbolGrammaticalResolution({
				caseId,
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: testCase.idealOutput,
			});
			expect(result.contractPass).toBe(true);
			expect(Object.values(result).every(Boolean)).toBe(true);
		}
	});

	test("diagnoses Core and Inflection misses independently", () => {
		const testCase = corpus.cases["grammar-de-sym-middle-dot-dative"];
		if (
			testCase?.idealOutput.resolution === null ||
			testCase === undefined
		) {
			throw new Error("Missing resolved middle-dot case.");
		}
		const expectedSurface = testCase.idealOutput.resolution.surface;
		if (expectedSurface.surfaceKind !== "Inflection") {
			throw new Error("Expected an Inflection Surface.");
		}
		const output = {
			...testCase.idealOutput,
			resolution: {
				...testCase.idealOutput.resolution,
				surface: {
					...expectedSurface,
					inflectionalFeatures: {
						case: "Nom" as const,
						gender: "Neut" as const,
						number: "Sing" as const,
					},
				},
				lemma: {
					...testCase.idealOutput.resolution.lemma,
					coreFeatures: { foreign: "Yes" as const, numType: null },
				},
			},
		};
		const result = evaluateSymbolGrammaticalResolution({
			caseId: "grammar-de-sym-middle-dot-dative",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(false);
		expect(result.inflectionalFeaturesPass).toBe(false);
		expect(result.coreFeaturesPass).toBe(false);
		expect(result.decisionPass).toBe(true);
	});
});
