import { describe, expect, test } from "bun:test";

import { stableJson } from "../../src/lib/stable-json";
import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	evaluation,
	fusionGrammaticalResolutionExperiment,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-fusion/evaluation-suite";
import { evaluateFusionGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-fusion/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/construction/fusion/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/construction/fusion/prompt-source";
import {
	buildDeFusionCitationSurfaceCodec,
	deFusionLemmaCodec,
	deFusionModelCitationSurfaceSchema,
	deFusionModelLemmaSchema,
	inputSchema,
	outputSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/construction/fusion/schemas";

const expectedEvaluationIds = [
	"grammar-de-fusion-am",
	"grammar-de-fusion-beim-typo",
	"grammar-de-fusion-vom",
	"grammar-de-fusion-ins",
	"grammar-de-fusion-ans",
	"grammar-de-fusion-aufs",
	"grammar-de-fusion-fuers",
	"grammar-de-fusion-ums",
	"grammar-de-fusion-durchs",
	"grammar-de-fusion-uebers",
	"grammar-de-fusion-beim-initial",
	"grammar-de-fusion-unresolved-adp-mit",
	"grammar-de-fusion-unresolved-am-superlative",
	"grammar-de-fusion-unresolved-overbroad-noun",
	"grammar-de-fusion-unresolved-two-fusions",
	"grammar-de-fusion-unresolved-mixed-fusion-adp",
	"grammar-de-fusion-unresolved-valid-ihm",
	"grammar-de-fusion-unresolved-idiom-whole",
	"grammar-de-fusion-unresolved-discourse-whole",
	"grammar-de-fusion-unresolved-paired-frame",
] as const;

describe("Construction/Fusion route-local schemas and corpus", () => {
	test("uses the shared TARGET preflight without rejecting route adversaries", () => {
		for (const markedContext of [
			"Wir sind im Garten.",
			"Wir sind <TARGET>im Garten.",
			"Wir sind <TARGET></TARGET> Garten.",
			"Wir sind <TARGET> </TARGET> Garten.",
			"Wir sind <TARGET>im Garten</TARGET>.",
			"Wir sind <TARGET>,</TARGET> im Garten.",
		]) {
			expect(inputSchema.safeParse({ markedContext }).success).toBe(
				false,
			);
		}
		expect(
			inputSchema.safeParse({
				markedContext: "Wir sind <TARGET>im</TARGET> Garten.",
			}).success,
		).toBe(true);
		expect(
			inputSchema.safeParse({
				markedContext:
					"Wir sind <TARGET>in</TARGET> <TARGET>dem</TARGET> Garten.",
			}).success,
		).toBe(true);
	});

	test("round-trips every fixed Lemma and Citation Surface field", () => {
		const modelLemma = { canonicalForm: "im", coreFeatures: {} };
		const canonicalLemma = deFusionLemmaCodec.decode(modelLemma);
		expect(canonicalLemma).toEqual({
			language: "de",
			canonicalForm: "im",
			family: "Construction",
			kind: "Fusion",
			coreFeatures: {},
		});
		expect(deFusionLemmaCodec.encode(canonicalLemma)).toEqual(modelLemma);

		const modelSurface = {
			normalizedSurface: "im",
			spelling: "Canonical" as const,
			realizationCoverage: "Full" as const,
			surfaceKind: "Citation" as const,
			surfaceFeatures: { historicalStatus: null },
		};
		const codec = buildDeFusionCitationSurfaceCodec(canonicalLemma);
		const canonicalSurface = codec.decode(modelSurface);
		expect(canonicalSurface).toEqual({
			language: "de",
			normalizedSurface: "im",
			spelling: "Canonical",
			realizationCoverage: "Full",
			surfaceKind: "Citation",
			surfaceFeatures: null,
			lemma: canonicalLemma,
		});
		expect(codec.encode(canonicalSurface)).toEqual({
			...modelSurface,
			surfaceFeatures: null,
		});
	});

	test("projects the exact empty-Core Citation-only DTO", () => {
		expect(
			deFusionModelLemmaSchema.parse({
				canonicalForm: "im",
				coreFeatures: {},
			}),
		).toEqual({ canonicalForm: "im", coreFeatures: {} });
		for (const invalid of [
			{ language: "de", canonicalForm: "im", coreFeatures: {} },
			{ canonicalForm: "im", coreFeatures: { preposition: "in" } },
		]) {
			expect(deFusionModelLemmaSchema.safeParse(invalid).success).toBe(
				false,
			);
		}
		const citation = {
			normalizedSurface: "im",
			spelling: "Canonical" as const,
			realizationCoverage: "Full" as const,
			surfaceKind: "Citation" as const,
			surfaceFeatures: null,
		};
		expect(deFusionModelCitationSurfaceSchema.parse(citation)).toEqual(
			citation,
		);
		for (const invalid of [
			{ ...citation, realizationCoverage: "Partial" },
			{ ...citation, language: "de" },
			{
				...citation,
				lemma: {
					language: "de",
					canonicalForm: "im",
					family: "Construction",
					kind: "Fusion",
					coreFeatures: {},
				},
			},
			{
				...citation,
				surfaceKind: "Inflection",
				inflectionalFeatures: {},
			},
		]) {
			expect(
				deFusionModelCitationSurfaceSchema.safeParse(invalid).success,
			).toBe(false);
		}
		expect(
			outputSchema.safeParse({
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard", "Standard"],
					surface: citation,
					lemma: { canonicalForm: "im", coreFeatures: {} },
				},
			}).success,
		).toBe(false);
	});

	test("pins exactly 20 held-outs disjoint from four minimized demonstrations", () => {
		expect(corpus.all().ids).toHaveLength(25);
		expect(demonstrations.ids).toEqual([
			"grammar-de-fusion-demo-im-initial",
			"grammar-de-fusion-demo-zur",
			"grammar-de-fusion-demo-zum-typo",
			"grammar-de-fusion-demo-uncontracted-in-dem",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation.ids).toHaveLength(20);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(demonstrations.union(evaluation).ids).toHaveLength(24);
		expect(evaluation).toBe(
			fusionGrammaticalResolutionExperiment.evaluation,
		);
		expect(
			evaluation.cases.filter(
				(testCase) => testCase.idealOutput.decision === "Resolved",
			),
		).toHaveLength(11);
		const typoCase = corpus.cases["grammar-de-fusion-beim-typo"];
		expect(typoCase?.input.markedContext).toContain(
			"<TARGET>beimm</TARGET>",
		);
		expect(typoCase?.idealOutput.resolution).toMatchObject({
			memberOrthographies: ["Typo"],
			surface: { normalizedSurface: "beim" },
			lemma: { canonicalForm: "beim" },
		});
		expect(
			evaluation.ids.includes(
				"grammar-de-fusion-unresolved-discourse-whole",
			),
		).toBe(true);
		expect(
			evaluation.ids.includes("grammar-de-fusion-unresolved-von-dem"),
		).toBe(false);
	});

	test("maps every resolved case to exactly one marked word", () => {
		for (const testCase of corpus.all().cases) {
			if (testCase.idealOutput.resolution === null) continue;
			expect(
				testCase.input.markedContext.match(/<TARGET>/gu),
			).toHaveLength(1);
			expect(
				testCase.idealOutput.resolution.memberOrthographies,
			).toHaveLength(1);
		}
	});

	test("assembles a self-contained fixed-route prompt", () => {
		const assembled = assembleSystemPrompt(promptSource);
		expect(assembled).toContain("Construction/Fusion");
		expect(assembled).toContain("im = in dem");
		expect(assembled).toContain(
			"am is Fusion only when it realizes an dem",
		);
		expect(assembled).toContain("am schnellsten");
		expect(assembled).toContain("Citation-only");
		expect(assembled).toContain("coreFeatures exactly {}");
		expect(assembled).toContain("valid word");
		for (const testCase of demonstrations.cases) {
			expect(assembled).toContain(stableJson(testCase.input));
			expect(assembled).toContain(stableJson(testCase.idealOutput));
		}
	});

	test("the evaluator is pure and exact over every projected field", () => {
		const testCase = corpus.cases["grammar-de-fusion-ins"];
		if (testCase === undefined) throw new Error("Missing fixture.");
		const inputBefore = structuredClone(testCase.input);
		const idealBefore = structuredClone(testCase.idealOutput);
		const passing = evaluateFusionGrammaticalResolution({
			caseId: "grammar-de-fusion-ins",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output: structuredClone(testCase.idealOutput),
		});
		expect(passing.contractPass).toBe(true);
		expect(testCase.input).toEqual(inputBefore);
		expect(testCase.idealOutput).toEqual(idealBefore);

		const resolved = testCase.idealOutput.resolution;
		if (resolved === null) throw new Error("Expected resolved fixture.");
		const equivalentAllNullFeatures = outputSchema.parse({
			...testCase.idealOutput,
			resolution: {
				...resolved,
				surface: {
					...resolved.surface,
					surfaceFeatures: { historicalStatus: null },
				},
			},
		});
		const equivalentEvaluation = evaluateFusionGrammaticalResolution({
			caseId: "grammar-de-fusion-ins",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output: equivalentAllNullFeatures,
		});
		expect(equivalentEvaluation.surfaceFeaturesPass).toBe(true);
		expect(equivalentEvaluation.contractPass).toBe(true);

		const miss = outputSchema.parse({
			...testCase.idealOutput,
			resolution: {
				...resolved,
				lemma: { ...resolved.lemma, canonicalForm: "in das" },
			},
		});
		expect(
			evaluateFusionGrammaticalResolution({
				caseId: "grammar-de-fusion-ins",
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: miss,
			}).canonicalFormPass,
		).toBe(false);
	});
});
