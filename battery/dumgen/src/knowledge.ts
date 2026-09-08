import type { ModelGenerator } from "./ai-sdk/ai-sdk";
import {
	RUNTIME_KNOWLEDGE_PROMPT_CATALOG,
	runtimeGermanKnowledgePromptForFamily,
} from "./catalog/runtime-prompt-catalog";
import {
	createKnowledgeDumgen,
	type KnowledgeDumgen,
} from "./knowledge-generation/build";

export type KnowledgeDumgenOptions = {
	readonly modelGenerator: ModelGenerator;
};

export function buildKnowledgeDumgen(
	options: KnowledgeDumgenOptions,
): KnowledgeDumgen {
	return createKnowledgeDumgen(options);
}

export type { KnowledgeDumgen };
export {
	RUNTIME_KNOWLEDGE_PROMPT_CATALOG as germanKnowledgeGenerationPrompts,
	runtimeGermanKnowledgePromptForFamily as germanKnowledgePromptForFamily,
};
