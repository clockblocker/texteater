import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	acceptanceEvaluation,
	developmentEvaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-fusion/evaluation-suite";
import { evaluateFusionGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-fusion/evaluator";
import { corpus } from "../../src/promptsmith/production/grammatical-resolution/de/construction/fusion/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/production/grammatical-resolution/de/construction/fusion/prompt-source";
import {
	buildDeFusionCitationSurfaceCodec,
	deFusionLemmaCodec,
	fusionResolutionCodec,
	inputSchema,
	outputSchema,
} from "../../src/promptsmith/production/grammatical-resolution/de/construction/fusion/schemas";

describe("Construction/Fusion canonical total contract", () => {
	test("freezes 34 cases into disjoint 6/18/10 partitions", () => {
		expect(corpus.all().ids).toHaveLength(34);
		expect(demonstrations.ids).toHaveLength(6);
		expect(developmentEvaluation.ids).toHaveLength(18);
		expect(acceptanceEvaluation.ids).toHaveLength(10);
		expect(demonstrations.isDisjointFrom(developmentEvaluation)).toBe(true);
		expect(demonstrations.isDisjointFrom(acceptanceEvaluation)).toBe(true);
		expect(developmentEvaluation.isDisjointFrom(acceptanceEvaluation)).toBe(
			true,
		);
		expect(
			new Set(
				demonstrations
					.union(developmentEvaluation)
					.union(acceptanceEvaluation).ids,
			),
		).toEqual(new Set(corpus.all().ids));
	});

	test("uses aligned canonical inputs and a strict flat Citation DTO", () => {
		for (const testCase of corpus.all().cases) {
			expect(inputSchema.parse(testCase.input).members).toEqual(
				[
					...testCase.input.markedContext.matchAll(
						/<TARGET>([^<>]+)<\/TARGET>/gu,
					),
				].map((match) => match[1] ?? ""),
			);
			expect(testCase.input.members).toHaveLength(1);
			expect(outputSchema.safeParse(testCase.idealOutput).success).toBe(
				true,
			);
			expect(
				evaluateFusionGrammaticalResolution({
					caseId: "ideal-output",
					input: testCase.input,
					idealOutput: testCase.idealOutput,
					output: testCase.idealOutput,
				}).contractPass,
			).toBe(true);
		}

		const fixture = corpus.cases["grammar-de-fusion-dev-am-bahnhof"];
		if (fixture === undefined) throw new Error("Missing Fusion fixture.");
		for (const extra of [
			{ decision: "Resolved" },
			{ realizationCoverage: "Full" },
			{ language: "de" },
		]) {
			expect(
				outputSchema.safeParse({ ...fixture.idealOutput, ...extra })
					.success,
			).toBe(false);
		}
		expect(
			outputSchema.safeParse({
				...fixture.idealOutput,
				lemma: { ...fixture.idealOutput.lemma, coreFeatures: {} },
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
		expect(
			inputSchema.safeParse({
				markedContext:
					"Wir sitzen <TARGET>in</TARGET> <TARGET>dem</TARGET> Garten.",
				members: ["in", "dem"],
			}).success,
		).toBe(false);
	});

	test("keeps authoritative singleton membership beside route contrasts", () => {
		const prompt = assembleSystemPrompt(promptSource).replaceAll(
			/\s+/gu,
			" ",
		);
		expect(prompt).toContain("operation is total");
		expect(prompt).toContain(
			"Never reject, repair, add, remove, merge, split, or reorder membership",
		);
		expect(prompt).toContain("application injects German language");
		expect(prompt).toContain("Full realization coverage");
		expect(prompt).not.toContain('"decision":');
		expect(
			corpus.cases["grammar-de-fusion-demo-am-near-route-controls"]?.input
				.markedContext,
		).toContain("am schnellsten");
		expect(
			corpus.cases["grammar-de-fusion-demo-ins-near-idiom-and-dialect"]
				?.input.markedContext,
		).toContain("ins Gras beißen");
		expect(
			corpus.cases["grammar-de-fusion-accept-im-garten"]?.input
				.markedContext,
		).toStartWith("Im Haus");
	});

	test("pins casing, typo, historical Variant, and archaic-context controls", () => {
		expect(
			corpus.cases["grammar-de-fusion-demo-im-initial"]?.idealOutput,
		).toMatchObject({
			memberOrthographies: ["Standard"],
			normalizedMembers: ["im"],
			lemma: { canonicalForm: "im" },
		});
		expect(
			corpus.cases["grammar-de-fusion-dev-beimm-typo"]?.idealOutput,
		).toMatchObject({
			memberOrthographies: ["Typo"],
			normalizedMembers: ["beim"],
			surface: { spelling: "Canonical", surfaceFeatures: null },
		});
		expect(
			corpus.cases["grammar-de-fusion-demo-fuers-historical-variant"]
				?.idealOutput,
		).toMatchObject({
			memberOrthographies: ["Standard"],
			normalizedMembers: ["für's"],
			surface: { spelling: "Variant", surfaceFeatures: null },
			lemma: { canonicalForm: "fürs" },
		});
		expect(
			corpus.cases["grammar-de-fusion-dev-zum-behufe-archaic-context"]
				?.idealOutput.surface.surfaceFeatures,
		).toBeNull();
	});

	test("restores application-owned empty core and linked Citation through codecs", () => {
		const model =
			corpus.cases["grammar-de-fusion-dev-am-bahnhof"]?.idealOutput;
		if (model === undefined) throw new Error("Missing Fusion fixture.");
		const runtime = fusionResolutionCodec.decode(model);
		expect(runtime.lemma).toEqual({
			canonicalForm: "am",
			coreFeatures: {},
		});
		const lemma = deFusionLemmaCodec.decode(runtime.lemma);
		expect(lemma).toMatchObject({
			language: "de",
			family: "Construction",
			kind: "Fusion",
		});
		expect(
			buildDeFusionCitationSurfaceCodec(lemma).decode({
				...model.surface,
				surfaceKind: "Citation",
				normalizedSurface: model.normalizedMembers.join(" "),
			}),
		).toMatchObject({ language: "de", surfaceKind: "Citation", lemma });
	});
});
