import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	adpositionGrammaticalResolutionAcceptanceExperiment,
	adpositionGrammaticalResolutionExperiment,
	developmentEvaluation,
	untouchedAcceptanceEvaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-adposition/evaluation-suite";
import { evaluateAdpositionGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-adposition/evaluator";
import { corpus } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/adposition/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/adposition/prompt-source";
import { outputSchema } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/adposition/schemas";

const expectedDevelopmentIds = [
	"grammar-de-adp-dev-prep-durch-acc",
	"grammar-de-adp-dev-prep-zu-dat",
	"grammar-de-adp-dev-two-way-vor-acc",
	"grammar-de-adp-dev-post-zuliebe-dat",
	"grammar-de-adp-dev-prep-seit-dat",
	"grammar-de-adp-dev-wegen-local-dat-lexical-gen",
	"grammar-de-adp-dev-circ-um-willen",
	"grammar-de-adp-dev-circ-an-vorbei",
	"grammar-de-adp-dev-post-gegenueber-dat",
	"grammar-de-adp-dev-extpos-sconj-anstatt",
	"grammar-de-adp-dev-foreign-versus-acc",
	"grammar-de-adp-dev-prep-entlang-gen",
	"grammar-de-adp-dev-adp-before-unmarked-particle",
	"grammar-de-adp-dev-adp-beside-governed-verb-member",
	"grammar-de-adp-dev-adp-beside-fusion",
	"grammar-de-adp-dev-adp-beside-sconj",
	"grammar-de-adp-dev-sentence-initial-wegen",
	"grammar-de-adp-dev-casing-typo-unter",
	"grammar-de-adp-dev-lexical-typo-gegen",
	"grammar-de-adp-dev-abbreviation-inkl",
	"grammar-de-adp-dev-variant-auf-grund",
] as const;

const expectedAcceptanceIds = [
	"grammar-de-adp-accept-prep-fuer-acc",
	"grammar-de-adp-accept-prep-aus-dat",
	"grammar-de-adp-accept-prep-waehrend-gen",
	"grammar-de-adp-accept-two-way-zwischen-dat",
	"grammar-de-adp-accept-post-wegen-gen",
	"grammar-de-adp-accept-circ-von-aus",
	"grammar-de-adp-accept-circ-ueber-hinaus",
	"grammar-de-adp-accept-post-gemaess-dat",
	"grammar-de-adp-accept-alternating-dank",
	"grammar-de-adp-accept-prep-bis-acc",
	"grammar-de-adp-accept-typo-ohhne",
	"grammar-de-adp-accept-archaic-behufs",
] as const;

describe("Lexeme/ADP route-local corpus", () => {
	test("pins 39 flat cases in three pairwise-disjoint partitions", () => {
		expect(corpus.all().ids).toHaveLength(39);
		expect(demonstrations.ids).toEqual([
			"grammar-de-adp-demo-prep-mit-dat",
			"grammar-de-adp-demo-two-way-auf",
			"grammar-de-adp-demo-post-entlang-acc",
			"grammar-de-adp-demo-circ-von-an",
			"grammar-de-adp-demo-typo-one",
			"grammar-de-adp-demo-archaic-ob",
		]);
		expect(developmentEvaluation.ids).toEqual(expectedDevelopmentIds);
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
		).toHaveLength(39);
		expect(adpositionGrammaticalResolutionExperiment.evaluation).toBe(
			developmentEvaluation,
		);
		expect(
			adpositionGrammaticalResolutionAcceptanceExperiment.evaluation,
		).toBe(untouchedAcceptanceEvaluation);

		for (const goldenCase of Object.values(corpus.cases)) {
			expect(Object.keys(goldenCase.input).sort()).toEqual([
				"markedContext",
				"members",
			]);
			expect(Object.keys(goldenCase.idealOutput).sort()).toEqual([
				"lemma",
				"memberOrthographies",
				"normalizedMembers",
				"surface",
			]);
			expect(Object.keys(goldenCase.idealOutput.surface).sort()).toEqual([
				"spelling",
				"surfaceFeatures",
			]);
			expect(goldenCase.idealOutput).not.toHaveProperty("decision");
			expect(goldenCase.idealOutput).not.toHaveProperty("resolution");
			expect(goldenCase.idealOutput).not.toHaveProperty(
				"realizationCoverage",
			);
		}
	});

	test("assembles total fixed-route guidance and only six demonstrations", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("already-classified German Lexeme/ADP");
		expect(prompt).toContain("operation is total");
		expect(prompt).toContain("Every occurrence has a Citation Surface");
		expect(prompt).toContain("von ... an");
		expect(prompt).toContain("<TARGET>one</TARGET>");
		expect(prompt).toContain("<TARGET>Ob</TARGET>");
		expect(prompt).not.toContain("<TARGET>durch</TARGET> den Park");
		expect(prompt).not.toContain("<TARGET>Behufs</TARGET>");
	});

	test("keeps app-owned and legacy fields outside the model DTO", () => {
		const fixture = corpus.cases["grammar-de-adp-dev-prep-durch-acc"];
		if (fixture === undefined) throw new Error("Missing durch fixture.");
		expect(
			outputSchema.safeParse({
				...fixture.idealOutput,
				decision: "Resolved",
				resolution: fixture.idealOutput,
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				...fixture.idealOutput,
				realizationCoverage: "Full",
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				...fixture.idealOutput,
				surface: {
					...fixture.idealOutput.surface,
					surfaceKind: "Citation",
				},
			}).success,
		).toBe(false);
	});
});

describe("Lexeme/ADP diagnostic evaluator", () => {
	test("passes every development and untouched acceptance oracle", () => {
		for (const selection of [
			developmentEvaluation,
			untouchedAcceptanceEvaluation,
		]) {
			for (const [index, caseId] of selection.ids.entries()) {
				const goldenCase = selection.cases[index];
				if (goldenCase === undefined)
					throw new Error(`Missing ${caseId}.`);
				const result = evaluateAdpositionGrammaticalResolution({
					caseId,
					input: goldenCase.input,
					idealOutput: goldenCase.idealOutput,
					output: goldenCase.idealOutput,
				});
				expect(Object.values(result).every(Boolean)).toBe(true);
			}
		}
	});

	test("reports a governed-case miss without weakening flat exact scoring", () => {
		const goldenCase = corpus.cases["grammar-de-adp-dev-prep-durch-acc"];
		if (goldenCase === undefined) throw new Error("Missing durch fixture.");
		const output = outputSchema.parse({
			...goldenCase.idealOutput,
			lemma: {
				...goldenCase.idealOutput.lemma,
				coreFeatures: {
					...goldenCase.idealOutput.lemma.coreFeatures,
					governedCase: "Gen",
				},
			},
		});
		const result = evaluateAdpositionGrammaticalResolution({
			caseId: "grammar-de-adp-dev-prep-durch-acc",
			input: goldenCase.input,
			idealOutput: goldenCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(false);
		expect(result.coreFeaturesPass).toBe(false);
		expect(result.normalizedSurfacePass).toBe(true);
		expect(result.canonicalFormPass).toBe(true);
	});

	test("normalizes a null-only feature bag and checks multi-member count", () => {
		const ordinary = corpus.cases["grammar-de-adp-dev-prep-durch-acc"];
		const circumposition =
			corpus.cases["grammar-de-adp-dev-circ-um-willen"];
		if (ordinary === undefined || circumposition === undefined) {
			throw new Error("Missing ADP fixtures.");
		}
		const nullBagOutput = outputSchema.parse({
			...ordinary.idealOutput,
			surface: {
				...ordinary.idealOutput.surface,
				surfaceFeatures: { historicalStatus: null },
			},
		});
		expect(
			evaluateAdpositionGrammaticalResolution({
				caseId: "grammar-de-adp-dev-prep-durch-acc",
				input: ordinary.input,
				idealOutput: ordinary.idealOutput,
				output: nullBagOutput,
			}).contractPass,
		).toBe(true);

		const wrongCount = outputSchema.parse({
			...circumposition.idealOutput,
			memberOrthographies: ["Standard"],
			normalizedMembers: ["um"],
		});
		const result = evaluateAdpositionGrammaticalResolution({
			caseId: "grammar-de-adp-dev-circ-um-willen",
			input: circumposition.input,
			idealOutput: circumposition.idealOutput,
			output: wrongCount,
		});
		expect(result.contractPass).toBe(false);
		expect(result.memberCountPass).toBe(false);
	});
});
