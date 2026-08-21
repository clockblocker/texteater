import type { AiSdk } from "../ai-sdk/ai-sdk";
import { runtimeCombinedGermanKnowledgePrompt } from "../catalog/runtime-prompt-catalog";
import {
	buildGeneratorCatalog,
	type ModelExchange,
} from "../generator/generator";
import { DumgenError } from "../generator/generator-error";
import type {
	KnowledgeGenerationInput,
	KnowledgeGenerationLanguage,
	KnowledgeGenerationResult,
} from "../types";
import { createGermanKnowledgeGeneration } from "./de/runtime";

const KNOWLEDGE_PROMPT_CATALOG = {
	laboratory: {
		knowledge: { de: { combined: runtimeCombinedGermanKnowledgePrompt } },
	},
} as const;

export type KnowledgeDumgen = {
	readonly generate: {
		knowledge(
			language: KnowledgeGenerationLanguage,
			input: KnowledgeGenerationInput<"de">,
		): Promise<KnowledgeGenerationResult>;
	};
};

export function createKnowledgeDumgen(options: {
	readonly sdk: AiSdk;
	readonly onModelExchange?: (exchange: ModelExchange) => void;
}): KnowledgeDumgen {
	const generators = buildGeneratorCatalog(
		KNOWLEDGE_PROMPT_CATALOG,
		options.sdk,
		{ onModelExchange: options.onModelExchange },
	);
	const generateGermanKnowledge = createGermanKnowledgeGeneration(
		generators.laboratory.knowledge.de.combined,
	);

	async function knowledge(
		language: KnowledgeGenerationLanguage,
		input: KnowledgeGenerationInput<"de">,
	): Promise<KnowledgeGenerationResult> {
		if (language !== "de") {
			throw new DumgenError(
				"invalid-input",
				"Knowledge generation is not configured for this language.",
				{
					cause: new TypeError(
						`Unsupported Knowledge language: ${String(language)}.`,
					),
				},
			);
		}
		return generateGermanKnowledge(input);
	}

	return Object.freeze({
		generate: Object.freeze({ knowledge }),
	});
}
