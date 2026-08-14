import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	acceptanceEvaluation,
	developmentEvaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-paired-frame/evaluation-suite";
import { evaluatePairedFrameGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-paired-frame/evaluator";
import { corpus } from "../../src/promptsmith/production/grammatical-resolution/de/construction/paired-frame/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/production/grammatical-resolution/de/construction/paired-frame/prompt-source";
import {
	buildDePairedFrameCitationSurfaceCodec,
	dePairedFrameLemmaCodec,
	inputSchema,
	outputSchema,
	pairedFrameResolutionCodec,
} from "../../src/promptsmith/production/grammatical-resolution/de/construction/paired-frame/schemas";

describe("Construction/PairedFrame canonical total contract", () => {
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
			expect(testCase.input.members.length).toBeGreaterThanOrEqual(2);
			expect(outputSchema.safeParse(testCase.idealOutput).success).toBe(
				true,
			);
			expect(
				evaluatePairedFrameGrammaticalResolution({
					caseId: "ideal-output",
					input: testCase.input,
					idealOutput: testCase.idealOutput,
					output: testCase.idealOutput,
				}).contractPass,
			).toBe(true);
		}

		const fixture = corpus.cases["grammar-de-paired-frame-dev-je-umso"];
		if (fixture === undefined)
			throw new Error("Missing PairedFrame fixture.");
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
					"<TARGET>entweder</TARGET> heute <TARGET>oder</TARGET> morgen.",
				members: ["oder", "entweder"],
			}).success,
		).toBe(false);
	});

	test("preserves anchors and treats route contrasts as context", () => {
		const prompt = assembleSystemPrompt(promptSource).replaceAll(
			/\s+/gu,
			" ",
		);
		expect(prompt).toContain("operation is total: always resolve it");
		expect(prompt).toContain(
			"Never reject, repair, add, remove, merge, split, or reorder membership",
		);
		expect(prompt).toContain("application injects German language");
		expect(prompt).toContain("Full realization coverage");
		expect(prompt).not.toContain('"decision":');
		expect(
			corpus.cases["grammar-de-paired-frame-dev-near-cconj"]?.input
				.markedContext,
		).toContain("Kaffee oder Tee");
		expect(
			corpus.cases["grammar-de-paired-frame-dev-near-sconj"]?.input
				.markedContext,
		).toStartWith("Ob es regnet");
		expect(
			corpus.cases["grammar-de-paired-frame-dev-repeated-um-zu-context"]
				?.input.markedContext,
		).toStartWith("Um das Haus blieb es zu laut");
	});

	test("pins two and three anchors, historical Variant, typo, and repetition", () => {
		expect(
			corpus.cases["grammar-de-paired-frame-dev-sowohl-wie-auch"]
				?.idealOutput,
		).toMatchObject({
			memberOrthographies: ["Standard", "Standard", "Standard"],
			normalizedMembers: ["sowohl", "wie", "auch"],
			lemma: { canonicalForm: "sowohl … wie auch" },
		});
		expect(
			corpus.cases["grammar-de-paired-frame-demo-so-dass-variant"]
				?.idealOutput,
		).toMatchObject({
			memberOrthographies: ["Standard", "Standard"],
			normalizedMembers: ["so", "daß"],
			surface: { spelling: "Variant", surfaceFeatures: null },
			lemma: { canonicalForm: "so … dass" },
		});
		expect(
			corpus.cases["grammar-de-paired-frame-dev-je-je"]?.idealOutput,
		).toMatchObject({
			normalizedMembers: ["je", "je"],
			surface: {
				spelling: "Canonical",
				surfaceFeatures: null,
			},
		});
		expect(
			corpus.cases["grammar-de-paired-frame-dev-desto-typo"]?.idealOutput
				.memberOrthographies,
		).toEqual(["Standard", "Typo"]);
		expect(
			corpus.cases["grammar-de-paired-frame-dev-teils-teils"]?.input
				.members,
		).toEqual(["teils", "teils"]);
	});

	test("restores application-owned empty core and linked Citation through codecs", () => {
		const model =
			corpus.cases["grammar-de-paired-frame-dev-entweder-freitag"]
				?.idealOutput;
		if (model === undefined)
			throw new Error("Missing PairedFrame fixture.");
		const runtime = pairedFrameResolutionCodec.decode(model);
		expect(runtime.lemma).toEqual({
			canonicalForm: "entweder … oder",
			coreFeatures: {},
		});
		const lemma = dePairedFrameLemmaCodec.decode(runtime.lemma);
		expect(lemma).toMatchObject({
			language: "de",
			family: "Construction",
			kind: "PairedFrame",
		});
		expect(
			buildDePairedFrameCitationSurfaceCodec(lemma).decode({
				...model.surface,
				surfaceKind: "Citation",
				normalizedSurface: model.normalizedMembers.join(" "),
			}),
		).toMatchObject({ language: "de", surfaceKind: "Citation", lemma });
	});
});
