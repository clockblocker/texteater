import { DUMGEN_GENERATION_MODEL } from "../ai-sdk/model-policy";
import { systemPrompt as lexicalResolutionSystemPrompt } from "../promptsmith/production/generated-system-prompt/knowledge-analysis/lexical-breakdown/resolution";
import { systemPrompt as lexicalSegmentationSystemPrompt } from "../promptsmith/production/generated-system-prompt/knowledge-analysis/lexical-breakdown/segmentation";
import { systemPrompt as morphologicalResolutionSystemPrompt } from "../promptsmith/production/generated-system-prompt/knowledge-analysis/morphological-tree/resolution";
import { systemPrompt as morphologicalSegmentationSystemPrompt } from "../promptsmith/production/generated-system-prompt/knowledge-analysis/morphological-tree/segmentation";
import { systemPrompt as translationAnalysisSystemPrompt } from "../promptsmith/production/generated-system-prompt/knowledge-analysis/translation";
import { projectTranslationChange } from "../promptsmith/production/knowledge-analysis/projection";
import {
	lexicalResolutionInputSchema,
	lexicalResolutionOutputSchema,
	lexicalSegmentationInputSchema,
	lexicalSegmentationOutputSchema,
	morphologicalResolutionInputSchema,
	morphologicalResolutionOutputSchema,
	morphologicalSegmentationInputSchema,
	morphologicalSegmentationOutputSchema,
	translationAnalysisInputSchema,
	translationAnalysisOutputSchema,
} from "../promptsmith/production/knowledge-analysis/schemas";
import type { Prompt, PromptCatalogEntry } from "./prompt-definition";

function promptEntry<Definition extends Prompt>(
	prompt: Definition,
): PromptCatalogEntry<Definition> {
	return { meta: { kind: "prompt" }, prompt };
}

const morphologicalSegmentationPrompt = {
	systemPrompt: morphologicalSegmentationSystemPrompt,
	inputSchema: morphologicalSegmentationInputSchema,
	outputSchema: morphologicalSegmentationOutputSchema,
	generationParams: { model: DUMGEN_GENERATION_MODEL, maxOutputTokens: 4096 },
} satisfies Prompt<
	typeof morphologicalSegmentationInputSchema,
	typeof morphologicalSegmentationOutputSchema
>;

const morphologicalResolutionPrompt = {
	systemPrompt: morphologicalResolutionSystemPrompt,
	inputSchema: morphologicalResolutionInputSchema,
	outputSchema: morphologicalResolutionOutputSchema,
	generationParams: { model: DUMGEN_GENERATION_MODEL, maxOutputTokens: 4096 },
} satisfies Prompt<
	typeof morphologicalResolutionInputSchema,
	typeof morphologicalResolutionOutputSchema
>;

const lexicalSegmentationPrompt = {
	systemPrompt: lexicalSegmentationSystemPrompt,
	inputSchema: lexicalSegmentationInputSchema,
	outputSchema: lexicalSegmentationOutputSchema,
	generationParams: { model: DUMGEN_GENERATION_MODEL, maxOutputTokens: 3072 },
} satisfies Prompt<
	typeof lexicalSegmentationInputSchema,
	typeof lexicalSegmentationOutputSchema
>;

const lexicalResolutionPrompt = {
	systemPrompt: lexicalResolutionSystemPrompt,
	inputSchema: lexicalResolutionInputSchema,
	outputSchema: lexicalResolutionOutputSchema,
	generationParams: { model: DUMGEN_GENERATION_MODEL, maxOutputTokens: 3072 },
} satisfies Prompt<
	typeof lexicalResolutionInputSchema,
	typeof lexicalResolutionOutputSchema
>;

const translationAnalysisPrompt = {
	systemPrompt: translationAnalysisSystemPrompt,
	inputSchema: translationAnalysisInputSchema,
	outputSchema: translationAnalysisOutputSchema,
	outputPostcondition: {
		assert(input, generated) {
			if (
				generated.decision === "Covered" &&
				input.existingTranslations[generated.existingIndex] ===
					undefined
			) {
				throw new Error(
					"Translation Analysis selected a missing existing Translation.",
				);
			}
		},
	},
	projectOutput(input, generated) {
		return projectTranslationChange(input, generated);
	},
	generationParams: { model: DUMGEN_GENERATION_MODEL, maxOutputTokens: 128 },
} satisfies Prompt<
	typeof translationAnalysisInputSchema,
	typeof translationAnalysisOutputSchema,
	ReturnType<typeof projectTranslationChange>
>;

export const LEGACY_KNOWLEDGE_PROMPT_CATALOG = {
	translation: promptEntry(translationAnalysisPrompt),
	morphologicalTree: {
		segmentation: promptEntry(morphologicalSegmentationPrompt),
		resolution: promptEntry(morphologicalResolutionPrompt),
	},
	lexicalBreakdown: {
		segmentation: promptEntry(lexicalSegmentationPrompt),
		resolution: promptEntry(lexicalResolutionPrompt),
	},
} as const;
