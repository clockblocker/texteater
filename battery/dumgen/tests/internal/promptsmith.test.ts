import { describe, expect, test } from "bun:test";
import { runCodegen } from "codegen";
import type { Lemma, Surface } from "dumling/types";
import { zodTextFormat } from "openai/helpers/zod";

import type { AiSdk } from "../../src/ai-sdk/ai-sdk";
import { PROMPT_CATALOG } from "../../src/catalog/prompt-catalog";
import { buildDumgen } from "../../src/dumgen";
import {
	assembleSystemPrompt,
	defineLocalDemonstrations,
} from "../../src/promptsmith/assembly";
import { systemPromptRecipe } from "../../src/promptsmith/assembly/generate-system-prompts";
import { systemPrompt as generatedSegmentationSystemPrompt } from "../../src/promptsmith/laboratory/generated-system-prompt/segmentation/de";
import { corpus as readingCorpus } from "../../src/promptsmith/laboratory/prompt-source/reading-resolution/de/golden-corpus/corpus";
import { promptSource as segmentationPromptSource } from "../../src/promptsmith/laboratory/prompt-source/segmentation/de/prompt-source";
import { outputSchema as segmentationOutputSchema } from "../../src/promptsmith/laboratory/prompt-source/segmentation/de/schemas";
import { deLemmaSchema } from "../../src/schema/de-lemma-schema";
import {
	buildDeNounCitationSurfaceCodec,
	buildDeNounInflectionSurfaceCodec,
	deNounLemmaCodec,
	deNounModelCitationSurfaceSchema,
	deNounModelInflectionSurfaceSchema,
	deNounModelLemmaSchema,
} from "../../src/schema/de-noun-codecs";

describe("Prompt Assembly", () => {
	test("renders stable use examples without IDs or test examples", () => {
		const first = assembleSystemPrompt(segmentationPromptSource);
		const second = assembleSystemPrompt(segmentationPromptSource);

		expect(first).toBe(second);
		expect(first).toBe(generatedSegmentationSystemPrompt);
		expect(first).toContain('{"text":"Still, aber wach!"}');
		expect(first).toContain("quux42");
		expect(first).not.toContain("segmentation-attached-punctuation");
		expect(first).not.toContain("segmentation-simple-sentence");
		expect(first).not.toContain('{"text":"Der Kaffee ist heiß."}');
		expect(
			assembleSystemPrompt({
				...segmentationPromptSource,
				body: `${segmentationPromptSource.body}\nChanged.`,
			}),
		).not.toBe(first);
		expect(
			assembleSystemPrompt({
				...segmentationPromptSource,
				demonstrations: defineLocalDemonstrations({
					inputSchema: segmentationPromptSource.inputSchema,
					outputSchema: segmentationPromptSource.outputSchema,
					cases: [],
				}),
			}),
		).not.toBe(first);
	});

	test("reports route-specific selection contract errors", () => {
		expect(() =>
			readingCorpus.select(["reading-de-tea", "reading-de-tea"]),
		).toThrow(/CaseSelection.*repeats case ID/);
		expect(() => readingCorpus.select(["missing"])).toThrow(
			/CaseSelection.*unknown case ID/,
		);
	});

	test("renders optional explanations as guidance outside the ideal output", () => {
		const prompt = assembleSystemPrompt(segmentationPromptSource);
		const explanation = "Revolt, not leave bed. New.";
		const readingPrompt =
			PROMPT_CATALOG.laboratory.readingResolution.de.prompt;

		expect(prompt).not.toContain("Explanation (guidance only");
		expect(readingPrompt.systemPrompt).toContain(
			`Explanation (guidance only; not part of the output):\n${explanation}`,
		);
	});

	test("committed generated system prompts are current", async () => {
		const result = await runCodegen(systemPromptRecipe, { mode: "check" });
		expect(result.status).toBe("clean");
		expect(result.applied).toEqual([]);
	});

	test("all five initial schemas are accepted by OpenAI Structured Outputs", () => {
		const prompts = [
			PROMPT_CATALOG.laboratory.intake.prompt,
			PROMPT_CATALOG.laboratory.segmentation.de.prompt,
			PROMPT_CATALOG.laboratory.targetClassification.de.highLevelWholeUnit
				.prompt,
			PROMPT_CATALOG.laboratory.grammaticalResolution.de.Lexeme.NOUN
				.prompt,
			PROMPT_CATALOG.laboratory.readingResolution.de.prompt,
		];

		for (const [index, prompt] of prompts.entries()) {
			expect(() =>
				zodTextFormat(prompt.outputSchema, `dumgen_test_${index}`),
			).not.toThrow();
		}
	});

	test("rejects empty segmentation and invalid emoji descriptions", () => {
		expect(
			segmentationOutputSchema.safeParse({ segments: [] }).success,
		).toBe(false);

		const readingOutputSchema =
			PROMPT_CATALOG.laboratory.readingResolution.de.prompt.outputSchema;
		const englandFlag =
			"\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}";
		const scotlandFlag =
			"\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}";
		for (const emojiDescription of [
			"🍳",
			"🇩🇪",
			englandFlag,
			scotlandFlag,
			"👩🏽‍💻",
			"☕️",
			"☕📚",
			"🍳☕📚🏦",
		]) {
			expect(
				readingOutputSchema.safeParse({
					decision: "New",
					emojiDescription,
				}).success,
			).toBe(true);
		}
		for (const emojiDescription of [
			" 🍳 ",
			"🍳 Küche",
			"Kaffee",
			"1",
			"🍳1",
			"☕\uFE0E",
			"👩🏽🏽",
			"🍳☕📚🏦🚶",
		]) {
			expect(
				readingOutputSchema.safeParse({
					decision: "New",
					emojiDescription,
				}).success,
			).toBe(false);
		}
	});
});

describe("German prompt projections", () => {
	test("derive the Promptsmith model schemas from the runtime codecs", () => {
		const resolvedSchema =
			PROMPT_CATALOG.laboratory.grammaticalResolution.de.Lexeme.NOUN.prompt.outputSchema.shape.resolution.unwrap();

		expect(resolvedSchema.shape.lemma).toBe(deNounModelLemmaSchema);
		expect(resolvedSchema.shape.surface.options).toEqual([
			deNounModelCitationSurfaceSchema,
			deNounModelInflectionSurfaceSchema,
		]);
		expect(
			PROMPT_CATALOG.laboratory.readingResolution.de.prompt.inputSchema
				.shape.lemma,
		).toBe(deLemmaSchema);
		expect(
			PROMPT_CATALOG.laboratory.readingResolution.de.prompt.modelInputSchema.shape.lemma.safeParse(
				"Bank",
			).success,
		).toBe(true);
	});

	test("round-trips model and canonical Lemma and Surface fields", () => {
		const modelLemma = {
			canonicalForm: "Bank",
			coreFeatures: { gender: "Fem", hyph: null },
		} as const;
		const lemma: Lemma<"de", "Lexeme", "NOUN"> =
			deNounLemmaCodec.decode(modelLemma);
		expect(lemma).toEqual({
			...modelLemma,
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
		});
		expect(deNounLemmaCodec.encode(lemma)).toEqual(modelLemma);

		const modelCitationSurface = {
			normalizedSurface: "Bank",
			spelling: "Canonical",
			realizationCoverage: "Full",
			surfaceKind: "Citation",
			surfaceFeatures: null,
		} as const;
		const citationCodec = buildDeNounCitationSurfaceCodec(lemma);
		const citationSurface: Surface<"de", "Citation", "Lexeme", "NOUN"> =
			citationCodec.decode(modelCitationSurface);
		expect(citationSurface).toEqual({
			...modelCitationSurface,
			language: "de",
			lemma,
		});
		expect(
			citationCodec.encode({
				...modelCitationSurface,
				language: "de",
				lemma,
			}),
		).toEqual(modelCitationSurface);

		const modelSurface = {
			normalizedSurface: "Banken",
			spelling: "Canonical",
			realizationCoverage: "Full",
			surfaceKind: "Inflection",
			surfaceFeatures: null,
			inflectionalFeatures: { case: "Nom", number: "Plur" },
		} as const;
		const surfaceCodec = buildDeNounInflectionSurfaceCodec(lemma);
		const surface: Surface<"de", "Inflection", "Lexeme", "NOUN"> =
			surfaceCodec.decode(modelSurface);
		expect(surface).toEqual({
			...modelSurface,
			language: "de",
			lemma,
		});
		expect(surfaceCodec.encode(surface)).toEqual(modelSurface);
	});

	test("rejects route or application fields that do not match the codec", () => {
		const modelLemma = {
			canonicalForm: "Bank",
			coreFeatures: { gender: "Fem", hyph: null },
		} as const;
		const lemma = deNounLemmaCodec.decode(modelLemma);
		expect(() =>
			deNounLemmaCodec.encode({ ...lemma, family: "Phraseme" } as never),
		).toThrow(/family|Lexeme/);

		const otherLemma = deNounLemmaCodec.decode({
			canonicalForm: "Haus",
			coreFeatures: { gender: "Neut", hyph: null },
		});
		const surfaceCodec = buildDeNounInflectionSurfaceCodec(lemma);
		expect(() =>
			surfaceCodec.encode({
				language: "de",
				normalizedSurface: "Banken",
				spelling: "Canonical",
				realizationCoverage: "Full",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				lemma: otherLemma,
				inflectionalFeatures: { case: "Nom", number: "Plur" },
			}),
		).toThrow(/fixed field "lemma"/);
	});
});

test("Intake preserves language for every decision", async () => {
	const outputs = [
		{ decision: "Accepted", language: "de" },
		{ decision: "UnsupportedLanguage", language: "fr" },
		{ decision: "Unintelligible", language: null },
	];
	const sdk: AiSdk = {
		async structuredGeneration() {
			return outputs.shift() as never;
		},
		async unstructuredGeneration() {
			throw new Error("not used");
		},
	};
	const generate = buildDumgen({ sdk });

	expect(await generate.laboratory.intake({ text: "Hallo" })).toEqual({
		decision: "Accepted",
		language: "de",
	});
	expect(await generate.laboratory.intake({ text: "Bonjour" })).toEqual({
		decision: "UnsupportedLanguage",
		language: "fr",
	});
	expect(await generate.laboratory.intake({ text: "%%%" })).toEqual({
		decision: "Unintelligible",
		language: null,
	});
});
