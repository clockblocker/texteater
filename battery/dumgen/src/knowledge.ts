import { buildAiSdk } from "./ai-sdk/ai-sdk";
import { combinedGermanKnowledgePrompt } from "./catalog/combined-german-knowledge-prompt";
import type { ModelExchange } from "./generator/generator";
import {
	createKnowledgeDumgen,
	type KnowledgeDumgen,
} from "./knowledge-generation/build";

export type KnowledgeDumgenOptions = {
	readonly apiKey?: string;
	readonly sdk?: import("./ai-sdk/ai-sdk").AiSdk;
	readonly onModelExchange?: (exchange: ModelExchange) => void;
};

export function buildKnowledgeDumgen(
	options: KnowledgeDumgenOptions = {},
): KnowledgeDumgen {
	const sdk = options.sdk ?? buildAiSdk({ apiKey: options.apiKey });
	return createKnowledgeDumgen({
		sdk,
		onModelExchange: options.onModelExchange,
	});
}

export type { KnowledgeDumgen };
export { combinedGermanKnowledgePrompt };
