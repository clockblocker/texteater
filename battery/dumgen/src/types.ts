import type { z } from "zod";
import type {
	GermanReachableHighLevelFamily,
	GermanReachableHighLevelKind,
} from "./schema/german-high-level-routes";
import type {
	enabledSegmentationLanguageSchema,
	grammaticalInputSchema,
	grammaticalInteractionSchema,
	grammaticalResolutionLanguageSchema,
	grammaticalResultSchema,
	grammaticalRouteSchema,
	section1ErrorSchema,
	segmentationDecisionSchema,
	segmentationResultSchema,
	segmentedSentenceIdSchema,
	segmentedSentenceSchema,
	segmentKindSchema,
	segmentSchema,
} from "./schemas/public-schemas";

export type EnabledSegmentationLanguage = z.output<
	typeof enabledSegmentationLanguageSchema
>;
export type GrammaticalResolutionLanguage = z.output<
	typeof grammaticalResolutionLanguageSchema
>;
export type ReadingResolutionLanguage = "de";

export type SegmentedSentenceId = z.output<typeof segmentedSentenceIdSchema>;

export type SegmentKind = z.output<typeof segmentKindSchema>;

export type Segment = z.output<typeof segmentSchema>;

type SegmentedSentenceValue = z.output<typeof segmentedSentenceSchema>;

export type SegmentedSentence<
	L extends EnabledSegmentationLanguage = EnabledSegmentationLanguage,
> = Omit<SegmentedSentenceValue, "language"> & { readonly language: L };

export type SegmentationDecision = z.output<typeof segmentationDecisionSchema>;

export type Section1Error = z.output<typeof section1ErrorSchema>;

export type SegmentationResult = z.output<typeof segmentationResultSchema>;

export type GrammaticalRoute<
	L extends GrammaticalResolutionLanguage = GrammaticalResolutionLanguage,
> = L extends "de" ? z.output<typeof grammaticalRouteSchema> : never;

type GrammaticalResultValue = z.output<typeof grammaticalResultSchema>;

export type GrammaticalResult<
	L extends GrammaticalResolutionLanguage = GrammaticalResolutionLanguage,
> = GrammaticalResultValue extends infer Result
	? Result extends { readonly language: GrammaticalResolutionLanguage }
		? Omit<Result, "language"> & { readonly language: L }
		: never
	: never;

export type GrammaticalInteraction = z.output<
	typeof grammaticalInteractionSchema
>;

type GrammaticalInputValue = z.output<typeof grammaticalInputSchema>;

export type GrammaticalInput<L extends GrammaticalResolutionLanguage> = Omit<
	GrammaticalInputValue,
	"sentence"
> & { readonly sentence: SegmentedSentence<L> };

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
