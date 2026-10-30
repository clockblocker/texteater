import {
	CASE_TOKEN,
	DEFAULT_VALENCY_LINE_STYLE,
	type FrameSlot,
	type LineHead,
	separablePrefix,
	splitCanonicalForm,
	type ValencyLemma,
	type ValencyLinePart,
	type ValencyLineStyle,
	valencyLineAround,
} from "./block-renderers/reading/valency/valency-line";

/** What a Surface's line is printed from: the stored Surface and its Lemma. */
export type LinedSurface = {
	/** The base-order form: the Lemma's words inflected, the verb last (#1293). */
	readonly normalizedSurface: string;
	readonly inflectionalFeatures: Readonly<Record<string, unknown>>;
	readonly lemma: ValencyLemma;
};

/**
 * The slotted line of a German Surface (#1293): its stored base-order
 * form, with the slots of the Reading in front of it printed as their case
 * tokens, the way the Reading's heading prints its Citation. The stored
 * `mit zu tun hatte` of `mit jM zu tun haben` reads `jD mit jM zu tun
 * hatte`. It is derived each render and never stored, since the slots
 * belong to the Reading and the Surface is shared by all of its Lemma's
 * Readings.
 *
 * - The line shows the frame's shape: every slot, Optional ones in
 *   parentheses (`jD (auf jN) wartet`), placed by the Valency Line's own
 *   ordering. A Surface records no fillers, so no slot can be dropped as
 *   filled.
 * - `jD`, the subject, leads a finite, non-imperative verb whose frame has
 *   a Nom slot. An expletive `es`, or a Locution's own `es` (`es jN gibt`),
 *   is the subject itself, so neither takes one; nor does an infinitive.
 * - A lexical reflexive prints as `sich` wherever the Citation puts it.
 * - A separable verb is stored joined (`anfängt`) and gets the Citation's
 *   bar: `an|fängt`.
 * - An imperative keeps its own order, the verb first and a separated
 *   prefix last: `warte (auf jN)`, `sieh jN an`.
 * - An ADJ or NOUN prints its head first: `stolz (auf jN)`.
 * - Without a frame, or a frame with nothing to show, the line is the
 *   stored form alone: `Kindern`.
 */
export function germanSurfaceLine(
	surface: LinedSurface,
	frame: readonly FrameSlot[] | null | undefined,
	style: ValencyLineStyle = DEFAULT_VALENCY_LINE_STYLE,
): readonly ValencyLinePart[] {
	const bare: ValencyLinePart[] = [
		{ part: "Head", text: surface.normalizedSurface, prefix: null },
	];
	if (!frame || frame.length === 0) return bare;
	const split = surfaceHead(surface);
	if (!split) return bare;
	const { head, separated } = split;
	const subject = subjectOf(surface, head, frame);
	const line = valencyLineAround(head, frame, style);
	if (!line && !subject) return bare;
	const parts: ValencyLinePart[] = [
		...(subject ? [subject] : []),
		...(line ?? [{ part: "Head", text: head.text, prefix: head.prefix }]),
	];
	return separated ? [...parts, { part: "Fixed", text: separated }] : parts;
}

const VERBAL_KINDS = new Set(["VERB", "AUX"]);

/**
 * The stored form split as its Lemma's Citation is: a verb's inflected
 * words are the head, and a Locution's other words keep their places. In
 * base order the verb comes last, after them; an imperative puts it
 * first, and its separated prefix (`sieh an`) closes the line. Null when
 * the stored form is too short to hold the Locution's words and a verb.
 */
function surfaceHead(
	surface: LinedSurface,
): { readonly head: LineHead; readonly separated: string | null } | null {
	const { lemma, normalizedSurface } = surface;
	if (!VERBAL_KINDS.has(lemma.kind))
		return {
			head: {
				text: normalizedSurface,
				fixed: [],
				prefix: null,
				first: true,
			},
			separated: null,
		};
	const words = normalizedSurface.trim().split(/\s+/u);
	const { fixed } = splitCanonicalForm(lemma);
	if (words.length <= fixed.length) return null;
	const imperative = isImperative(surface.inflectionalFeatures);
	const verbWords = imperative
		? words.slice(0, words.length - fixed.length)
		: words.slice(fixed.length);
	const last = verbWords.at(-1);
	const separated =
		imperative &&
		verbWords.length > 1 &&
		last !== undefined &&
		last === sepPrefixOf(lemma.coreFeatures)
			? last
			: null;
	const text = (separated ? verbWords.slice(0, -1) : verbWords).join(" ");
	return {
		head: {
			text,
			fixed: imperative
				? words.slice(words.length - fixed.length)
				: words.slice(0, fixed.length),
			prefix: separablePrefix(lemma.coreFeatures, text),
			first: imperative,
		},
		separated,
	};
}

function sepPrefixOf(coreFeatures: unknown): string | null {
	return typeof coreFeatures === "object" &&
		coreFeatures !== null &&
		"hasSepPrefix" in coreFeatures &&
		typeof coreFeatures.hasSepPrefix === "string"
		? coreFeatures.hasSepPrefix
		: null;
}

/** The subject slot `jD`, when the Surface takes one. */
function subjectOf(
	surface: LinedSurface,
	head: LineHead,
	frame: readonly FrameSlot[],
): ValencyLinePart | null {
	const features = surface.inflectionalFeatures;
	if (
		!VERBAL_KINDS.has(surface.lemma.kind) ||
		features.verbForm !== "Fin" ||
		isImperative(features) ||
		features.expletive === "Subject" ||
		head.fixed[0]?.toLocaleLowerCase("de") === "es"
	)
		return null;
	const nominative = frame.find(({ complements }) =>
		complements.some(
			(complement) =>
				complement.kind === "Case" && complement.governedCase === "Nom",
		),
	);
	return nominative
		? {
				part: "Slot",
				optional: nominative.status === "Optional",
				preposition: null,
				case: "Nom",
				token: CASE_TOKEN.Nom,
			}
		: null;
}

function isImperative(features: LinedSurface["inflectionalFeatures"]) {
	return features.mood === "Imp";
}
