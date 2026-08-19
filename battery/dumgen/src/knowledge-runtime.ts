import type { AiSdk } from "./ai-sdk/ai-sdk";
import type { ModelExchange } from "./generator/generator";
import {
	createKnowledgeDumgen,
	type KnowledgeDumgen,
} from "./knowledge-generation/build";

export type KnowledgeDumgenRuntimeOptions = {
	readonly sdk: AiSdk;
	readonly onModelExchange?: (exchange: ModelExchange) => void;
};

/** Builds Knowledge generation around an injected provider. */
export function buildKnowledgeDumgenRuntime(
	options: KnowledgeDumgenRuntimeOptions,
): KnowledgeDumgen {
	return createKnowledgeDumgen(options);
}

export type { AiSdk, KnowledgeDumgen };
