import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	developmentEvaluation,
	interjectionGrammaticalResolutionAcceptanceExperiment,
	interjectionGrammaticalResolutionExperiment,
	untouchedAcceptanceEvaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-interjection/evaluation-suite";
import { evaluateInterjectionGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-interjection/evaluator";
import { corpus } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/interjection/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/interjection/prompt-source";
import {
	inputSchema,
	modelCitationSurfaceSchema,
	modelLemmaSchema,
	outputSchema,
} from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/interjection/schemas";

const expectedDemonstrationIds = [
	"grammar-de-intj-demo-pfui-expressive",
	"grammar-de-intj-demo-ja-response",
	"grammar-de-intj-demo-hmm-lengthened",
	"grammar-de-intj-demo-ha-ha-reduplication",
	"grammar-de-intj-demo-typo-huraa",
	"grammar-de-intj-demo-archaic-juchhei",
	"grammar-de-intj-demo-contextual-ach-after-noun",
] as const;

const expectedDevelopmentIds = [
	"grammar-de-intj-dev-wupp-onomatopoeia",
	"grammar-de-intj-dev-hallo-greeting",
	"grammar-de-intj-dev-hurra-joy",
	"grammar-de-intj-dev-oh-reaction",
	"grammar-de-intj-dev-huch-surprise",
	"grammar-de-intj-dev-au-pain",
	"grammar-de-intj-dev-aeh-hesitation",
	"grammar-de-intj-dev-tja-resignation",
	"grammar-de-intj-dev-miau-onomatopoeia",
	"grammar-de-intj-dev-nein-response",
	"grammar-de-intj-dev-doch-corrective-response",
	"grammar-de-intj-dev-jawohl-response",
	"grammar-de-intj-dev-initial-ach",
	"grammar-de-intj-dev-lengthened-boahhh",
	"grammar-de-intj-dev-reduplicated-he-he",
	"grammar-de-intj-dev-typo-pufi",
	"grammar-de-intj-dev-archaic-potz",
	"grammar-de-intj-dev-acronym-omg",
	"grammar-de-intj-dev-beside-part-ja",
	"grammar-de-intj-dev-beside-discourse-formula-oh",
	"grammar-de-intj-dev-beside-adv-na",
] as const;

const expectedAcceptanceIds = [
	"grammar-de-intj-accept-v2-aha-realization",
	"grammar-de-intj-accept-v2-hoppla-mishap",
	"grammar-de-intj-accept-v2-maeh-onomatopoeia",
	"grammar-de-intj-accept-v2-ja-response-initial",
	"grammar-de-intj-accept-v2-heda-prompting",
	"grammar-de-intj-accept-v2-secondary-mann",
	"grammar-de-intj-accept-v2-secondary-donnerwetter",
	"grammar-de-intj-accept-v2-lengthened-aaach",
	"grammar-de-intj-accept-v2-reduplicated-igitt-igitt",
	"grammar-de-intj-accept-v2-typo-halol",
	"grammar-de-intj-accept-v2-acronym-lol",
	"grammar-de-intj-accept-v2-lengthened-ohhh",
	"grammar-de-intj-accept-v2-ordinary-lexical-mist",
	"grammar-de-intj-accept-v2-beside-formula-aehm",
] as const;

describe("Lexeme/INTJ route-local schemas and corpus", () => {
	test("uses canonical input and a smallest total flat codec DTO", () => {
		expect(
			inputSchema.parse({
				markedContext: "Sie rief <TARGET>pfui</TARGET>!",
				members: ["pfui"],
			}),
		).toEqual({
			markedContext: "Sie rief <TARGET>pfui</TARGET>!",
			members: ["pfui"],
		});
		expect(() =>
			inputSchema.parse({
				markedContext: "Sie rief <TARGET>pfui</TARGET>!",
				members: ["ach"],
			}),
		).toThrow(/members must exactly match/);

		const output = outputSchema.parse({
			memberOrthographies: ["Standard"],
			normalizedMembers: ["pfui"],
			surface: { spelling: "Canonical", surfaceFeatures: null },
			lemma: {
				canonicalForm: "pfui",
				coreFeatures: { partType: null },
			},
		});
		expect(Object.keys(output)).toEqual([
			"memberOrthographies",
			"normalizedMembers",
			"surface",
			"lemma",
		]);
		expect(
			outputSchema.safeParse({ decision: "Resolved", resolution: output })
				.success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				...output,
				realizationCoverage: "Full",
			}).success,
		).toBe(false);
	});

	test("derives Citation-only Surface and exact Lemma feature schemas", () => {
		expect(
			modelCitationSurfaceSchema.parse({
				spelling: "Variant",
				surfaceFeatures: { historicalStatus: "Archaic" },
			}),
		).toEqual({
			spelling: "Variant",
			surfaceFeatures: { historicalStatus: "Archaic" },
		});
		expect(
			modelCitationSurfaceSchema.safeParse({
				spelling: "Canonical",
				surfaceKind: "Citation",
				surfaceFeatures: null,
			}).success,
		).toBe(false);
		expect(
			modelCitationSurfaceSchema.safeParse({
				spelling: "Canonical",
				surfaceKind: "Inflection",
				inflectionalFeatures: {},
				surfaceFeatures: null,
			}).success,
		).toBe(false);
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
				canonicalForm: "ja",
				coreFeatures: { partType: "Inf" },
			}).success,
		).toBe(false);
	});

	test("freezes 42 cases into disjoint grammatical partitions", () => {
		expect(corpus.all().ids).toHaveLength(42);
		expect(demonstrations.ids).toEqual(expectedDemonstrationIds);
		expect(developmentEvaluation.ids).toEqual(expectedDevelopmentIds);
		expect(untouchedAcceptanceEvaluation.ids).toEqual(
			expectedAcceptanceIds,
		);
		expect(demonstrations.ids).toHaveLength(7);
		expect(developmentEvaluation.ids).toHaveLength(21);
		expect(untouchedAcceptanceEvaluation.ids).toHaveLength(14);
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
	});

	test("covers Core, Surface, orthography, repetition, and fixed-route controls", () => {
		const all = corpus.all().cases;
		const outputs = all.map((testCase) => testCase.idealOutput);
		expect(
			new Set(
				outputs.map((output) => output.lemma.coreFeatures.partType),
			),
		).toEqual(new Set([null, "Res"]));
		expect(
			new Set(outputs.map((output) => output.surface.spelling)),
		).toEqual(new Set(["Canonical", "Variant"]));
		expect(
			outputs.some(
				(output) =>
					output.surface.surfaceFeatures?.historicalStatus ===
					"Archaic",
			),
		).toBe(true);
		expect(
			outputs.some((output) =>
				output.memberOrthographies.includes("Typo"),
			),
		).toBe(true);
		expect(
			outputs.some((output) => output.normalizedMembers.length > 1),
		).toBe(true);
		for (const routeWord of [
			"part",
			"discourse-formula",
			"adv",
			"onomatopoeia",
			"ordinary-lexical",
		]) {
			expect(corpus.all().ids.some((id) => id.includes(routeWord))).toBe(
				true,
			);
		}
	});

	test("assembles total instructions without held-out contamination", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("operation is total");
		expect(prompt).toContain("application injects");
		expect(prompt).toContain('partType: "Res" | null');
		expect(prompt).toContain("<TARGET>ha</TARGET> <TARGET>ha</TARGET>");
		expect(prompt).not.toContain("<TARGET>wupp</TARGET>");
		expect(prompt).not.toContain("<TARGET>uff</TARGET>");
		expect(prompt).not.toContain('decision: "Resolved"');
	});
});

describe("Lexeme/INTJ pure diagnostic evaluator", () => {
	test("passes every frozen development and acceptance ideal output", () => {
		for (const experiment of [
			interjectionGrammaticalResolutionExperiment,
			interjectionGrammaticalResolutionAcceptanceExperiment,
		]) {
			for (const [index, caseId] of experiment.evaluation.ids.entries()) {
				const testCase = experiment.evaluation.cases[index];
				if (testCase === undefined)
					throw new Error(`Missing ${caseId}.`);
				const result = evaluateInterjectionGrammaticalResolution({
					caseId,
					input: testCase.input,
					idealOutput: testCase.idealOutput,
					output: testCase.idealOutput,
				});
				expect(result.contractPass).toBe(true);
				expect(Object.values(result).every(Boolean)).toBe(true);
			}
		}
	});

	test("reports normalization and response-feature misses independently", () => {
		const testCase = corpus.cases["grammar-de-intj-dev-nein-response"];
		if (testCase === undefined) throw new Error("Missing nein case.");
		const result = evaluateInterjectionGrammaticalResolution({
			caseId: "grammar-de-intj-dev-nein-response",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output: {
				...testCase.idealOutput,
				normalizedMembers: ["Nein"],
				lemma: {
					...testCase.idealOutput.lemma,
					coreFeatures: { partType: null },
				},
			},
		});
		expect(result.contractPass).toBe(false);
		expect(result.normalizedSurfacePass).toBe(false);
		expect(result.coreFeaturesPass).toBe(false);
		expect(result.spellingPass).toBe(true);
	});
});
