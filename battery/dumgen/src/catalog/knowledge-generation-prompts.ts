import type { ZodType } from "zod";
import { DUMGEN_GENERATION_MODEL } from "../ai-sdk/model-policy";
import {
	type GermanKnowledgeFamily,
	germanKnowledgeFamilies,
} from "../knowledge-generation/de/families";
import {
	type GeneratedKnowledgeUpdate,
	projectGermanKnowledgeUpdate,
} from "../knowledge-generation/de/projection";
import type {
	GermanKnowledgeAnalysis,
	GermanKnowledgeGenerationInput,
} from "../knowledge-generation/de/runtime-schema";
import {
	assertGermanKnowledgeAnalysisMirrorsRequest,
	germanKnowledgeAnalysisSchemaForFamily,
	germanKnowledgeGenerationInputSchemaForFamily,
	modelOutputSchemaForGermanKnowledge,
} from "../knowledge-generation/de/schemas";
import { systemPrompt as constructionSystemPrompt } from "../promptsmith/production/generated-system-prompt/knowledge-analysis/de/construction";
import { systemPrompt as lexemeSystemPrompt } from "../promptsmith/production/generated-system-prompt/knowledge-analysis/de/lexeme";
import { systemPrompt as morphemeSystemPrompt } from "../promptsmith/production/generated-system-prompt/knowledge-analysis/de/morpheme";
import { systemPrompt as phrasemeSystemPrompt } from "../promptsmith/production/generated-system-prompt/knowledge-analysis/de/phraseme";
import type {
	Prompt,
	PromptCatalogEntry,
	PromptProjectionContext,
} from "./prompt-definition";

export type GermanKnowledgePrompt = Omit<
	Prompt<
		ZodType<GermanKnowledgeGenerationInput>,
		ZodType<GermanKnowledgeAnalysis>,
		GeneratedKnowledgeUpdate
	>,
	"modelOutputSchemaFor" | "projectOutput"
> & {
	modelOutputSchemaFor: typeof modelOutputSchemaForGermanKnowledge;
	projectOutput(
		input: GermanKnowledgeGenerationInput,
		generated: GermanKnowledgeAnalysis,
		context?: PromptProjectionContext,
	): GeneratedKnowledgeUpdate;
};

const systemPromptByFamily: Readonly<Record<GermanKnowledgeFamily, string>> =
	Object.freeze({
		Lexeme: lexemeSystemPrompt,
		Phraseme: phrasemeSystemPrompt,
		Morpheme: morphemeSystemPrompt,
		Construction: constructionSystemPrompt,
	});

function knowledgePromptEntry(
	family: GermanKnowledgeFamily,
): PromptCatalogEntry<GermanKnowledgePrompt> {
	const inputSchema = germanKnowledgeGenerationInputSchemaForFamily(family);
	const outputSchema = germanKnowledgeAnalysisSchemaForFamily(family);
	const prompt: GermanKnowledgePrompt = {
		systemPrompt: systemPromptByFamily[family],
		inputSchema,
		outputSchema,
		modelOutputSchemaFor: modelOutputSchemaForGermanKnowledge,
		outputPostcondition: {
			assert(input, generated) {
				assertGermanKnowledgeAnalysisMirrorsRequest(
					input as never,
					generated as never,
				);
			},
		},
		projectOutput(input, generated, context) {
			return projectGermanKnowledgeUpdate(
				input as never,
				generated as never,
				{
					onFilteredRelationTarget: context?.reportDiagnostic,
				},
			);
		},
		generationParams: {
			model: DUMGEN_GENERATION_MODEL,
			maxOutputTokens: 4096,
		},
	};
	return { meta: { kind: "prompt" }, prompt };
}

export const knowledgeGenerationPromptCatalog: Readonly<
	Record<GermanKnowledgeFamily, PromptCatalogEntry<GermanKnowledgePrompt>>
> = Object.fromEntries(
	germanKnowledgeFamilies.map((family) => [
		family,
		knowledgePromptEntry(family),
	]),
) as Readonly<
	Record<GermanKnowledgeFamily, PromptCatalogEntry<GermanKnowledgePrompt>>
>;
