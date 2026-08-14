import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	acceptanceEvaluation,
	developmentEvaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-aphorism/evaluation-suite";
import { evaluateAphorismGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-aphorism/evaluator";
import { corpus } from "../../src/promptsmith/production/grammatical-resolution/de/phraseme/aphorism/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/production/grammatical-resolution/de/phraseme/aphorism/prompt-source";
import {
	aphorismResolutionCodec,
	buildDeAphorismCitationSurfaceCodec,
	deAphorismLemmaCodec,
	inputSchema,
	outputSchema,
} from "../../src/promptsmith/production/grammatical-resolution/de/phraseme/aphorism/schemas";

describe("Phraseme/Aphorism canonical total contract", () => {
	test("freezes 32 cases into disjoint 6/16/10 partitions", () => {
		expect(corpus.all().ids).toHaveLength(32);
		expect(demonstrations.ids).toHaveLength(6);
		expect(developmentEvaluation.ids).toHaveLength(16);
		expect(acceptanceEvaluation.ids).toEqual([
			"grammar-de-aphorism-warten",
			"grammar-de-aphorism-leidenschaft",
			"grammar-de-aphorism-gebrannte-kinder",
			"grammar-de-aphorism-mitleid-neglige",
			"grammar-de-aphorism-arme-reiche",
			"grammar-de-aphorism-widerspruch-partial",
			"grammar-de-aphorism-huete-dich",
			"grammar-de-aphorism-alten-lesen",
			"grammar-de-aphorism-kunst-tempel-partial",
			"grammar-de-aphorism-guete-grenzenlos",
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
				evaluateAphorismGrammaticalResolution({
					caseId: "ideal-output",
					input: testCase.input,
					idealOutput: testCase.idealOutput,
					output: testCase.idealOutput,
				}).contractPass,
			).toBe(true);
		}

		const fixture = corpus.cases["grammar-de-aphorism-alt-werden"];
		if (fixture === undefined) throw new Error("Missing Aphorism fixture.");
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
				markedContext: "<TARGET>Alt</TARGET> <TARGET>werden</TARGET>.",
				members: ["werden", "Alt"],
			}).success,
		).toBe(false);
	});

	test("keeps boundary context and attribution outside authoritative membership", () => {
		const prompt = assembleSystemPrompt(promptSource).replaceAll(
			/\s+/gu,
			" ",
		);
		expect(prompt).toContain("Always resolve it");
		expect(prompt).toContain(
			"Never add, remove, reorder, reject, repair, or reclassify membership",
		);
		expect(prompt).toContain("application injects surfaceKind Citation");
		expect(prompt).toContain("explicitly shortened citation");
		expect(prompt).not.toContain('"decision":');
		expect(
			corpus.cases["grammar-de-aphorism-nachahmer"]?.input.markedContext,
		).toStartWith("Ebner-Eschenbach schrieb");
		expect(
			corpus.cases["grammar-de-aphorism-vertrauen-discontinuous"]?.input
				.markedContext,
		).toContain("schrieb sie");
		expect(
			corpus.cases["grammar-de-aphorism-grundsaetze"]?.input
				.markedContext,
		).toContain("Morgenstund hat Gold im Mund");
	});

	test("pins historical Variant, Typo repair, repetition, and genuine Partial", () => {
		expect(
			corpus.cases["grammar-de-aphorism-historical-muss"]?.idealOutput,
		).toMatchObject({
			memberOrthographies: [
				"Standard",
				"Standard",
				"Standard",
				"Standard",
				"Standard",
				"Standard",
			],
			normalizedMembers: [
				"Wer",
				"nichts",
				"weiß",
				"muß",
				"alles",
				"glauben",
			],
			surface: { spelling: "Variant" },
			lemma: { canonicalForm: "Wer nichts weiß muss alles glauben" },
		});
		expect(
			corpus.cases["grammar-de-aphorism-typo-hoert"]?.idealOutput
				.memberOrthographies,
		).toContain("Typo");
		expect(
			corpus.cases[
				"grammar-de-aphorism-alter"
			]?.input.markedContext.match(/verklärt/gu),
		).toHaveLength(2);
		expect(
			corpus
				.all()
				.ids.filter(
					(id) =>
						corpus.cases[id]?.idealOutput.realizationCoverage ===
						"Partial",
				),
		).toEqual([
			"grammar-de-aphorism-verstehen-partial",
			"grammar-de-aphorism-widerspruch-partial",
			"grammar-de-aphorism-kunst-tempel-partial",
		]);
		for (const id of [
			"grammar-de-aphorism-verstehen-partial",
			"grammar-de-aphorism-widerspruch-partial",
			"grammar-de-aphorism-kunst-tempel-partial",
		]) {
			expect(corpus.cases[id]?.input.markedContext).toContain("…");
		}
	});

	test("restores application-owned empty core and linked Citation through codecs", () => {
		const model =
			corpus.cases["grammar-de-aphorism-alt-werden"]?.idealOutput;
		if (model === undefined) throw new Error("Missing Aphorism fixture.");
		const runtime = aphorismResolutionCodec.decode(model);
		expect(runtime.lemma).toEqual({
			canonicalForm: "Alt werden heißt sehend werden",
			coreFeatures: {},
		});
		const lemma = deAphorismLemmaCodec.decode(runtime.lemma);
		expect(lemma).toMatchObject({
			language: "de",
			family: "Phraseme",
			kind: "Aphorism",
		});
		expect(
			buildDeAphorismCitationSurfaceCodec(lemma).decode({
				...model.surface,
				surfaceKind: "Citation",
				normalizedSurface: model.normalizedMembers.join(" "),
			}),
		).toMatchObject({ language: "de", surfaceKind: "Citation", lemma });
	});
});
