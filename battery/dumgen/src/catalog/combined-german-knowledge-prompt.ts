import { DUMGEN_GENERATION_MODEL } from "../ai-sdk/model-policy";
import { projectGermanKnowledgeUpdate } from "../knowledge-generation/de/projection";
import {
	assertGermanKnowledgeAnalysisMirrorsRequest,
	germanKnowledgeAnalysisSchema,
	germanKnowledgeGenerationInputSchema,
	modelOutputSchemaForGermanKnowledge,
} from "../knowledge-generation/de/schemas";
import { systemPrompt as combinedGermanKnowledgeSystemPrompt } from "../promptsmith/production/generated-system-prompt/knowledge-analysis/de/combined";
import type { Prompt, PromptCatalogEntry } from "./prompt-definition";

type CombinedGermanKnowledgePrompt = Omit<
	Prompt<
		typeof germanKnowledgeGenerationInputSchema,
		typeof germanKnowledgeAnalysisSchema,
		ReturnType<typeof projectGermanKnowledgeUpdate>
	>,
	"modelOutputSchemaFor" | "projectOutput"
> & {
	modelOutputSchemaFor: typeof modelOutputSchemaForGermanKnowledge;
	projectOutput: typeof projectGermanKnowledgeUpdate;
};

const prompt: CombinedGermanKnowledgePrompt = {
	systemPrompt: combinedGermanKnowledgeSystemPrompt,
	inputSchema: germanKnowledgeGenerationInputSchema,
	outputSchema: germanKnowledgeAnalysisSchema,
	modelOutputSchemaFor: modelOutputSchemaForGermanKnowledge,
	outputPostcondition: {
		assert(input, generated) {
			assertGermanKnowledgeAnalysisMirrorsRequest(input, generated);
		},
	},
	projectOutput(input, generated) {
		return projectGermanKnowledgeUpdate(input, generated);
	},
	generationParams: { model: DUMGEN_GENERATION_MODEL, maxOutputTokens: 4096 },
};

export const combinedGermanKnowledgePrompt: PromptCatalogEntry<CombinedGermanKnowledgePrompt> =
	{
		meta: { kind: "prompt" },
		prompt,
	};
