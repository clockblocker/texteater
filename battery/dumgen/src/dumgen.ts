import type { AiSdk } from "./ai-sdk/ai-sdk";
import { createDumgen } from "./dumgen/build";
import type { DumgenSection1Trace } from "./dumgen/implementation";
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
	DumgenError,
	type DumgenErrorCode,
} from "./generator/generator-error";
export type {
	EnabledSegmentationLanguage,
	GrammaticalInput,
	GrammaticalInteraction,
	GrammaticalResolutionLanguage,
	GrammaticalResult,
	GrammaticalRoute,
	ReadingInput,
	ReadingResolution,
	ReadingResolutionLanguage,
	Section1Error,
	Segment,
	SegmentationDecision,
	SegmentationResult,
	SegmentedSentence,
	SegmentedSentenceId,
	SegmentKind,
} from "./types";

export type DumgenModelExchange = ModelExchange;
export type { DumgenSection1Trace };
export type DumgenModelExchangeObserver = (
	exchange: DumgenModelExchange,
) => void;

type DumgenInstrumentationOptions = {
	readonly onModelExchange?: DumgenModelExchangeObserver;
	readonly onSection1Trace?: (trace: DumgenSection1Trace) => void;
};

export type DumgenOptions = DumgenInstrumentationOptions &
	(
		| { readonly apiKey?: string; readonly sdk?: never }
		| { readonly sdk: AiSdk; readonly apiKey?: never }
	);

export type Dumgen = {
	segment(sourceSentences: readonly string[]): Promise<SegmentationResult>;
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
