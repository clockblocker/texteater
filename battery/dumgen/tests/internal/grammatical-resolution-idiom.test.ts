import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	acceptanceEvaluation,
	developmentEvaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-idiom/evaluation-suite";
import { evaluateIdiomGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-idiom/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/idiom/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/idiom/prompt-source";
import {
	buildDeIdiomCitationSurfaceCodec,
	buildDeIdiomInflectionSurfaceCodec,
	deIdiomLemmaCodec,
	idiomResolutionCodec,
	inputSchema,
	outputSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/idiom/schemas";

describe("Phraseme/Idiom canonical total contract", () => {
	test("freezes 32 cases into disjoint 6/16/10 partitions", () => {
		expect(corpus.all().ids).toHaveLength(32);
		expect(demonstrations.ids).toHaveLength(6);
		expect(developmentEvaluation.ids).toHaveLength(16);
		expect(acceptanceEvaluation.ids).toHaveLength(10);
		expect(demonstrations.isDisjointFrom(developmentEvaluation)).toBe(true);
		expect(demonstrations.isDisjointFrom(acceptanceEvaluation)).toBe(true);
		expect(developmentEvaluation.isDisjointFrom(acceptanceEvaluation)).toBe(
			true,
		);
		expect(
			demonstrations
				.union(developmentEvaluation)
				.union(acceptanceEvaluation).ids,
		).toEqual(corpus.all().ids);
		expect(acceptanceEvaluation.ids).toEqual([
			"grammar-de-idiom-wolke-present-full",
			"grammar-de-idiom-wolken-past-full",
			"grammar-de-idiom-katze-perfect-full",
			"grammar-de-idiom-kirche-imperative-full",
			"grammar-de-idiom-blatt-future-full",
			"grammar-de-idiom-kopf-sand-typo-perfect",
			"grammar-de-idiom-licht-passive-full",
			"grammar-de-idiom-haende-present-full",
			"grammar-de-idiom-schlauch-present-full",
			"grammar-de-idiom-segel-ellipsis-partial",
		]);
	});

	test("uses exact canonical inputs and a strict flat total DTO", () => {
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
				evaluateIdiomGrammaticalResolution({
					caseId: "ideal-output",
					input: testCase.input,
					idealOutput: testCase.idealOutput,
					output: testCase.idealOutput,
				}).contractPass,
			).toBe(true);
		}

		const fixture = corpus.cases["grammar-de-idiom-flinte-past-full"];
		if (fixture === undefined) throw new Error("Missing Idiom fixture.");
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
					normalizedSurface: "x",
				},
			}).success,
		).toBe(false);
		expect(
			inputSchema.safeParse({
				markedContext: "Er <TARGET>warf</TARGET> auf.",
				members: ["auf"],
			}).success,
		).toBe(false);
	});

	test("teaches authoritative membership and the narrow ellipsis-only Partial policy", () => {
		const prompt = assembleSystemPrompt(promptSource).replaceAll(
			/\s+/gu,
			" ",
		);
		expect(prompt).toContain("Always resolve it");
		expect(prompt).toContain(
			"Never add, remove, reorder, reject, repair, or reclassify input membership",
		);
		expect(prompt).toContain("recoverable coordination ellipsis");
		expect(prompt).toContain(
			"An overt but unselected word is not evidence of Partial",
		);
		expect(prompt).toContain(
			"The codec also permits the fifth, underspecified verbal branch",
		);
		expect(prompt).not.toContain("return Unresolved");
		expect(prompt).not.toContain('"decision":');

		const partialIds = corpus
			.all()
			.ids.filter(
				(id) =>
					corpus.cases[id]?.idealOutput.realizationCoverage ===
					"Partial",
			);
		expect(partialIds).toEqual([
			"grammar-de-idiom-handtuch-ellipsis-partial",
			"grammar-de-idiom-kuerzeren-ellipsis-partial",
			"grammar-de-idiom-segel-ellipsis-partial",
		]);
		expect(
			corpus.cases["grammar-de-idiom-bett-literal-figurative-full"]?.input
				.markedContext,
		).toContain("das historische Bett hütete");
	});

	test("covers Citation and all five codec-supported verbal branches", () => {
		const surfaces = corpus
			.all()
			.cases.map(({ idealOutput }) => idealOutput.surface);
		expect(
			surfaces.some(({ surfaceKind }) => surfaceKind === "Citation"),
		).toBe(true);
		const inflections = surfaces.flatMap((surface) =>
			surface.surfaceKind === "Inflection"
				? [surface.inflectionalFeatures]
				: [],
		);
		expect(inflections.some(({ verbForm }) => verbForm === "Fin")).toBe(
			true,
		);
		expect(inflections.some(({ verbForm }) => verbForm === "Inf")).toBe(
			true,
		);
		expect(inflections.some(({ verbForm }) => verbForm === "Part")).toBe(
			true,
		);
		expect(
			outputSchema.safeParse({
				memberOrthographies: ["Standard", "Standard"],
				normalizedMembers: ["sei", "gewesen"],
				realizationCoverage: "Full",
				surface: {
					spelling: "Canonical",
					surfaceKind: "Inflection",
					surfaceFeatures: null,
					inflectionalFeatures: {
						number: null,
						tense: null,
						verbForm: null,
						voice: null,
					},
				},
				lemma: { canonicalForm: "da gewesen sein" },
			}).success,
		).toBe(true);
		expect(
			corpus.cases["grammar-de-idiom-kalte-schulter-future-full"]?.input
				.members[0],
		).toBe("wird");
		expect(
			corpus.cases["grammar-de-idiom-nagel-passive-full"]?.idealOutput
				.surface,
		).toMatchObject({
			inflectionalFeatures: { verbForm: "Part", voice: "Pass" },
		});
	});

	test("derives application-owned empty core and linked canonical Surfaces through codecs", () => {
		const model =
			corpus.cases["grammar-de-idiom-grass-citation"]?.idealOutput;
		if (model?.surface.surfaceKind !== "Citation") {
			throw new Error("Missing Citation fixture.");
		}
		const runtime = idiomResolutionCodec.decode(model);
		expect(runtime.lemma).toEqual({
			canonicalForm: "ins Gras beißen",
			coreFeatures: {},
		});

		const lemma = deIdiomLemmaCodec.decode(runtime.lemma);
		expect(lemma).toMatchObject({
			language: "de",
			family: "Phraseme",
			kind: "Idiom",
		});
		const citation = buildDeIdiomCitationSurfaceCodec(lemma).decode({
			...model.surface,
			normalizedSurface: model.normalizedMembers.join(" "),
		});
		expect(citation).toMatchObject({ language: "de", lemma });

		const inflected =
			corpus.cases["grammar-de-idiom-faeustchen-perfect-full"]
				?.idealOutput;
		if (inflected?.surface.surfaceKind !== "Inflection")
			throw new Error("Missing Inflection fixture.");
		expect(
			buildDeIdiomInflectionSurfaceCodec(
				deIdiomLemmaCodec.decode(
					idiomResolutionCodec.decode(inflected).lemma,
				),
			).decode({
				...inflected.surface,
				normalizedSurface: inflected.normalizedMembers.join(" "),
			}),
		).toMatchObject({ language: "de", surfaceKind: "Inflection" });
	});
});
