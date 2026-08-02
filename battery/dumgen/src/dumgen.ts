import { type AiSdk, buildAiSdk } from "./ai-sdk/ai-sdk";

export {
	AiSdkGenerationError,
	type GenerationFailureReason,
} from "./ai-sdk/ai-sdk";

import {
	buildGeneratorCatalog,
	type GeneratorCatalog,
	type ModelExchange,
} from "./generator/generator";

export {
	DumgenError,
	type DumgenErrorCode,
} from "./generator/generator-error";

import { PROMPT_CATALOG } from "./catalog/prompt-catalog";

export type {
	AnalysisTarget,
	GrammaticalResolution,
	IntakeDecision,
	ReadingResolution,
	Unresolved,
} from "./types";

export type DumgenModelExchange = ModelExchange;
export type DumgenModelExchangeObserver = (
	exchange: DumgenModelExchange,
) => void;

type DumgenInstrumentationOptions = {
	readonly onModelExchange?: DumgenModelExchangeObserver;
};

export type DumgenOptions = DumgenInstrumentationOptions &
	(
		| { readonly apiKey?: string; readonly sdk?: never }
		| { readonly sdk: AiSdk; readonly apiKey?: never }
	);

export function buildDumgen(
	options: DumgenOptions = {},
): GeneratorCatalog<typeof PROMPT_CATALOG> {
	const sdk = options.sdk ?? buildAiSdk({ apiKey: options.apiKey });
	return buildGeneratorCatalog(PROMPT_CATALOG, sdk, {
		onModelExchange: options.onModelExchange,
	});
}
