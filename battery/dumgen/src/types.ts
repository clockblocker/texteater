import type { Attestation, SupportedLanguage } from "dumling/types";
import type { GermanGrammaticalRoute } from "./schema/de-grammatical-resolution-inventory";
import type {
	GermanHighLevelFamily,
	GermanHighLevelKind,
} from "./schema/german-high-level-routes";

export type EnabledSegmentationLanguage = "de" | "he";
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
	readonly text: string;
	readonly kind: SegmentKind;
};

export type SegmentedSentence<
	L extends SupportedLanguage = EnabledSegmentationLanguage,
> = {
	readonly id: SegmentedSentenceId;
	readonly language: L;
	readonly segments: readonly Segment[];
};

export type SegmentationDecision =
	| {
			readonly [Language in EnabledSegmentationLanguage]: {
				readonly decision: "Accepted";
				readonly language: Language;
				readonly sentence: SegmentedSentence<Language>;
			};
	  }[EnabledSegmentationLanguage]
	| {
			readonly decision: "UnsupportedLanguage";
	  }
	| {
			readonly decision: "Unintelligible";
	  };

export type Section1Error =
	| {
			readonly code: "InvalidInput";
			readonly message: string;
			readonly itemIndex?: number;
	  }
	| {
			readonly code: "IntakeFailure";
			readonly reason: import("./generator/generator-error").DumgenErrorCode;
			readonly message: string;
	  };

export type SegmentationResult =
	| {
			readonly ok: true;
			readonly value: readonly SegmentationDecision[];
	  }
	| { readonly ok: false; readonly error: Section1Error };

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

type GrammarSurfaceProjection = Omit<
	WithoutLemma<import("dumling/types").Surface<"de">>,
	"normalizedSurface"
>;

/** Internal result of a Grammatical Resolution prompt. */
export type GrammaticalResolution =
	| Unresolved
	| {
			readonly decision: "Resolved";
			readonly memberOrthographies: readonly ("Standard" | "Typo")[];
			readonly normalizedMembers: readonly string[];
			readonly realizationCoverage: "Full" | "Partial";
			readonly surface: GrammarSurfaceProjection;
			readonly lemma: import("dumling/types").Lemma<"de">;
	  };
