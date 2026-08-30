import type { AiSdk } from "./ai-sdk/ai-sdk";
import { createDumgen } from "./dumgen/build";
import type { DumgenSection1Trace } from "./dumgen/implementation";
import type { ModelExchange } from "./generator/generator";
import type {
	GrammaticalInput,
	GrammaticalResolutionLanguage,
	GrammaticalResult,
	KnowledgeGenerationInput,
	KnowledgeGenerationLanguage,
	KnowledgeGenerationResult,
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
	CatalogMissBase,
	CatalogMissReason,
	EnabledSegmentationLanguage,
	GrammaticalInput,
	GrammaticalInteraction,
	GrammaticalResolutionLanguage,
	GrammaticalResult,
	GrammaticalRoute,
	KnowledgeGenerationInput,
	KnowledgeGenerationLanguage,
	KnowledgeGenerationRequest,
	KnowledgeGenerationResult,
	KnowledgeGenerationSuccess,
	LemmaCatalogMiss,
	ReadingCatalogMiss,
	ReadingInput,
	ReadingKnowledgeCatalogMiss,
	ReadingResolution,
	ReadingResolutionLanguage,
	ReadingResolutionSuccess,
	RequestableRelation,
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
	/**
	 * Resolves a bounded, non-empty batch in one Intake model call and then
	 * segments each accepted German or Hebrew sentence deterministically.
	 */
	segment(sourceSentences: readonly string[]): Promise<SegmentationResult>;
	readonly resolve: {
		/**
		 * Resolves one clicked segment into grammar and click-independent
		 * Attestation data. `NotImplemented` names a valid disabled route;
		 * `Unresolved` means no defensible target survived the chain.
		 */
		grammatical<L extends GrammaticalResolutionLanguage>(
			language: L,
			input: GrammaticalInput<L>,
		): Promise<GrammaticalResult<L>>;
		/**
		 * Classifies one use of an already fixed Lemma as reuse of an exact
		 * existing Emoji Description or as a new learner-facing Reading.
		 */
		reading<L extends ReadingResolutionLanguage>(
			language: L,
			input: ReadingInput<L>,
		): Promise<ReadingResolution>;
	};
	readonly generate: {
		knowledge(
			language: KnowledgeGenerationLanguage,
			input: KnowledgeGenerationInput<"de">,
		): Promise<KnowledgeGenerationResult>;
	};
};

export function buildDumgen(options: DumgenOptions = {}): Dumgen {
	return createDumgen(options);
}
