import type { Effect } from "effect/Effect";
import type { ModelGenerator } from "./ai-sdk/ai-sdk";
import { createDumgen } from "./dumgen/build";
import type { DumgenSection1Trace } from "./dumgen/implementation";
import type { ModelExchange } from "./generator/generator";
import type { DumgenError } from "./generator/generator-error";
import type {
	GrammaticalInput,
	GrammaticalResolutionLanguage,
	GrammaticalResult,
	ReadingInput,
	ReadingResolution,
	ReadingResolutionLanguage,
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
export type DumgenOptions = {
	readonly modelGenerator: ModelGenerator;
	readonly runtimePromptData?: string;
};

export type Dumgen = {
	/**
	 * Resolves a bounded, non-empty batch in one Intake model call and then
	 * segments each accepted German or Hebrew sentence deterministically.
	 */
	segment(
		sourceSentences: readonly string[],
	): Effect<readonly import("./types").SegmentationDecision[], DumgenError>;
	readonly resolve: {
		/**
		 * Resolves one clicked segment into grammar and click-independent
		 * Attestation data. `NotImplemented` names a valid disabled route;
		 * `Unresolved` means no defensible target survived the chain.
		 */
		grammatical<L extends GrammaticalResolutionLanguage>(
			language: L,
			input: GrammaticalInput<L>,
		): Effect<
			Extract<GrammaticalResult<L>, { readonly decision: "Resolved" }>,
			DumgenExpectedFailure<GrammaticalResult<L>>
		>;
		/**
		 * Classifies one use of an already fixed Lemma as reuse of an exact
		 * existing Emoji Description or as a new learner-facing Reading.
		 */
		reading<L extends ReadingResolutionLanguage>(
			language: L,
			input: ReadingInput<L>,
		): Effect<
			Extract<ReadingResolution, { readonly decision: "Reuse" | "New" }>,
			DumgenExpectedFailure<ReadingResolution>
		>;
	};
};

/** Expected workflow failures retain their code and original cause. */
export type DumgenDomainFailure<Result> = Readonly<{
	readonly _tag: "DumgenDomainFailure";
	readonly result: Result;
}>;

/** Provider and parser failures retain DumgenError's code and original cause. */
export type DumgenExpectedFailure<Result> =
	| DumgenError
	| DumgenDomainFailure<
			Extract<
				Result,
				{
					readonly decision:
						| "Unresolved"
						| "NotImplemented"
						| "CatalogMiss";
				}
			>
	  >;

export function buildDumgen(options: DumgenOptions): Dumgen {
	return createDumgen(options);
}
