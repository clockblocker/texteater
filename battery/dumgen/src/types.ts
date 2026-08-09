import type { Attestation, SupportedLanguage } from "dumling/types";
import type { GermanGrammaticalRoute } from "./schema/de-grammatical-resolution-inventory";
import type {
	GermanHighLevelFamily,
	GermanHighLevelKind,
} from "./schema/german-high-level-routes";

export type EnabledSegmentationLanguage = "de";
export type GrammaticalResolutionLanguage = "de";
export type ReadingResolutionLanguage = "de";

export type SegmentedSentenceId = string & {
	readonly __segmentedSentenceIdBrand: unique symbol;
};

export type SegmentKind =
	| "ResolvableText"
	| "OpaqueText"
	| "Whitespace"
	| "Punctuation";

export type Segment = {
	readonly index: number;
	readonly text: string;
	readonly kind: SegmentKind;
	readonly start: number;
	readonly end: number;
};

export type SegmentedSentence<
	L extends SupportedLanguage = EnabledSegmentationLanguage,
> = {
	readonly id: SegmentedSentenceId;
	readonly language: L;
	readonly sourceText: string;
	readonly segments: readonly Segment[];
};

export type SegmentationResult =
	| {
			readonly outcome: "Segmented";
			readonly language: EnabledSegmentationLanguage;
			readonly sentence: SegmentedSentence<EnabledSegmentationLanguage>;
	  }
	| {
			readonly outcome: "Unavailable";
			readonly reason: "UnsupportedLanguage";
			readonly language: string;
	  }
	| {
			readonly outcome: "Unavailable";
			readonly reason: "Unintelligible";
			readonly language: null;
	  };

export type GrammaticalRoute<
	L extends GrammaticalResolutionLanguage = GrammaticalResolutionLanguage,
> = L extends "de" ? GermanGrammaticalRoute : never;

export type GrammaticalResult<
	L extends GrammaticalResolutionLanguage = GrammaticalResolutionLanguage,
> =
	| {
			readonly decision: "Resolved";
			readonly language: L;
			readonly markedContext: string;
			readonly attestation: Attestation<L>;
			readonly interaction: GrammaticalInteraction;
	  }
	| {
			readonly decision: "NotImplemented";
			readonly language: L;
			readonly route: GrammaticalRoute<L>;
	  }
	| {
			readonly decision: "Unresolved";
			readonly language: L;
	  };

export type GrammaticalInteraction = {
	readonly segmentedSentenceId: SegmentedSentenceId;
	readonly clickedSegmentIndex: number;
	readonly memberSegmentIndices: readonly [number, ...number[]];
};

export type GrammaticalInput<L extends GrammaticalResolutionLanguage> = {
	readonly sentence: SegmentedSentence<L>;
	readonly clickedSegmentIndex: number;
};

export type ReadingInput = {
	readonly markedContext: string;
	readonly lemma: string;
	readonly existingEmojiDescriptions: readonly string[];
};

export type ReadingResolution = {
	readonly decision: "Reuse" | "New";
	readonly emojiDescription: string;
};

export type Unresolved = { readonly decision: "Unresolved" };

export type IntakeDecision =
	| {
			readonly decision: "Accepted";
			readonly language: EnabledSegmentationLanguage;
	  }
	| {
			readonly decision: "UnsupportedLanguage";
			readonly language: string;
	  }
	| { readonly decision: "Unintelligible"; readonly language: null };

/** Internal result of Target Classification. */
export type AnalysisTarget = {
	readonly [Family in GermanHighLevelFamily]: {
		readonly family: Family;
		readonly kind: GermanHighLevelKind<Family>;
	};
}[GermanHighLevelFamily] & {
	readonly memberSegmentIndices: readonly number[];
};

type WithoutLemma<Value> = Value extends { readonly lemma: unknown }
	? Omit<Value, "lemma">
	: never;

/** Internal result of a Grammatical Resolution prompt. */
export type GrammaticalResolution =
	| Unresolved
	| {
			readonly decision: "Resolved";
			readonly memberOrthographies: readonly ("Standard" | "Typo")[];
			readonly realizationCoverage: "Full" | "Partial";
			readonly surface: WithoutLemma<
				import("dumling/types").Surface<"de">
			>;
			readonly lemma: import("dumling/types").Lemma<"de">;
	  };
