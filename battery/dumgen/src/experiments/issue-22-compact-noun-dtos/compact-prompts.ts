import type { AiSdk } from "../../ai-sdk/ai-sdk";
import type {
	Prompt,
	PromptCatalogEntry,
	PromptTree,
} from "../../catalog/prompt-definition";
import { buildGeneratorCatalog } from "../../generator/generator";
import { systemPrompt as grammaticalSystemPrompt } from "../../promptsmith/laboratory/experiments/issue-22-compact-noun-dtos/generated-system-prompt/grammatical-resolution/de/lexeme/noun";
import { systemPrompt as readingSystemPrompt } from "../../promptsmith/laboratory/experiments/issue-22-compact-noun-dtos/generated-system-prompt/reading-resolution/de/lexeme/noun";
import { inputSchema as grammaticalModelInputSchema } from "../../promptsmith/laboratory/experiments/issue-22-compact-noun-dtos/prompt-part/grammatical-resolution/de/lexeme/noun/input-schema";
import { outputSchema as grammaticalModelOutputSchema } from "../../promptsmith/laboratory/experiments/issue-22-compact-noun-dtos/prompt-part/grammatical-resolution/de/lexeme/noun/output-schema";
import { inputSchema as readingModelInputSchema } from "../../promptsmith/laboratory/experiments/issue-22-compact-noun-dtos/prompt-part/reading-resolution/de/lexeme/noun/input-schema";
import { outputSchema as readingModelOutputSchema } from "../../promptsmith/laboratory/experiments/issue-22-compact-noun-dtos/prompt-part/reading-resolution/de/lexeme/noun/output-schema";
import type { GrammaticalResolution, ReadingResolution } from "../../types";
import {
	compactGrammaticalInputCodec,
	compactGrammaticalOutputCodec,
	compactReadingInputCodec,
	compactReadingOutputCodec,
	grammaticalInputSchema,
	readingInputSchema,
} from "./compact-codecs";

const grammaticalPrompt = {
	systemPrompt: grammaticalSystemPrompt,
	inputSchema: grammaticalInputSchema,
	modelInputSchema: grammaticalModelInputSchema,
	outputSchema: grammaticalModelOutputSchema,
	projectInput(input) {
		return compactGrammaticalInputCodec.encode(input);
	},
	outputPostcondition: {
		assert(input, generated) {
			const canonical = compactGrammaticalOutputCodec.decode(generated);
			if (canonical.decision === "Unresolved") return;
			const markerCount =
				input.markedContext.match(/<TARGET>/gu)?.length ?? 0;
			const closingCount =
				input.markedContext.match(/<\/TARGET>/gu)?.length ?? 0;
			if (
				markerCount < 1 ||
				markerCount !== closingCount ||
				canonical.memberOrthographies.length !== markerCount
			) {
				throw new Error(
					"Compact member orthographies must align one-to-one with TARGET markers.",
				);
			}
		},
	},
	projectOutput(_input, generated): GrammaticalResolution {
		return compactGrammaticalOutputCodec.decode(generated);
	},
	generationParams: { model: "gpt-5-nano", maxOutputTokens: 1024 },
} satisfies Prompt<
	typeof grammaticalInputSchema,
	typeof grammaticalModelOutputSchema,
	GrammaticalResolution,
	typeof grammaticalModelInputSchema
>;

const readingPrompt = {
	systemPrompt: readingSystemPrompt,
	inputSchema: readingInputSchema,
	modelInputSchema: readingModelInputSchema,
	outputSchema: readingModelOutputSchema,
	projectInput(input) {
		return compactReadingInputCodec.encode(input);
	},
	projectOutput(_input, generated): ReadingResolution {
		return compactReadingOutputCodec.decode(generated);
	},
	generationParams: { model: "gpt-5-nano", maxOutputTokens: 192 },
} satisfies Prompt<
	typeof readingInputSchema,
	typeof readingModelOutputSchema,
	ReadingResolution,
	typeof readingModelInputSchema
>;

function promptEntry<Definition extends Prompt>(
	prompt: Definition,
): PromptCatalogEntry<Definition> {
	return { meta: { kind: "prompt" }, prompt };
}

// Deliberately not imported by the default PROMPT_CATALOG or public entrypoint.
export const COMPACT_NOUN_EXPERIMENT_CATALOG = {
	grammaticalResolution: promptEntry(grammaticalPrompt),
	readingResolution: promptEntry(readingPrompt),
} as const satisfies PromptTree;

export function buildCompactNounExperiment(sdk: AiSdk) {
	return buildGeneratorCatalog(COMPACT_NOUN_EXPERIMENT_CATALOG, sdk);
}
