import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	discourseFormulaGrammaticalResolutionExperiment,
	evaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-discourse-formula/evaluation-suite";
import { evaluateDiscourseFormulaGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-discourse-formula/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/discourse-formula/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/discourse-formula/prompt-source";
import {
	modelCitationSurfaceSchema,
	modelLemmaSchema,
	outputSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/discourse-formula/schemas";

const expectedEvaluationIds = [
	"grammar-de-discourse-formula-auf-wiedersehen",
	"grammar-de-discourse-formula-vielen-dank",
	"grammar-de-discourse-formula-gern-geschehen",
	"grammar-de-discourse-formula-auf-keinen-fall",
	"grammar-de-discourse-formula-auf-jeden-fall",
	"grammar-de-discourse-formula-darf-ich-bitten",
	"grammar-de-discourse-formula-dann-wollen-wir-mal",
	"grammar-de-discourse-formula-bis-bald",
	"grammar-de-discourse-formula-besten-dank",
	"grammar-de-discourse-formula-herzlich-wilkommen-typo",
	"grammar-de-discourse-formula-unresolved-compositional-request",
	"grammar-de-discourse-formula-unresolved-collocation",
	"grammar-de-discourse-formula-unresolved-idiom",
	"grammar-de-discourse-formula-unresolved-proverb",
	"grammar-de-discourse-formula-unresolved-arbitrary-quote",
	"grammar-de-discourse-formula-unresolved-partial-formula",
	"grammar-de-discourse-formula-unresolved-overbroad-punctuation",
	"grammar-de-discourse-formula-unresolved-repeated-occurrence",
	"grammar-de-discourse-formula-unresolved-unrelated-targets",
	"grammar-de-discourse-formula-unresolved-bitte-intj",
] as const;

describe("Phraseme/DiscourseFormula exact model contract", () => {
	test("derives the scalar Core Feature and Citation-only Surface", () => {
		const lemma = {
			canonicalForm: "auf wiedersehen",
			coreFeatures: { discourseFormulaRole: "Farewell" as const },
		};
		expect(modelLemmaSchema.parse(lemma)).toEqual(lemma);
		expect(
			modelLemmaSchema.safeParse({
				...lemma,
				language: "de",
				family: "Phraseme",
				kind: "DiscourseFormula",
			}).success,
		).toBe(false);
		expect(
			modelLemmaSchema.safeParse({
				canonicalForm: "bitte schön",
				coreFeatures: {
					discourseFormulaRole: ["Request", "Acknowledgment"],
				},
			}).success,
		).toBe(false);
		expect(
			modelLemmaSchema.parse({
				canonicalForm: "bitte schön",
				coreFeatures: { discourseFormulaRole: null },
			}),
		).toBeDefined();

		const citation = {
			normalizedSurface: "auf Wiedersehen",
			spelling: "Canonical" as const,
			realizationCoverage: "Full" as const,
			surfaceKind: "Citation" as const,
			surfaceFeatures: null,
		};
		expect(modelCitationSurfaceSchema.parse(citation)).toEqual(citation);
		expect(
			modelCitationSurfaceSchema.safeParse({
				...citation,
				surfaceKind: "Inflection",
				inflectionalFeatures: {},
			}).success,
		).toBe(false);
	});
});

describe("Phraseme/DiscourseFormula Golden Corpus", () => {
	test("pins 4 minimized demonstrations, 20 held-outs, and 5 corpus-only probes", () => {
		expect(corpus.all().ids).toHaveLength(29);
		expect(demonstrations.ids).toEqual([
			"grammar-de-discourse-formula-guten-morgen",
			"grammar-de-discourse-formula-tut-mir-leid",
			"grammar-de-discourse-formula-wie-dem-auch-sei",
			"grammar-de-discourse-formula-unresolved-danke-intj",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation).toBe(
			discourseFormulaGrammaticalResolutionExperiment.evaluation,
		);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(demonstrations.union(evaluation).ids).toHaveLength(24);
		expect(corpus.all().ids.some((id) => /-(?:demo|eval)-/u.test(id))).toBe(
			false,
		);
		expect(Object.keys(corpus.collections)).toEqual([
			"formulas",
			"orthography",
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
	});

	test("covers every scalar role and keeps policy tensions unscored", () => {
		const roles = demonstrations
			.union(evaluation)
			.cases.flatMap((testCase) => {
				const role =
					testCase.idealOutput.resolution?.lemma.coreFeatures
						.discourseFormulaRole;
				return role === null || role === undefined ? [] : [role];
			});
		const expectedRoles: string[] = [
			"Acknowledgment",
			"Apology",
			"Farewell",
			"Greeting",
			"Initiation",
			"Reaction",
			"Refusal",
			"Request",
			"Thanks",
			"Transition",
		];
		expect([...new Set<string>(roles)].sort()).toEqual(
			expectedRoles.sort(),
		);

		const corpusOnlyIds = corpus
			.all()
			.ids.filter(
				(id) =>
					!demonstrations.ids.includes(id as never) &&
					!evaluation.ids.includes(id as never),
			);
		expect(corpusOnlyIds).toHaveLength(5);
		for (const id of [
			"grammar-de-discourse-formula-provisional-bitte-schoen-acknowledgment",
			"grammar-de-discourse-formula-provisional-bitte-schoen-request",
			"grammar-de-discourse-formula-provisional-aphorism-zeit-ist-geld",
			"grammar-de-discourse-formula-provisional-auf-keinen-fall-adverbial",
			"grammar-de-discourse-formula-provisional-guten-morgen-all-caps",
		]) {
			expect(corpusOnlyIds).toContain(id);
		}
		expect(
			corpus.cases[
				"grammar-de-discourse-formula-provisional-bitte-schoen-acknowledgment"
			]?.contaminationKeys,
		).toEqual(["de-discourse-formula:bitte-schoen-polyfunction"]);
		expect(
			corpus.cases[
				"grammar-de-discourse-formula-provisional-bitte-schoen-request"
			]?.contaminationKeys,
		).toEqual(["de-discourse-formula:bitte-schoen-polyfunction"]);
	});

	test("assembles only demonstrations and explicit scalar-role policy", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain(
			"<TARGET>Guten</TARGET> <TARGET>Morgen</TARGET>",
		);
		expect(prompt).toContain("<TARGET>Tut</TARGET> <TARGET>mir</TARGET>");
		expect(prompt).toContain("<TARGET>Wie</TARGET> <TARGET>dem</TARGET>");
		expect(prompt).toContain("<TARGET>Danke</TARGET>");
		expect(prompt).not.toContain(
			"<TARGET>Auf</TARGET> <TARGET>Wiedersehen</TARGET>",
		);
		expect(prompt).not.toContain(
			"<TARGET>Bitte</TARGET> <TARGET>schön</TARGET>",
		);
		expect(prompt).toMatch(
			/Choose one\s+scalar role enacted by this occurrence/u,
		);
		expect(prompt).toContain("Citation Surfaces only");
		expect(prompt).toContain("single-word interjection");
	});

	test("pins member-level typo attribution and strict decision payloads", () => {
		expect(
			corpus.cases["grammar-de-discourse-formula-herzlich-wilkommen-typo"]
				?.idealOutput,
		).toMatchObject({
			resolution: {
				memberOrthographies: ["Standard", "Typo"],
				surface: { normalizedSurface: "herzlich willkommen" },
				lemma: {
					canonicalForm: "herzlich willkommen",
					coreFeatures: { discourseFormulaRole: "Greeting" },
				},
			},
		});
		expect(
			outputSchema.safeParse({ decision: "Unresolved", resolution: {} })
				.success,
		).toBe(false);
	});
});

describe("Phraseme/DiscourseFormula diagnostic evaluator", () => {
	test("passes every held-out ideal and separates role, member, and canonical misses", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const testCase = evaluation.cases[index];
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result = evaluateDiscourseFormulaGrammaticalResolution({
				caseId,
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: testCase.idealOutput,
			});
			expect(result.contractPass).toBe(true);
			expect(Object.values(result).every(Boolean)).toBe(true);
		}

		const testCase =
			corpus.cases["grammar-de-discourse-formula-vielen-dank"];
		if (
			testCase?.idealOutput.resolution === null ||
			testCase === undefined
		) {
			throw new Error("Missing resolved Vielen Dank case.");
		}
		const result = evaluateDiscourseFormulaGrammaticalResolution({
			caseId: "grammar-de-discourse-formula-vielen-dank",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output: {
				...testCase.idealOutput,
				resolution: {
					...testCase.idealOutput.resolution,
					memberOrthographies: ["Standard"],
					lemma: {
						canonicalForm: "viel dank",
						coreFeatures: { discourseFormulaRole: "Reaction" },
					},
				},
			},
		});
		expect(result.contractPass).toBe(false);
		expect(result.memberCountPass).toBe(false);
		expect(result.memberOrthographiesPass).toBe(false);
		expect(result.canonicalFormPass).toBe(false);
		expect(result.coreFeaturesPass).toBe(false);
		expect(result.decisionPass).toBe(true);
	});
});
