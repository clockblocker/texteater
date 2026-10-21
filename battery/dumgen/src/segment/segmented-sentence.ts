/**
 * The shapes `segment.inUnits` hands on: a Segment, a unit with its route,
 * and the Segmented Sentence and Segmented Text they make up (Dumgen ADR
 * 0004, ADR 0007).
 */
import { routeOf } from "dumling";
import type * as Dumling from "dumling/types";
import { isSegmentLanguage, type languageFactories } from "../languages.js";

/**
 * The languages Dumgen runs, derived from its registered language factories.
 */
export type SegmentLanguage = keyof typeof languageFactories;

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
type UnitFamily<L extends Dumling.Language> = Exclude<
	Dumling.Family<L>,
	"Morpheme"
>;

/**
 * Where a click on a unit routes: language, Family and a Kind of that
 * Family, as Dumling names them (`{ language: "de", family: "Locution",
 * kind: "ADV" }`).
 */
export type Route<L extends Dumling.Language = "de"> = {
	[Language in L]: {
		[F in UnitFamily<Language>]: {
			readonly language: Language;
			readonly family: F;
			readonly kind: Dumling.Kind<Language, F>;
		};
	}[UnitFamily<Language>];
}[L];

/**
 * The Route a Dumling Lemma route names, as a fresh object, or undefined
 * where no click routes: a language Dumgen doesn't run, or a Morpheme, which
 * belongs to `segment.inMorphemes`.
 */
export function segmentRouteOf<R extends Dumling.LemmaRoute>(
	route: R,
): Route<Extract<R["language"], SegmentLanguage>> | undefined;
export function segmentRouteOf(
	route: Dumling.LemmaRoute,
): Route<SegmentLanguage> | undefined {
	const fresh = routeOf(route);
	if (!isSegmentLanguage(fresh.language) || fresh.family === "Morpheme")
		return undefined;
	// The registry guard narrows language, not the containing discriminated
	// union in TypeScript; Morpheme has also been excluded above.
	return fresh as Route<SegmentLanguage>;
}

/**
 * The authored DET or PRON identity the route judge picked for a one-piece
 * unit whose spelling realizes authored members (#864): its Kind, Canonical
 * Form, pronoun type, and `poss` when the identity is possessive. It always
 * agrees with the unit's route, and the click builds the unit's Lemma from
 * it, asking only about the occurrence's cell.
 */
export type ClosedClassIdentity = {
	readonly kind: "DET" | "PRON";
	readonly canonicalForm: string;
	readonly pronType: string | null;
	readonly poss?: "Yes";
};

/**
 * One biggest unit (Dumgen ADR 0007): the indices of its Segments in its
 * Sentence's Segments, ascending, discontinuous ones included (#767), and
 * its route or `Unresolved`. A borderline unit also carries route
 * variants, its route first; the evaluator reads
 * them and a click ignores them (#860). A one-piece DET or PRON unit
 * carries the closed-class identity it was routed by, if any (#864).
 */
export type Unit<L extends Dumling.Language = "de"> = {
	segments: number[];
	route: Route<L> | "Unresolved";
	variants?: Route<L>[];
	identity?: ClosedClassIdentity;
};

/**
 * One Sentence as intake leaves it: its Stitched Text, its Segments, which
 * concatenated give the text back, and its units. Every ResolvableText
 * Segment belongs to exactly one unit, unless the Sentence `failed`.
 */
export type SegmentedSentence<L extends Dumling.Language = "de"> = {
	readonly text: string;
	readonly segments: readonly Segment[];
	readonly units: readonly Unit<L>[];
	/**
	 * Present only when the Sentence's segmentation failed (#861): it has no
	 * units, and its Segments are the Segment stage's, or code's alone when
	 * that stage failed too, every written run kept whole. The reason is in
	 * the operation's trace, not here; a click segments the Sentence again.
	 */
	readonly failed?: true;
};

/** A text's paragraphs, each with its Segmented Sentences in order. */
export type SegmentedText<L extends Dumling.Language = "de"> = {
	readonly language: L;
	readonly paragraphs: readonly {
		readonly sentences: readonly SegmentedSentence<L>[];
	}[];
};
