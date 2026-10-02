/**
 * The shapes `segment.inUnits` hands on: a Segment, a unit with its route,
 * and the Segmented Sentence and Segmented Text they make up (Dumgen ADR
 * 0004, ADR 0007).
 */
import type * as Dumling from "dumling/types";

/** The languages `segment.inUnits` segments: German only for now. */
export type SegmentLanguage = "de";

/**
 * The one clickable piece of a Segmented Sentence, or the whitespace,
 * punctuation or opaque text between them. A fused word yields one Segment
 * per component, each with the `surface` it stands for: `m` of `im` stands
 * for `dem`.
 */
export type Segment = {
	readonly kind:
		| "ResolvableText"
		| "OpaqueText"
		| "Whitespace"
		| "Punctuation";
	readonly text: string;
	readonly surface?: string;
};

/**
 * The Families a biggest unit routes to: every Dumling Family but Morpheme,
 * which belongs to `segment.inMorphemes`.
 */
type UnitFamily<L extends SegmentLanguage> = Exclude<
	Dumling.Family<L>,
	"Morpheme"
>;

/**
 * Where a click on a unit routes: language, Family and a Kind of that
 * Family, as Dumling names them (`{ language: "de", family: "Locution",
 * kind: "ADV" }`).
 */
export type Route = {
	[L in SegmentLanguage]: {
		[F in UnitFamily<L>]: {
			readonly language: L;
			readonly family: F;
			readonly kind: Dumling.Kind<L, F>;
		};
	}[UnitFamily<L>];
}[SegmentLanguage];

/**
 * One biggest unit (Dumgen ADR 0007): the indices of its Segments in its
 * Sentence's Segments, ascending, discontinuous ones included (#767), and
 * its route or `Unresolved`. A borderline unit also carries route
 * variants, its route first, and a click picks one of them (amended
 * 2026-09-30).
 */
export type Unit = {
	segments: number[];
	route: Route | "Unresolved";
	variants?: Route[];
};

/**
 * One Sentence as intake leaves it: its Stitched Text, its Segments, which
 * concatenated give the text back, and its units. Every ResolvableText
 * Segment belongs to exactly one unit, unless the Sentence `failed`.
 */
export type SegmentedSentence = {
	readonly text: string;
	readonly segments: readonly Segment[];
	readonly units: readonly Unit[];
	/**
	 * Present only when the Sentence's segmentation failed (#861): it has no
	 * units, and its Segments are the Segment stage's, or code's alone when
	 * that stage failed too, every written run kept whole. The reason is in
	 * the operation's trace, not here; a click segments the Sentence again.
	 */
	readonly failed?: true;
};

/** A text's paragraphs, each with its Segmented Sentences in order. */
export type SegmentedText = {
	readonly language: SegmentLanguage;
	readonly paragraphs: readonly {
		readonly sentences: readonly SegmentedSentence[];
	}[];
};
