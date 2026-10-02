/**
 * The shapes the segmenters hand on: a Segment, and a Segmented Sentence,
 * one Sentence as intake leaves it (Dumgen ADR 0004, ADR 0007).
 */

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

export type SegmentedSentence = {
	readonly language: "de";
	/** The Stitched Text; the Segments concatenated give it back. */
	readonly text: string;
	readonly segments: readonly Segment[];
};
