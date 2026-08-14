import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	determinerGrammaticalResolutionAcceptanceExperiment,
	determinerGrammaticalResolutionExperiment,
	developmentEvaluation,
	untouchedAcceptanceEvaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-determiner/evaluation-suite";
import { evaluateDeterminerGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-determiner/evaluator";
import { corpus } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/determiner/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/determiner/prompt-source";
import {
	inputSchema,
	modelCitationSurfaceSchema,
	modelInflectionSurfaceSchema,
	modelLemmaSchema,
	outputSchema,
} from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/determiner/schemas";

const expectedDemonstrationIds = [
	"grammar-de-det-demo-definite-article-der",
	"grammar-de-det-demo-possessive-meinem",
	"grammar-de-det-demo-feminine-article-die",
	"grammar-de-det-demo-uninflected-derlei",
	"grammar-de-det-demo-variant-ne",
	"grammar-de-det-demo-standalone-jener",
	"grammar-de-det-demo-paradigm-welche",
	"grammar-de-det-demo-paradigm-manchem",
	"grammar-de-det-demo-quoted-archaic-etwelche",
] as const;

const expectedAcceptanceIds = [
	"grammar-de-det-accept-v4-definite-des",
	"grammar-de-det-accept-v4-indefinite-ein",
	"grammar-de-det-accept-v4-demonstrative-jenem",
	"grammar-de-det-accept-v4-interrogative-welches",
	"grammar-de-det-accept-v4-negative-keinen",
	"grammar-de-det-accept-v4-total-jeder",
	"grammar-de-det-accept-v4-possessive-deinem",
	"grammar-de-det-accept-v4-formal-ihrem",
	"grammar-de-det-accept-v4-indefinite-manches",
	"grammar-de-det-accept-v4-typo-disem",
	"grammar-de-det-accept-v4-variant-n",
	"grammar-de-det-accept-v4-archaic-etwelches",
] as const;

describe("Lexeme/DET route-local migration", () => {
	test("uses exact input and the smallest total flat codec-derived DTO", () => {
		expect(
			inputSchema.parse({
				markedContext: "<TARGET>Der</TARGET> Hund schläft.",
				members: ["Der"],
			}),
		).toEqual({
			markedContext: "<TARGET>Der</TARGET> Hund schläft.",
			members: ["Der"],
		});
		expect(() =>
			inputSchema.parse({
				markedContext: "<TARGET>Der</TARGET> Hund schläft.",
				members: ["Hund"],
			}),
		).toThrow(/members must exactly match/);

		const modelFixture =
			corpus.cases["grammar-de-det-demo-definite-article-der"];
		const citationFixture =
			corpus.cases["grammar-de-det-demo-uninflected-derlei"];
		if (modelFixture === undefined || citationFixture === undefined) {
			throw new Error("Expected DET demonstration fixtures.");
		}
		const modelOutput = modelFixture.idealOutput;
		expect(outputSchema.parse(modelOutput)).toEqual(modelOutput);
		expect(Object.keys(modelOutput)).toEqual([
			"memberOrthographies",
			"normalizedMembers",
			"surface",
			"lemma",
		]);
		expect(
			outputSchema.safeParse({
				decision: "Resolved",
				resolution: modelOutput,
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				...modelOutput,
				realizationCoverage: "Full",
			}).success,
		).toBe(false);
		expect(() =>
			modelLemmaSchema.parse({ ...modelOutput.lemma, language: "de" }),
		).toThrow();
		expect(
			modelInflectionSurfaceSchema.safeParse(modelOutput.surface).success,
		).toBe(true);
		expect(
			modelCitationSurfaceSchema.safeParse(
				citationFixture.idealOutput.surface,
			).success,
		).toBe(true);
	});

	test("freezes 42 realistic cases into disjoint 9/21/12 partitions", () => {
		expect(corpus.all().ids).toHaveLength(42);
		expect(demonstrations.ids).toHaveLength(9);
		expect(demonstrations.ids).toEqual(expectedDemonstrationIds);
		expect(developmentEvaluation.ids).toHaveLength(21);
		expect(untouchedAcceptanceEvaluation.ids).toHaveLength(12);
		expect(untouchedAcceptanceEvaluation.ids).toEqual(
			expectedAcceptanceIds,
		);
		expect(demonstrations.isDisjointFrom(developmentEvaluation)).toBe(true);
		expect(
			demonstrations.isDisjointFrom(untouchedAcceptanceEvaluation),
		).toBe(true);
		expect(
			developmentEvaluation.isDisjointFrom(untouchedAcceptanceEvaluation),
		).toBe(true);
		expect(
			demonstrations
				.union(developmentEvaluation)
				.union(untouchedAcceptanceEvaluation).ids,
		).toHaveLength(42);
		expect(developmentEvaluation).toBe(
			determinerGrammaticalResolutionExperiment.evaluation,
		);
		expect(untouchedAcceptanceEvaluation).toBe(
			determinerGrammaticalResolutionAcceptanceExperiment.evaluation,
		);

		for (const testCase of corpus.all().cases) {
			const markedMembers = [
				...testCase.input.markedContext.matchAll(
					/<TARGET>([^<>]+)<\/TARGET>/gu,
				),
			].map((match) => match[1]);
			expect(markedMembers).toEqual(testCase.input.members);
			expect(testCase.idealOutput.memberOrthographies).toHaveLength(1);
			expect(testCase.idealOutput.normalizedMembers).toHaveLength(1);
			expect("decision" in testCase.idealOutput).toBe(false);
			expect("realizationCoverage" in testCase.idealOutput).toBe(false);
		}
	});

	test("covers determiner families, codec features, boundaries, and form policy", () => {
		const cases = corpus.all().cases;
		const pronTypes = new Set(
			cases.map(
				(testCase) => testCase.idealOutput.lemma.coreFeatures.pronType,
			),
		);
		for (const value of [
			"Art",
			"Dem",
			"Emp",
			"Exc",
			"Ind",
			"Int",
			"Neg",
			"Prs",
			"Rel",
			"Tot",
		]) {
			expect(pronTypes.has(value as never)).toBe(true);
		}
		for (const key of [
			"definite",
			"extPos",
			"foreign",
			"numType",
			"person",
			"polite",
			"poss",
		] as const) {
			expect(
				cases.some(
					(testCase) =>
						testCase.idealOutput.lemma.coreFeatures[key] !== null,
				),
			).toBe(true);
		}
		expect(
			cases.some(
				(testCase) =>
					testCase.idealOutput.memberOrthographies[0] === "Typo",
			),
		).toBe(true);
		expect(
			cases.some(
				(testCase) =>
					testCase.idealOutput.surface.spelling === "Variant",
			),
		).toBe(true);
		expect(
			cases.some(
				(testCase) =>
					testCase.idealOutput.surface.surfaceFeatures !== null,
			),
		).toBe(true);
		for (const anchor of [
			"not PRON",
			"not ADJ",
			"not ADJ or NUM",
			"not the earlier NUM",
		]) {
			expect(
				cases.some((testCase) =>
					testCase.explanation?.includes(anchor),
				),
			).toBe(true);
		}
	});

	test("assembles total fixed-route policy and scores exact diagnostics", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("already-classified German Lexeme/DET");
		expect(prompt).toContain("Always return one total flat resolution");
		expect(prompt).toContain("members: string[]");
		expect(prompt).toContain("The upstream route is authoritative");
		expect(prompt).toContain("canonicalForm welcher");
		expect(prompt).toContain("canonicalForm mancher");
		expect(prompt).toContain("quoted characters are authoritative");
		expect(prompt).toContain("<TARGET>Welche</TARGET> Nachricht");
		expect(prompt).toContain("<TARGET>manchem</TARGET> Hinweis");
		expect(prompt).toContain("<TARGET>etwelche</TARGET>");
		expect(prompt).toContain("realizationCoverage Full");
		expect(prompt).not.toContain("<TARGET>einen</TARGET> Mantel");
		expect(prompt).not.toContain("<TARGET>Jeglicher</TARGET> Widerspruch");

		const testCase =
			corpus.cases["grammar-de-det-dev-possessive-seinen-masc"];
		if (testCase === undefined)
			throw new Error("Expected DET scored fixture.");
		expect(
			evaluateDeterminerGrammaticalResolution({
				caseId: "grammar-de-det-dev-possessive-seinen-masc",
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: testCase.idealOutput,
			}),
		).toEqual({
			contractPass: true,
			memberCountPass: true,
			memberOrthographiesPass: true,
			surfaceKindPass: true,
			normalizedSurfacePass: true,
			spellingPass: true,
			surfaceFeaturesPass: true,
			inflectionalFeaturesPass: true,
			canonicalFormPass: true,
			coreFeaturesPass: true,
		});
	});
});
