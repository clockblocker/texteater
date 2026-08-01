import { describe, expect, test } from "bun:test";
import { runCodegen } from "codegen";

import type { AiSdk } from "../../src/ai-sdk/ai-sdk";
import { buildDumgen } from "../../src/dumgen";
import {
	assembleSystemPrompt,
	validateExamples,
} from "../../src/promptsmith/assembly";
import { systemPromptRecipe } from "../../src/promptsmith/assembly/generate-system-prompts";
import {
	buildDeNounInflectionSurfaceCodec,
	deNounLemmaCodec,
} from "../../src/promptsmith/laboratory/de-noun-codecs";
import { systemPrompt as generatedSegmentationSystemPrompt } from "../../src/promptsmith/laboratory/generated-system-prompt/segmentation/de";
import { body as segmentationBody } from "../../src/promptsmith/laboratory/prompt-part/segmentation/de/body";
import { examplesForTest as segmentationTestExamples } from "../../src/promptsmith/laboratory/prompt-part/segmentation/de/examples-for-test";
import { examplesToUse as segmentationUseExamples } from "../../src/promptsmith/laboratory/prompt-part/segmentation/de/examples-to-use";
import { inputSchema as segmentationInputSchema } from "../../src/promptsmith/laboratory/prompt-part/segmentation/de/input-schema";
import { outputSchema as segmentationOutputSchema } from "../../src/promptsmith/laboratory/prompt-part/segmentation/de/output-schema";

describe("Prompt Assembly", () => {
	test("renders stable use examples without IDs or test examples", () => {
		const source = {
			route: "segmentation/de",
			inputSchema: segmentationInputSchema,
			outputSchema: segmentationOutputSchema,
			body: segmentationBody,
			examplesToUse: segmentationUseExamples,
		};
		const first = assembleSystemPrompt(source);
		const second = assembleSystemPrompt(source);

		expect(first).toBe(second);
		expect(first).toBe(generatedSegmentationSystemPrompt);
		expect(first).toContain('{"text":"Der Kaffee ist heiß."}');
		expect(first).not.toContain(segmentationUseExamples[0].id);
		expect(first).not.toContain(segmentationTestExamples[0].id);
		expect(first).not.toContain("quux42");
		expect(
			assembleSystemPrompt({
				...source,
				body: `${source.body}\nChanged.`,
			}),
		).not.toBe(first);
		expect(
			assembleSystemPrompt({
				...source,
				examplesToUse: [
					...source.examplesToUse,
					{
						id: "segmentation-use-second",
						input: { text: "Hallo!" },
						idealOutput: {
							segments: [
								{ kind: "ResolvableText", text: "Hallo" },
								{ kind: "Punctuation", text: "!" },
							],
						},
					},
				],
			}),
		).not.toBe(first);
	});

	test("reports route-specific example contract errors", () => {
		expect(() =>
			validateExamples(
				"segmentation/de",
				segmentationInputSchema,
				segmentationOutputSchema,
				[segmentationUseExamples[0], segmentationUseExamples[0]],
			),
		).toThrow(/Prompt Source "segmentation\/de".*duplicate example ID/);
	});

	test("committed generated system prompts are current", async () => {
		const result = await runCodegen(systemPromptRecipe, { mode: "check" });
		expect(result.status).toBe("clean");
		expect(result.applied).toEqual([]);
	});
});

describe("German noun reshape codecs", () => {
	test("round-trip model Lemma and Inflection Surface fields", () => {
		const modelLemma = {
			canonicalForm: "Bank",
			coreFeatures: { gender: "Fem", hyph: null },
		} as const;
		const lemma = deNounLemmaCodec.decode(modelLemma);
		expect(lemma).toEqual({
			...modelLemma,
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
		});
		expect(deNounLemmaCodec.encode(lemma)).toEqual(modelLemma);

		const modelSurface = {
			normalizedSurface: "Banken",
			spelling: "Canonical",
			realizationCoverage: "Full",
			surfaceKind: "Inflection",
			surfaceFeatures: null,
			inflectionalFeatures: { case: "Nom", number: "Plur" },
		} as const;
		const surfaceCodec = buildDeNounInflectionSurfaceCodec(lemma);
		const surface = surfaceCodec.decode(modelSurface);
		expect(surface).toEqual({
			...modelSurface,
			language: "de",
			lemma,
		});
		expect(surfaceCodec.encode(surface)).toEqual(modelSurface);
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
