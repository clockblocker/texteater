import type { Attestation, Lemma } from "dumling/types";
import type {
	LemmaCatalogMiss,
	ReadingCatalogMiss,
} from "./production/contracts";
import type { GermanGrammaticalRoute } from "./schema/de-grammatical-resolution-inventory";
import type {
	GermanReachableHighLevelFamily,
	GermanReachableHighLevelKind,
} from "./schema/german-high-level-routes";
export type EnabledSegmentationLanguage = "de" | "he";
export type GrammaticalResolutionLanguage = "de";
export type ReadingResolutionLanguage = "de";

declare const segmentedSentenceIdBrand: unique symbol;
export type SegmentedSentenceId = string & {
	readonly [segmentedSentenceIdBrand]: "SegmentedSentenceId";
};

export type SegmentKind =
	| "ResolvableText"
	| "OpaqueText"
	| "Whitespace"
	| "Punctuation";

export type Segment = Readonly<{
	kind: SegmentKind;
	text: string;
}>;

export type SegmentedSentence<
	L extends EnabledSegmentationLanguage = EnabledSegmentationLanguage,
> = Readonly<{
	id: SegmentedSentenceId;
	language: L;
	segments: readonly Segment[];
}>;

export type SegmentationDecision =
	| Readonly<{
			decision: "Accepted";
			language: "de";
			sentence: SegmentedSentence<"de">;
	  }>
	| Readonly<{
			decision: "Accepted";
			language: "he";
			sentence: SegmentedSentence<"he">;
	  }>
	| Readonly<{ decision: "UnsupportedLanguage" }>
	| Readonly<{ decision: "Unintelligible" }>;

export type Section1Error =
	| Readonly<{
			code: "InvalidInput";
			message: string;
			itemIndex?: number;
	  }>
	| Readonly<{
			code: "IntakeFailure";
			reason:
				| "refusal"
				| "max-output-tokens"
				| "content-filter"
				| "provider-error"
				| "invalid-input"
				| "invalid-output";
			message: string;
	  }>;

/**
 * One ordered decision per submitted Source Sentence, or one batch-level
 * validation or Intake failure. Accepted decisions contain deterministic
 * Segmentation of the stitched text.
 */
export type SegmentationResult =
	| Readonly<{ ok: true; value: readonly SegmentationDecision[] }>
	| Readonly<{ ok: false; error: Section1Error }>;

export type GrammaticalRoute<
	L extends GrammaticalResolutionLanguage = GrammaticalResolutionLanguage,
> = L extends "de" ? GermanGrammaticalRoute : never;

/**
 * The post-click grammatical outcome. A resolved result separates the
 * click-independent Attestation from interaction indices; route availability,
 * catalog misses, and failed resolution remain distinct outcomes.
 */
export type GrammaticalResult<
	L extends GrammaticalResolutionLanguage = GrammaticalResolutionLanguage,
> =
	| Readonly<{
			decision: "Resolved";
			language: L;
			markedContext: string;
			attestation: Attestation<L>;
			interaction: GrammaticalInteraction;
	  }>
	| Readonly<{
			decision: "NotImplemented";
			language: L;
			route: GrammaticalRoute<L>;
	  }>
	| LemmaCatalogMiss
	| Readonly<{ decision: "Unresolved"; language: L }>;

export type GrammaticalInteraction = Readonly<{
	segmentedSentenceId: SegmentedSentenceId;
	clickedSegmentIndex: number;
	memberSegmentIndices: readonly [number, ...number[]];
}>;

/** A Segmented Sentence and the index of its clicked `ResolvableText` Segment. */
export type GrammaticalInput<L extends GrammaticalResolutionLanguage> =
	Readonly<{
		sentence: SegmentedSentence<L>;
		clickedSegmentIndex: number;
	}>;

/**
 * The marked use of an already resolved Lemma plus immutable learner history.
 * Reading Resolution never revises the supplied Lemma.
 */
export type ReadingInput<
	L extends ReadingResolutionLanguage = ReadingResolutionLanguage,
> = {
	readonly markedContext: string;
	readonly lemma: Lemma<L>;
	readonly existingEmojiDescriptions: readonly string[];
};

export type ReadingResolutionSuccess = {
	readonly decision: "Reuse" | "New";
	readonly emojiDescription: string;
};

/** Reuse of one exact existing description, a novel description, or a closed-catalog miss. */
export type ReadingResolution = ReadingResolutionSuccess | ReadingCatalogMiss;

export type {
	KnowledgeGenerationInput,
	KnowledgeGenerationLanguage,
	KnowledgeGenerationRequest,
	KnowledgeGenerationResult,
	KnowledgeGenerationSuccess,
	ReadingKnowledgeCatalogMiss,
	RequestableRelation,
} from "./knowledge-generation/contracts";
export type {
	CatalogMissBase,
	CatalogMissReason,
	LemmaCatalogMiss,
	ReadingCatalogMiss,
} from "./production/contracts";

export type Unresolved = { readonly decision: "Unresolved" };

/** Internal result of Target Classification. */
export type AnalysisTarget = {
	readonly [Family in GermanReachableHighLevelFamily]: {
		readonly family: Family;
		readonly kind: GermanReachableHighLevelKind<Family>;
	};
}[GermanReachableHighLevelFamily] & {
	readonly memberSegmentIndices: readonly number[];
};

/** Canonical input projected directly from one already classified target. */
export type GrammaticalResolutionInput = {
	readonly markedContext: string;
	readonly members: readonly string[];
};

/** Total internal result after the model DTO crosses the shared route seam. */
export type GrammaticalResolution = {
	readonly memberOrthographies: readonly ("Standard" | "Typo")[];
	readonly normalizedMembers: readonly string[];
	readonly realizationCoverage: "Full" | "Partial";
	readonly surface: import("dumling/types").Surface<"de">;
};
