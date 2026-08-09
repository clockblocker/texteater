import { describe, expect, test } from "bun:test";
import { runCodegen } from "codegen";
import type { Lemma, Surface } from "dumling/types";
import { zodTextFormat } from "openai/helpers/zod";

import type { AiSdk } from "../../src/ai-sdk/ai-sdk";
import { PROMPT_CATALOG } from "../../src/catalog/prompt-catalog";
import { buildGeneratorCatalog } from "../../src/generator/generator";
import { assertIntakeBatch } from "../../src/intake/contracts";
import {
	assembleSystemPrompt,
	defineLocalDemonstrations,
} from "../../src/promptsmith/assembly";
import { systemPromptRecipe } from "../../src/promptsmith/assembly/generate-system-prompts";
import { systemPrompt as generatedIntakeSystemPrompt } from "../../src/promptsmith/laboratory/generated-system-prompt/intake";
import { corpus as intakeCorpus } from "../../src/promptsmith/laboratory/prompt-source/intake/golden-corpus/corpus";
import { promptSource as intakePromptSource } from "../../src/promptsmith/laboratory/prompt-source/intake/prompt-source";
import { corpus as readingCorpus } from "../../src/promptsmith/laboratory/prompt-source/reading-resolution/de/golden-corpus/corpus";
import {
	buildDeNounCitationSurfaceCodec,
	buildDeNounInflectionSurfaceCodec,
	deNounLemmaCodec,
	deNounModelCitationSurfaceSchema,
	deNounModelInflectionSurfaceSchema,
	deNounModelLemmaSchema,
} from "../../src/schema/de-noun-codecs";
import { normalizedMembersSchema } from "../../src/schema/normalized-surface-projection";

describe("Prompt Assembly", () => {
	test("renders the stable batch-only Intake contract", () => {
		const first = assembleSystemPrompt(intakePromptSource);
		const second = assembleSystemPrompt(intakePromptSource);

		expect(first).toBe(second);
		expect(first).toBe(generatedIntakeSystemPrompt);
		expect(first).toContain("caller-delimited source sentences");
		expect(first).toContain("Das H au s ist groß.");
		expect(first).toContain("אני הו לך הביתה.");
		expect(
			assembleSystemPrompt({
				...intakePromptSource,
				body: `${intakePromptSource.body}\nChanged.`,
			}),
		).not.toBe(first);
		expect(
			assembleSystemPrompt({
				...intakePromptSource,
				demonstrations: defineLocalDemonstrations({
					inputSchema: intakePromptSource.inputSchema,
					outputSchema: intakePromptSource.outputSchema,
					cases: [],
				}),
			}),
		).not.toBe(first);
	});

	test("owns the multilingual/noisy Intake corpus and pins its demonstrations", () => {
		expect(intakeCorpus.collections.core.ids).toEqual([
			"intake-de-core",
			"intake-he-core",
			"intake-unsupported",
			"intake-de-boundary-isolation",
		]);
		const demonstrations = intakePromptSource.demonstrations;
		if (demonstrations === undefined || !("ids" in demonstrations)) {
			throw new Error("Intake demonstrations must be a Case Selection.");
		}
		expect(demonstrations.ids).toEqual([
			"intake-de-core",
			"intake-he-core",
		]);
		for (const goldenCase of Object.values(intakeCorpus.cases)) {
			expect(() =>
				assertIntakeBatch(goldenCase.input, goldenCase.idealOutput),
			).not.toThrow();
		}
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
		const prompt = assembleSystemPrompt(intakePromptSource);
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

	test("all four active schemas are accepted by OpenAI Structured Outputs", () => {
		const prompts = [
			PROMPT_CATALOG.laboratory.intake.prompt,
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

	test("rejects empty Intake batches and invalid emoji descriptions", () => {
		expect(
			PROMPT_CATALOG.laboratory.intake.prompt.inputSchema.safeParse({
				items: [],
			}).success,
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
		expect(resolvedSchema.shape.normalizedMembers).toBe(
			normalizedMembersSchema,
		);
		const [citationSurface, inflectionSurface] =
			resolvedSchema.shape.surface.options;
		expect(Object.keys(citationSurface.shape)).toEqual([
			"spelling",
			"surfaceKind",
			"surfaceFeatures",
		]);
		expect(citationSurface.shape.spelling).toBe(
			deNounModelCitationSurfaceSchema.shape.spelling,
		);
		expect(citationSurface.shape.surfaceKind).toBe(
			deNounModelCitationSurfaceSchema.shape.surfaceKind,
		);
		expect(citationSurface.shape.surfaceFeatures).toBe(
			deNounModelCitationSurfaceSchema.shape.surfaceFeatures,
		);
		expect(Object.keys(inflectionSurface.shape)).toEqual([
			"spelling",
			"surfaceKind",
			"surfaceFeatures",
			"inflectionalFeatures",
		]);
		expect(inflectionSurface.shape.spelling).toBe(
			deNounModelInflectionSurfaceSchema.shape.spelling,
		);
		expect(inflectionSurface.shape.surfaceKind).toBe(
			deNounModelInflectionSurfaceSchema.shape.surfaceKind,
		);
		expect(inflectionSurface.shape.surfaceFeatures).toBe(
			deNounModelInflectionSurfaceSchema.shape.surfaceFeatures,
		);
		expect(inflectionSurface.shape.inflectionalFeatures).toBe(
			deNounModelInflectionSurfaceSchema.shape.inflectionalFeatures,
		);
		expect(
			PROMPT_CATALOG.laboratory.readingResolution.de.prompt.inputSchema.shape.lemma.safeParse(
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
		expect(
			surfaceCodec.decode({
				...modelSurface,
				surfaceFeatures: { historicalStatus: null },
			}),
		).toEqual(surface);
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
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				lemma: otherLemma,
				inflectionalFeatures: { case: "Nom", number: "Plur" },
			}),
		).toThrow(/fixed field "lemma"/);
	});
});

test("Intake preserves batch order, stitching, and one language context", async () => {
	const outputs = [
		{
			language: "de",
			items: [
				{
					id: "item-0",
					decision: "Accepted",
					language: "de",
					stitchedText: "Das Haus",
				},
			],
		},
	];
	const sdk: AiSdk = {
		async structuredGeneration() {
			return outputs.shift() as never;
		},
		async unstructuredGeneration() {
			throw new Error("not used");
		},
	};
	const generate = buildGeneratorCatalog(PROMPT_CATALOG, sdk);

	expect(
		await generate.laboratory.intake({
			items: [{ id: "item-0", sourceText: "Das H au s" }],
		}),
	).toEqual({
		language: "de",
		items: [
			{
				id: "item-0",
				decision: "Accepted",
				language: "de",
				stitchedText: "Das Haus",
			},
		],
	});
});
