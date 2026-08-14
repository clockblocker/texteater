import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	developmentEvaluation,
	pronounGrammaticalResolutionAcceptanceExperiment,
	pronounGrammaticalResolutionExperiment,
	untouchedAcceptanceEvaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-pronoun/evaluation-suite";
import { evaluatePronounGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-pronoun/evaluator";
import { corpus } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/pronoun/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/pronoun/prompt-source";
import { outputSchema } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/pronoun/schemas";

const expectedDevelopmentIds = [
	"grammar-de-pron-dev-personal-ich",
	"grammar-de-pron-dev-personal-sie-fem",
	"grammar-de-pron-dev-personal-sie-plur-acc",
	"grammar-de-pron-dev-personal-euch",
	"grammar-de-pron-dev-formal-sie-nom",
	"grammar-de-pron-dev-reflexive-mich",
	"grammar-de-pron-dev-nonreflexive-mich",
	"grammar-de-pron-dev-reciprocal-einander",
	"grammar-de-pron-dev-inherent-reflexive-sich",
	"grammar-de-pron-dev-demonstrative-das-nom",
	"grammar-de-pron-dev-relative-die-nom",
	"grammar-de-pron-dev-interrogative-wer-nom",
	"grammar-de-pron-dev-indefinite-jemandem",
	"grammar-de-pron-dev-negative-niemanden",
	"grammar-de-pron-dev-total-foreign-all",
	"grammar-de-pron-dev-extpos-was",
	"grammar-de-pron-dev-poss-meiner",
	"grammar-de-pron-dev-contraction-s",
	"grammar-de-pron-dev-typo-ihc",
	"grammar-de-pron-dev-archaic-euer",
	"grammar-de-pron-dev-formal-lowercase-typo",
] as const;

const expectedAcceptanceIds = [
	"grammar-de-pron-accept-v4-personal-dir-dat",
	"grammar-de-pron-accept-v4-personal-wir-nom",
	"grammar-de-pron-accept-v4-formal-ihnen-dat",
	"grammar-de-pron-accept-v4-reflexive-euch-acc",
	"grammar-de-pron-accept-v4-demonstrative-die-nom-plur",
	"grammar-de-pron-accept-v4-relative-dem-dat-neut",
	"grammar-de-pron-accept-v4-interrogative-wem-dat",
	"grammar-de-pron-accept-v4-indefinite-irgendjemandem-dat",
	"grammar-de-pron-accept-v4-negative-niemanden-acc",
	"grammar-de-pron-accept-v4-reciprocal-einander",
	"grammar-de-pron-accept-v4-negative-nichts",
	"grammar-de-pron-accept-v4-foreign-he",
] as const;

describe("Lexeme/PRON route-local corpus", () => {
	test("pins 39 flat cases in three pairwise-disjoint partitions", () => {
		expect(corpus.all().ids).toHaveLength(39);
		expect(demonstrations.ids).toEqual([
			"grammar-de-pron-demo-personal-ihm",
			"grammar-de-pron-demo-formal-ihnen",
			"grammar-de-pron-demo-reflexive-sich",
			"grammar-de-pron-demo-relative-der",
			"grammar-de-pron-demo-indefinite-etwas",
			"grammar-de-pron-demo-variant-nix",
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
		expect(pronounGrammaticalResolutionExperiment.evaluation).toBe(
			developmentEvaluation,
		);
		expect(
			pronounGrammaticalResolutionAcceptanceExperiment.evaluation,
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
			expect(goldenCase.idealOutput).not.toHaveProperty("decision");
			expect(goldenCase.idealOutput).not.toHaveProperty("resolution");
			expect(goldenCase.idealOutput).not.toHaveProperty(
				"realizationCoverage",
			);
			expect(goldenCase.idealOutput).not.toHaveProperty(
				"normalizedSurface",
			);
		}
	});

	test("assembles total fixed-route policy and only six demonstrations", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("already-classified German Lexeme/PRON");
		expect(prompt).toContain("operation is total");
		expect(prompt).toContain("one scalar pronType");
		expect(prompt).toContain("inherently reflexive verb");
		expect(prompt).toContain("<TARGET>ihm</TARGET>");
		expect(prompt).toContain("<TARGET>Ihnen</TARGET>");
		expect(prompt).toContain("<TARGET>der</TARGET>");
		expect(prompt).toContain("<TARGET>nix</TARGET>");
		expect(prompt).not.toContain("<TARGET>jemandem</TARGET>");
		expect(prompt).not.toContain("<TARGET>He</TARGET>");
		expect(prompt).not.toContain('"decision":"Unresolved"');
	});

	test("keeps app-owned and legacy fields outside the model DTO", () => {
		const fixture = corpus.cases["grammar-de-pron-dev-personal-ich"];
		if (fixture === undefined) throw new Error("Missing ich fixture.");
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
					normalizedSurface: "ich",
				},
			}).success,
		).toBe(false);
	});

	test("covers every codec PronType and specialized Core Feature", () => {
		const coreFeatures = Object.values(corpus.cases).map(
			(goldenCase) => goldenCase.idealOutput.lemma.coreFeatures,
		);
		expect(new Set(coreFeatures.map(({ pronType }) => pronType))).toEqual(
			new Set(["Dem", "Ind", "Int", "Neg", "Prs", "Rcp", "Rel", "Tot"]),
		);
		expect(coreFeatures.some(({ extPos }) => extPos === "DET")).toBe(true);
		expect(coreFeatures.some(({ foreign }) => foreign === "Yes")).toBe(
			true,
		);
		expect(coreFeatures.some(({ polite }) => polite === "Form")).toBe(true);
		expect(coreFeatures.some(({ polite }) => polite === "Infm")).toBe(true);
		expect(coreFeatures.some(({ poss }) => poss === "Yes")).toBe(true);
	});
});

describe("Lexeme/PRON diagnostic evaluator", () => {
	test("passes every development and untouched acceptance oracle", () => {
		for (const selection of [
			developmentEvaluation,
			untouchedAcceptanceEvaluation,
		]) {
			for (const [index, caseId] of selection.ids.entries()) {
				const goldenCase = selection.cases[index];
				if (goldenCase === undefined)
					throw new Error(`Missing ${caseId}.`);
				const result = evaluatePronounGrammaticalResolution({
					caseId,
					input: goldenCase.input,
					idealOutput: goldenCase.idealOutput,
					output: goldenCase.idealOutput,
				});
				expect(Object.values(result).every(Boolean)).toBe(true);
			}
		}
	});

	test("reports a reflex miss without weakening flat exact scoring", () => {
		const goldenCase = corpus.cases["grammar-de-pron-dev-reflexive-mich"];
		if (goldenCase === undefined) throw new Error("Missing mich fixture.");
		if (goldenCase.idealOutput.surface.surfaceKind !== "Inflection") {
			throw new Error("Expected an Inflection fixture.");
		}
		const output = outputSchema.parse({
			...goldenCase.idealOutput,
			surface: {
				...goldenCase.idealOutput.surface,
				inflectionalFeatures: {
					...goldenCase.idealOutput.surface.inflectionalFeatures,
					reflex: null,
				},
			},
		});
		const result = evaluatePronounGrammaticalResolution({
			caseId: "grammar-de-pron-dev-reflexive-mich",
			input: goldenCase.input,
			idealOutput: goldenCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(false);
		expect(result.inflectionalFeaturesPass).toBe(false);
		expect(result.coreFeaturesPass).toBe(true);
		expect(result.canonicalFormPass).toBe(true);
	});

	test("canonicalizes a null-only Surface Feature bag", () => {
		const goldenCase = corpus.cases["grammar-de-pron-dev-personal-ich"];
		if (goldenCase === undefined) throw new Error("Missing ich fixture.");
		const output = outputSchema.parse({
			...goldenCase.idealOutput,
			surface: {
				...goldenCase.idealOutput.surface,
				surfaceFeatures: { historicalStatus: null },
			},
		});
		expect(
			evaluatePronounGrammaticalResolution({
				caseId: "grammar-de-pron-dev-personal-ich",
				input: goldenCase.input,
				idealOutput: goldenCase.idealOutput,
				output,
			}).contractPass,
		).toBe(true);
	});
});
