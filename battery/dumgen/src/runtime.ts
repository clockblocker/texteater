import type { AiSdk } from "./ai-sdk/ai-sdk";
import { RUNTIME_PROMPT_CATALOG } from "./catalog/runtime-prompt-catalog";
import type { Dumgen } from "./dumgen";
import {
	createDumgenImplementation,
	type DumgenSection1Trace,
} from "./dumgen/implementation";
import { installEncodedRuntimePromptData } from "./generated/runtime-prompt-artifacts.js";
import {
	buildGeneratorCatalog,
	type ModelExchange,
} from "./generator/generator";
import type {
	KnowledgeGenerationInput,
	KnowledgeGenerationLanguage,
	KnowledgeGenerationResult,
} from "./types";

export type DumgenRuntimeOptions = {
	readonly sdk: AiSdk;
	/** Generated compressed prompt bytes for bundlers without package sidecars. */
	readonly runtimePromptData?: string;
	readonly generateKnowledge: (
		language: KnowledgeGenerationLanguage,
		input: KnowledgeGenerationInput<"de">,
	) => Promise<KnowledgeGenerationResult>;
	readonly onModelExchange?: (exchange: ModelExchange) => void;
	readonly onSection1Trace?: (trace: DumgenSection1Trace) => void;
};

/** Builds Dumgen around an injected provider without loading a default SDK. */
export function buildDumgenRuntime(options: DumgenRuntimeOptions): Dumgen {
	if (options.runtimePromptData !== undefined) {
		installEncodedRuntimePromptData(options.runtimePromptData);
	}
	const generators = buildGeneratorCatalog(
		RUNTIME_PROMPT_CATALOG,
		options.sdk,
		{
			onModelExchange: options.onModelExchange,
		},
	);
	return createDumgenImplementation(generators, {
		onSection1Trace: options.onSection1Trace,
		generateKnowledge: options.generateKnowledge,
	});
}

export type { AiSdk };
