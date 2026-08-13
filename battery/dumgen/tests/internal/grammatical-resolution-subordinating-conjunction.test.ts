import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	developmentEvaluation,
	subordinatingConjunctionGrammaticalResolutionAcceptanceExperiment,
	subordinatingConjunctionGrammaticalResolutionExperiment,
	untouchedAcceptanceEvaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-subordinating-conjunction/evaluation-suite";
import { evaluateSubordinatingConjunctionGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-subordinating-conjunction/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/subordinating-conjunction/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/subordinating-conjunction/prompt-source";
import {
	deSubordinatingConjunctionModelCitationSurfaceSchema,
	deSubordinatingConjunctionModelLemmaSchema,
	inputSchema,
	outputSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/subordinating-conjunction/schemas";

const expectedDemonstrationIds = [
	"grammar-de-sconj-demo-finite-weil",
	"grammar-de-sconj-demo-reduced-wie",
	"grammar-de-sconj-demo-infinitival-um",
	"grammar-de-sconj-demo-causal-da",
	"grammar-de-sconj-demo-typo-obwol",
	"grammar-de-sconj-demo-historical-dass",
	"grammar-de-sconj-demo-multiword-so-dass",
] as const;

const expectedDevelopmentIds = [
	"grammar-de-sconj-dev-complement-dass",
	"grammar-de-sconj-dev-conditional-wenn",
	"grammar-de-sconj-dev-temporal-nachdem",
	"grammar-de-sconj-dev-temporal-waehrend",
	"grammar-de-sconj-dev-interrogative-ob",
	"grammar-de-sconj-dev-temporal-bevor",
	"grammar-de-sconj-dev-conditional-falls",
	"grammar-de-sconj-dev-temporal-seitdem",
	"grammar-de-sconj-dev-temporal-sobald",
	"grammar-de-sconj-dev-modal-indem",
	"grammar-de-sconj-dev-causal-zumal",
	"grammar-de-sconj-dev-comparative-als-clause",
	"grammar-de-sconj-dev-comparative-wie-clause",
	"grammar-de-sconj-dev-temporal-als",
	"grammar-de-sconj-dev-adversative-wohingegen",
	"grammar-de-sconj-dev-concessive-obgleich",
	"grammar-de-sconj-dev-conditional-sofern",
	"grammar-de-sconj-dev-temporal-bis",
	"grammar-de-sconj-dev-multiword-als-ob",
	"grammar-de-sconj-dev-variant-sodass",
	"grammar-de-sconj-dev-beside-adp-waehrend",
	"grammar-de-sconj-dev-beside-cconj-denn",
] as const;

const expectedAcceptanceIds = [
	"grammar-de-sconj-accept-v2-finite-obwohl",
	"grammar-de-sconj-accept-v2-purpose-damit",
	"grammar-de-sconj-accept-v2-conditional-wenn",
	"grammar-de-sconj-accept-v2-interrogative-ob",
	"grammar-de-sconj-accept-v2-infinitival-ohne",
	"grammar-de-sconj-accept-v2-comparative-als",
	"grammar-de-sconj-accept-v2-reduced-wie",
	"grammar-de-sconj-accept-v2-multiword-als-wenn",
	"grammar-de-sconj-accept-v2-initial-falls",
	"grammar-de-sconj-accept-v2-typo-obwhol",
	"grammar-de-sconj-accept-v2-archaic-dieweil",
	"grammar-de-sconj-accept-v2-variant-so-dass",
	"grammar-de-sconj-accept-v2-beside-adv-da",
	"grammar-de-sconj-accept-v2-beside-part-ja",
	"grammar-de-sconj-accept-v2-beside-frame-and-abbreviation",
] as const;

describe("Lexeme/SCONJ route-local schemas and corpus", () => {
	test("uses canonical input and a smallest total flat codec DTO", () => {
		expect(
			inputSchema.parse({
				markedContext:
					"Wir gehen, <TARGET>wenn</TARGET> es trocken bleibt.",
				members: ["wenn"],
			}),
		).toEqual({
			markedContext:
				"Wir gehen, <TARGET>wenn</TARGET> es trocken bleibt.",
			members: ["wenn"],
		});
		expect(() =>
			inputSchema.parse({
				markedContext:
					"Wir gehen, <TARGET>wenn</TARGET> es trocken bleibt.",
				members: ["ob"],
			}),
		).toThrow(/members must exactly match/);

		const output = outputSchema.parse({
			memberOrthographies: ["Standard"],
			normalizedMembers: ["wenn"],
			surface: { spelling: "Canonical", surfaceFeatures: null },
			lemma: {
				canonicalForm: "wenn",
				coreFeatures: { conjType: null },
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
			deSubordinatingConjunctionModelCitationSurfaceSchema.parse({
				spelling: "Variant",
				surfaceFeatures: { historicalStatus: "Archaic" },
			}),
		).toEqual({
			spelling: "Variant",
			surfaceFeatures: { historicalStatus: "Archaic" },
		});
		expect(
			deSubordinatingConjunctionModelCitationSurfaceSchema.safeParse({
				spelling: "Canonical",
				surfaceKind: "Citation",
				surfaceFeatures: null,
			}).success,
		).toBe(false);
		expect(
			deSubordinatingConjunctionModelLemmaSchema.parse({
				canonicalForm: "als",
				coreFeatures: { conjType: "Comp" },
			}),
		).toEqual({
			canonicalForm: "als",
			coreFeatures: { conjType: "Comp" },
		});
		expect(
			deSubordinatingConjunctionModelLemmaSchema.safeParse({
				canonicalForm: "als",
				coreFeatures: { conjType: "Coord" },
			}).success,
		).toBe(false);
	});

	test("freezes a fresh v2 acceptance partition beside retained v1 cases", () => {
		expect(corpus.all().ids).toHaveLength(59);
		expect(demonstrations.ids).toEqual(expectedDemonstrationIds);
		expect(developmentEvaluation.ids).toEqual(expectedDevelopmentIds);
		expect(untouchedAcceptanceEvaluation.ids).toEqual(
			expectedAcceptanceIds,
		);
		expect(demonstrations.ids).toHaveLength(7);
		expect(developmentEvaluation.ids).toHaveLength(22);
		expect(untouchedAcceptanceEvaluation.ids).toHaveLength(15);
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
		).toHaveLength(44);
		for (const retiredId of [
			"grammar-de-sconj-accept-concessive-obwohl",
			"grammar-de-sconj-accept-purpose-damit",
			"grammar-de-sconj-accept-temporal-ehe",
			"grammar-de-sconj-accept-concessive-wenngleich",
			"grammar-de-sconj-accept-concessive-obschon",
			"grammar-de-sconj-accept-consecutive-sodass",
			"grammar-de-sconj-accept-proportional-je",
			"grammar-de-sconj-accept-multiword-ohne-dass",
			"grammar-de-sconj-accept-typo-wehn",
			"grammar-de-sconj-accept-archaic-sintemal",
			"grammar-de-sconj-accept-variant-obzwar",
			"grammar-de-sconj-accept-beside-adv-da",
			"grammar-de-sconj-accept-beside-part-ja",
			"grammar-de-sconj-accept-beside-paired-frame",
			"grammar-de-sconj-accept-beside-abbreviation",
		]) {
			expect(corpus.cases[retiredId]).toBeDefined();
			expect(untouchedAcceptanceEvaluation.ids).not.toContain(retiredId);
		}
	});

	test("rejects a Variant oracle identical to its own canonical form", async () => {
		const { subordinatingConjunctionCase } = await import(
			"../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/subordinating-conjunction/golden-corpus/cases/builders"
		);
		expect(() =>
			subordinatingConjunctionCase(
				"Sie blieb, <TARGET>obzwar</TARGET> es spät war.",
				["obzwar"],
				"obzwar",
				undefined,
				{ spelling: "Variant" },
			),
		).toThrow(/must use Canonical spelling/);
	});

	test("covers comparative, orthographic, multi-member, and fixed-route controls", () => {
		const outputs = corpus
			.all()
			.cases.map((testCase) => testCase.idealOutput);
		expect(
			new Set(
				outputs.map((output) => output.lemma.coreFeatures.conjType),
			),
		).toEqual(new Set([null, "Comp"]));
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
			"cconj",
			"adv",
			"adp",
			"part",
			"paired-frame",
			"abbreviation",
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
		expect(prompt).toContain('conjType: "Comp" | null');
		expect(prompt).toContain("<TARGET>so</TARGET> <TARGET>dass</TARGET>");
		expect(prompt).not.toContain("<TARGET>nachdem</TARGET>");
		expect(prompt).not.toContain("<TARGET>sintemal</TARGET>");
		expect(prompt).not.toContain('decision: "Resolved"');
	});
});

describe("Lexeme/SCONJ pure diagnostic evaluator", () => {
	test("passes every frozen development and acceptance ideal output", () => {
		for (const experiment of [
			subordinatingConjunctionGrammaticalResolutionExperiment,
			subordinatingConjunctionGrammaticalResolutionAcceptanceExperiment,
		]) {
			for (const [index, caseId] of experiment.evaluation.ids.entries()) {
				const testCase = experiment.evaluation.cases[index];
				if (testCase === undefined)
					throw new Error(`Missing ${caseId}.`);
				const result =
					evaluateSubordinatingConjunctionGrammaticalResolution({
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

	test("reports normalization and comparative-feature misses independently", () => {
		const testCase =
			corpus.cases["grammar-de-sconj-dev-comparative-als-clause"];
		if (testCase === undefined) throw new Error("Missing als case.");
		const result = evaluateSubordinatingConjunctionGrammaticalResolution({
			caseId: "grammar-de-sconj-dev-comparative-als-clause",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output: {
				...testCase.idealOutput,
				normalizedMembers: ["wie"],
				lemma: {
					...testCase.idealOutput.lemma,
					coreFeatures: { conjType: null },
				},
			},
		});
		expect(result.contractPass).toBe(false);
		expect(result.normalizedSurfacePass).toBe(false);
		expect(result.coreFeaturesPass).toBe(false);
		expect(result.spellingPass).toBe(true);
	});
});
