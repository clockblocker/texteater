import type { AiSdk } from "./ai-sdk/ai-sdk";
import { installEncodedRuntimePromptData } from "./generated/runtime-prompt-artifacts.js";
import type { ModelExchange } from "./generator/generator";
import {
	createKnowledgeDumgen,
	type KnowledgeDumgen,
} from "./knowledge-generation/build";

export type KnowledgeDumgenRuntimeOptions = {
	readonly sdk: AiSdk;
	/** Generated compressed prompt bytes for bundlers without package sidecars. */
	readonly runtimePromptData?: string;
	readonly onModelExchange?: (exchange: ModelExchange) => void;
};

/** Builds Knowledge generation around an injected provider. */
export function buildKnowledgeDumgenRuntime(
	options: KnowledgeDumgenRuntimeOptions,
): KnowledgeDumgen {
	if (options.runtimePromptData !== undefined) {
		installEncodedRuntimePromptData(options.runtimePromptData);
	}
	return createKnowledgeDumgen(options);
}

export type { AiSdk, KnowledgeDumgen };
