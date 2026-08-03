import type { AiSdk } from "./ai-sdk/ai-sdk";
import { createDumgen } from "./dumgen/build";
import type { ModelExchange } from "./generator/generator";
import type {
	GrammaticalInput,
	GrammaticalResolutionLanguage,
	GrammaticalResult,
	ReadingInput,
	ReadingResolution,
	ReadingResolutionLanguage,
	SegmentationResult,
} from "./types";

export {
	AiSdkGenerationError,
	type GenerationFailureReason,
} from "./ai-sdk/ai-sdk";
export {
	DumgenError,
	type DumgenErrorCode,
} from "./generator/generator-error";
export type {
	EnabledSegmentationLanguage,
	GrammaticalInput,
	GrammaticalResolutionLanguage,
	GrammaticalResult,
	GrammaticalRoute,
	ReadingInput,
	ReadingResolution,
	ReadingResolutionLanguage,
	Segment,
	SegmentationResult,
	SegmentedSentence,
	SegmentKind,
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

export type Dumgen = {
	segment(text: string): Promise<SegmentationResult>;
	readonly resolve: {
		grammatical<L extends GrammaticalResolutionLanguage>(
			language: L,
			input: GrammaticalInput<L>,
		): Promise<GrammaticalResult<L>>;
		reading<L extends ReadingResolutionLanguage>(
			language: L,
			input: ReadingInput,
		): Promise<ReadingResolution>;
	};
};

export function buildDumgen(options: DumgenOptions = {}): Dumgen {
	return createDumgen(options);
}
