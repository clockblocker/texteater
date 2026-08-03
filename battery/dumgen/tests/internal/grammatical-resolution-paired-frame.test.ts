import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	evaluation,
	pairedFrameGrammaticalResolutionExperiment,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-paired-frame/evaluation-suite";
import { evaluatePairedFrameGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-paired-frame/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/construction/paired-frame/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/construction/paired-frame/prompt-source";
import {
	buildDePairedFrameCitationSurfaceCodec,
	dePairedFrameLemmaCodec,
	dePairedFrameModelCitationSurfaceSchema,
	dePairedFrameModelLemmaSchema,
	inputSchema,
	outputSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/construction/paired-frame/schemas";

const expectedEvaluationIds = [
	"grammar-de-paired-frame-entweder-oder-friday",
	"grammar-de-paired-frame-entweder-oder-clauses",
	"grammar-de-paired-frame-weder-noch-nouns",
	"grammar-de-paired-frame-sowohl-wie",
	"grammar-de-paired-frame-je-umso-night",
	"grammar-de-paired-frame-je-desto",
	"grammar-de-paired-frame-je-umso",
	"grammar-de-paired-frame-um-zu-learn",
	"grammar-de-paired-frame-um-zu-purpose",
	"grammar-de-paired-frame-ohne-zu",
	"grammar-de-paired-frame-entweder-typo",
	"grammar-de-paired-frame-desto-typo",
	"grammar-de-paired-frame-unresolved-single-arm-entweder",
	"grammar-de-paired-frame-unresolved-single-arm-noch",
	"grammar-de-paired-frame-unresolved-overselected-conjunct",
	"grammar-de-paired-frame-unresolved-mixed-occurrences",
	"grammar-de-paired-frame-unresolved-unrelated-um-zu",
	"grammar-de-paired-frame-unresolved-mismatched-arms",
	"grammar-de-paired-frame-unresolved-single-cconj-sowie",
	"grammar-de-paired-frame-unresolved-unmarked-third-member",
] as const;

describe("Construction/PairedFrame route-local contract", () => {
	test("keeps four demonstrations and exactly 20 disjoint heldouts", () => {
		expect(corpus.all().ids).toHaveLength(24);
		expect(demonstrations.ids).toEqual([
			"grammar-de-paired-frame-anstatt-zu",
			"grammar-de-paired-frame-sowohl-als-auch",
			"grammar-de-paired-frame-sowohl-wie-auch",
			"grammar-de-paired-frame-unresolved-overselected-determiner",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation).toBe(
			pairedFrameGrammaticalResolutionExperiment.evaluation,
		);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(demonstrations.union(evaluation).ids).toHaveLength(24);
		expect(corpus.all().ids.some((id) => /-(?:demo|eval)-/u.test(id))).toBe(
			false,
		);
	});

	test("reuses shared TARGET preflight while retaining one-arm negatives", () => {
		for (const markedContext of [
			"<TARGET>entweder oder</TARGET>",
			"<TARGET></TARGET>",
			"<TARGET>je</TARGET><TARGET>,</TARGET>",
			"<TARGET>je</TARGET><TARGET>desto",
		]) {
			expect(inputSchema.safeParse({ markedContext }).success).toBe(
				false,
			);
		}
		expect(
			inputSchema.safeParse({
				markedContext:
					"Wir fahren <TARGET>entweder</TARGET> heute oder morgen.",
			}).success,
		).toBe(true);
	});

	test("round-trips exact fixed route fields through Dumling codecs", () => {
		const modelLemma = {
			canonicalForm: "entweder … oder",
			coreFeatures: {},
		};
		const canonicalLemma = dePairedFrameLemmaCodec.decode(modelLemma);
		expect(canonicalLemma).toEqual({
			language: "de",
			canonicalForm: "entweder … oder",
			family: "Construction",
			kind: "PairedFrame",
			coreFeatures: {},
		});
		expect(dePairedFrameLemmaCodec.encode(canonicalLemma)).toEqual(
			modelLemma,
		);

		const modelSurface = {
			normalizedSurface: "entweder oder",
			spelling: "Canonical" as const,
			realizationCoverage: "Full" as const,
			surfaceKind: "Citation" as const,
			surfaceFeatures: { historicalStatus: null },
		};
		const codec = buildDePairedFrameCitationSurfaceCodec(canonicalLemma);
		const canonicalSurface = codec.decode(modelSurface);
		expect(canonicalSurface).toEqual({
			language: "de",
			normalizedSurface: "entweder oder",
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

	test("keeps Core empty, Citation-only, Full, and fixed fields absent", () => {
		expect(
			dePairedFrameModelLemmaSchema.parse({
				canonicalForm: "je … desto",
				coreFeatures: {},
			}),
		).toEqual({ canonicalForm: "je … desto", coreFeatures: {} });
		for (const invalid of [
			{
				canonicalForm: "je … desto",
				coreFeatures: { relation: "proportional" },
			},
			{
				language: "de",
				canonicalForm: "je … desto",
				coreFeatures: {},
			},
		]) {
			expect(
				dePairedFrameModelLemmaSchema.safeParse(invalid).success,
			).toBe(false);
		}
		const surface = {
			normalizedSurface: "je desto",
			spelling: "Canonical",
			realizationCoverage: "Full",
			surfaceKind: "Citation",
			surfaceFeatures: null,
		};
		expect(
			dePairedFrameModelCitationSurfaceSchema.safeParse(surface).success,
		).toBe(true);
		expect(
			dePairedFrameModelCitationSurfaceSchema.safeParse({
				...surface,
				realizationCoverage: "Partial",
			}).success,
		).toBe(false);
		expect(
			dePairedFrameModelCitationSurfaceSchema.safeParse({
				...surface,
				surfaceKind: "Inflection",
			}).success,
		).toBe(false);
	});

	test("assembles a self-contained ordered fail-closed policy", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("Construction/PairedFrame");
		expect(prompt).toContain("This list is closed");
		expect(prompt).toContain("1. One occurrence");
		expect(prompt).toContain("2. All-member marking");
		expect(prompt).toContain("3. Full realization");
		expect(prompt).toContain(
			"CoreFeatures object is exactly {}".replace(
				"CoreFeatures",
				"coreFeatures",
			),
		);
		expect(prompt).toContain("Citation-only");
		expect(prompt).toContain("<TARGET>anstatt</TARGET>");
		expect(prompt).toContain("<TARGET>sowohl</TARGET>");
		expect(prompt).not.toContain("<TARGET>Je</TARGET> länger er wartet");
	});

	test("pins discontinuity, distinct lexical alternants, typo normalization, and scope failures", () => {
		expect(
			corpus.cases["grammar-de-paired-frame-je-umso"]?.idealOutput,
		).toMatchObject({
			resolution: {
				memberOrthographies: ["Standard", "Standard"],
				surface: {
					normalizedSurface: "je umso",
					spelling: "Canonical",
					realizationCoverage: "Full",
					surfaceKind: "Citation",
				},
				lemma: { canonicalForm: "je … umso", coreFeatures: {} },
			},
		});
		expect(
			corpus.cases["grammar-de-paired-frame-entweder-typo"]?.idealOutput,
		).toMatchObject({
			resolution: {
				memberOrthographies: ["Typo", "Standard"],
				surface: { normalizedSurface: "entweder oder" },
			},
		});
		expect(
			corpus.cases["grammar-de-paired-frame-sowohl-wie"]?.idealOutput,
		).toMatchObject({
			resolution: {
				memberOrthographies: ["Standard", "Standard"],
				surface: { normalizedSurface: "sowohl wie" },
				lemma: { canonicalForm: "sowohl … wie" },
			},
		});
		for (const caseId of expectedEvaluationIds.filter((id) =>
			id.includes("unresolved"),
		)) {
			expect(corpus.cases[caseId]?.idealOutput).toEqual({
				decision: "Unresolved",
				resolution: null,
			});
		}
	});

	test("matches exact member cardinality for every resolved canonical frame", () => {
		for (const testCase of corpus.all().cases) {
			const resolution = testCase.idealOutput.resolution;
			if (resolution === null) continue;
			const targetCount =
				testCase.input.markedContext.match(/<TARGET>/gu)?.length ?? 0;
			expect(resolution.memberOrthographies).toHaveLength(targetCount);
			expect(
				resolution.surface.normalizedSurface.split(" "),
			).toHaveLength(targetCount);
			expect(
				resolution.lemma.canonicalForm
					.split(" ")
					.filter((member) => member !== "…"),
			).toHaveLength(targetCount);
			expect(resolution.surface.spelling).toBe("Canonical");
		}
	});
});

describe("Construction/PairedFrame pure evaluator", () => {
	test("passes every ideal heldout exactly", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const testCase = evaluation.cases[index];
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			expect(
				evaluatePairedFrameGrammaticalResolution({
					caseId,
					input: testCase.input,
					idealOutput: testCase.idealOutput,
					output: testCase.idealOutput,
				}).contractPass,
			).toBe(true);
		}
	});

	test("diagnoses member and normalized-Surface mismatches", () => {
		const testCase = corpus.cases["grammar-de-paired-frame-je-desto"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null
		) {
			throw new Error("Missing resolved frame fixture.");
		}
		const output = outputSchema.parse({
			...testCase.idealOutput,
			resolution: {
				...testCase.idealOutput.resolution,
				memberOrthographies: ["Standard", "Typo"],
				surface: {
					...testCase.idealOutput.resolution.surface,
					normalizedSurface: "je umso",
				},
			},
		});
		const result = evaluatePairedFrameGrammaticalResolution({
			caseId: "grammar-de-paired-frame-je-desto",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(false);
		expect(result.memberCountPass).toBe(true);
		expect(result.memberOrthographiesPass).toBe(false);
		expect(result.normalizedSurfacePass).toBe(false);
	});
});
