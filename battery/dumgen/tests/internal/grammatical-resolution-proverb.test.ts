import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	acceptanceEvaluation,
	developmentEvaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-proverb/evaluation-suite";
import { evaluateProverbGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-proverb/evaluator";
import { corpus } from "../../src/promptsmith/production/grammatical-resolution/de/phraseme/proverb/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/production/grammatical-resolution/de/phraseme/proverb/prompt-source";
import {
	buildDeProverbCitationSurfaceCodec,
	deProverbLemmaCodec,
	inputSchema,
	outputSchema,
	proverbResolutionCodec,
} from "../../src/promptsmith/production/grammatical-resolution/de/phraseme/proverb/schemas";

describe("Phraseme/Proverb canonical total contract", () => {
	test("freezes 34 cases into disjoint 6/18/10 partitions", () => {
		expect(corpus.all().ids).toHaveLength(34);
		expect(demonstrations.ids).toEqual([
			"grammar-de-proverb-demo-morgenstund-attribution",
			"grammar-de-proverb-demo-aller-anfang-typo",
			"grammar-de-proverb-demo-was-heute-punctuation",
			"grammar-de-proverb-demo-grube-partial",
			"grammar-de-proverb-demo-muss-historical-variant",
			"grammar-de-proverb-demo-wo-gehobelt-discontinuous",
		]);
		expect(developmentEvaluation.ids).toHaveLength(18);
		expect(acceptanceEvaluation.ids).toEqual([
			"grammar-de-proverb-accept-wer-zuerst",
			"grammar-de-proverb-accept-wo-rauch",
			"grammar-de-proverb-accept-wo-wille",
			"grammar-de-proverb-accept-geteiltes-leid",
			"grammar-de-proverb-accept-glashaus-partial",
			"grammar-de-proverb-accept-frueher-vogel-slogan-context",
			"grammar-de-proverb-accept-eile-discourse-context",
			"grammar-de-proverb-accept-betten-idiom-context",
			"grammar-de-proverb-accept-doppelt-quotation-context",
			"grammar-de-proverb-accept-gaul-aphorism-context",
		]);
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

	test("uses exact canonical inputs and a strict flat Citation DTO", () => {
		for (const testCase of corpus.all().cases) {
			expect(inputSchema.parse(testCase.input).members).toEqual(
				[
					...testCase.input.markedContext.matchAll(
						/<TARGET>([^<>]+)<\/TARGET>/gu,
					),
				].map((match) => match[1] ?? ""),
			);
			expect(outputSchema.safeParse(testCase.idealOutput).success).toBe(
				true,
			);
			expect(
				evaluateProverbGrammaticalResolution({
					caseId: "ideal-output",
					input: testCase.input,
					idealOutput: testCase.idealOutput,
					output: testCase.idealOutput,
				}).contractPass,
			).toBe(true);
		}

		const fixture =
			corpus.cases["grammar-de-proverb-demo-morgenstund-attribution"];
		if (fixture === undefined) throw new Error("Missing Proverb fixture.");
		for (const extra of [
			{ decision: "Resolved" },
			{ resolution: fixture.idealOutput },
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
				lemma: {
					...fixture.idealOutput.lemma,
					coreFeatures: {},
				},
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
					"<TARGET>Übung</TARGET> <TARGET>macht</TARGET> <TARGET>den</TARGET> <TARGET>Meister</TARGET>.",
				members: ["macht", "Übung", "den", "Meister"],
			}).success,
		).toBe(false);
	});

	test("keeps route contrasts and punctuation outside authoritative membership", () => {
		const prompt = assembleSystemPrompt(promptSource).replaceAll(
			/\s+/gu,
			" ",
		);
		expect(prompt).toContain("operation is total: always resolve");
		expect(prompt).toContain(
			"Never reject, repair, add, remove, merge, split, reorder, or reclassify membership",
		);
		expect(prompt).toContain("application injects German language");
		expect(prompt).toContain("Partial never repairs membership");
		expect(prompt).toContain(
			"Serialize every Full or Partial canonicalForm as lexical members",
		);
		expect(prompt).toContain(
			"Fixed proverbial wording may preserve conventional contractions",
		);
		expect(prompt).not.toContain('"decision":');
		expect(
			corpus.cases["grammar-de-proverb-accept-gaul-aphorism-context"]
				?.input.markedContext,
		).toContain("Alt werden heißt sehend werden");
		expect(
			corpus.cases["grammar-de-proverb-accept-betten-idiom-context"]
				?.input.markedContext,
		).toContain("den Nagel auf den Kopf treffen");
		for (const testCase of corpus.all().cases) {
			expect(
				testCase.idealOutput.normalizedMembers.join(" "),
			).not.toMatch(/[,.!?„“]/u);
			expect(testCase.idealOutput.lemma.canonicalForm).not.toMatch(
				/[,.!?„“]/u,
			);
		}
	});

	test("pins variants, typos, archaic use, repetition, discontinuity, and genuine Partial", () => {
		expect(
			corpus.cases["grammar-de-proverb-demo-muss-historical-variant"]
				?.idealOutput,
		).toMatchObject({
			memberOrthographies: [
				"Standard",
				"Standard",
				"Standard",
				"Standard",
				"Standard",
				"Standard",
				"Standard",
			],
			normalizedMembers: [
				"Wer",
				"A",
				"sagt",
				"muß",
				"auch",
				"B",
				"sagen",
			],
			surface: { spelling: "Variant", surfaceFeatures: null },
			lemma: { canonicalForm: "Wer A sagt muss auch B sagen" },
		});
		expect(
			corpus.cases["grammar-de-proverb-dev-stille-wasser-typo"]
				?.idealOutput.memberOrthographies,
		).toContain("Typo");
		expect(
			corpus.cases["grammar-de-proverb-dev-wes-brot-archaic"]?.idealOutput
				.surface.surfaceFeatures,
		).toEqual({ historicalStatus: "Archaic" });
		expect(
			corpus.cases[
				"grammar-de-proverb-dev-repeated-das"
			]?.input.members.filter((member) => member === "das"),
		).toHaveLength(2);
		expect(
			corpus.cases["grammar-de-proverb-demo-wo-gehobelt-discontinuous"]
				?.input.markedContext,
		).toContain("erklärte der Meister");

		const partialIds = corpus
			.all()
			.ids.filter(
				(id) =>
					corpus.cases[id]?.idealOutput.realizationCoverage ===
					"Partial",
			);
		expect(partialIds).toEqual([
			"grammar-de-proverb-demo-grube-partial",
			"grammar-de-proverb-dev-reden-silber-partial",
			"grammar-de-proverb-accept-glashaus-partial",
		]);
		for (const id of partialIds) {
			expect(corpus.cases[id]?.input.markedContext).toContain("…");
		}
	});

	test("restores application-owned empty core and linked Citation through codecs", () => {
		const model =
			corpus.cases["grammar-de-proverb-demo-morgenstund-attribution"]
				?.idealOutput;
		if (model === undefined) throw new Error("Missing Proverb fixture.");
		const runtime = proverbResolutionCodec.decode(model);
		expect(runtime.lemma).toEqual({
			canonicalForm: "Morgenstund hat Gold im Mund",
			coreFeatures: {},
		});
		const lemma = deProverbLemmaCodec.decode(runtime.lemma);
		expect(lemma).toMatchObject({
			language: "de",
			family: "Phraseme",
			kind: "Proverb",
		});
		expect(
			buildDeProverbCitationSurfaceCodec(lemma).decode({
				...model.surface,
				surfaceKind: "Citation",
				normalizedSurface: model.normalizedMembers.join(" "),
			}),
		).toMatchObject({ language: "de", surfaceKind: "Citation", lemma });
	});
});
