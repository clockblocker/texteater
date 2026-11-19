import type { SourceSegment } from "./link-members";

/** A run of Segments, `from` inclusive and `to` exclusive. */
export type SegmentRange = { readonly from: number; readonly to: number };

/** A stretch of a sentence between two breaks. */
export type Piece = SegmentRange & {
	readonly words: number;
	/** The piece ends at a strong break, so growing past it leaves the clause. */
	readonly endsStrong: boolean;
};

/** Punctuation a piece ends at; a strong one ends a clause, too. */
const WEAK_BREAKS = new Set([","]);
const STRONG_BREAKS = new Set([";", ":", "–", "—", "/", "(", ")"]);

export const isWord = (segment: SourceSegment) =>
	segment.kind === "ResolvableText" || segment.kind === "OpaqueText";

export const breakOf = (segment: SourceSegment): "weak" | "strong" | null => {
	if (segment.kind !== "Punctuation") return null;
	const text = segment.text.trim();
	if (WEAK_BREAKS.has(text)) return "weak";
	if (STRONG_BREAKS.has(text)) return "strong";
	// A spaced hyphen stands in for a dash; a word-internal one is not a break.
	if (text === "-" && segment.text !== text) return "strong";
	return null;
};

/**
 * Splits a sentence into pieces at commas, dashes, semicolons, colons,
 * slashes and parentheses. A break ends the piece before it, except an
 * opening parenthesis, which starts the piece after it. Breaks with no word
 * between them (`–,`) end one piece.
 */
export function clausePieces(segments: readonly SourceSegment[]): Piece[] {
	const pieces: Piece[] = [];
	let from = 0;
	let words = 0;
	const close = (to: number, endsStrong: boolean) => {
		const previous = pieces.at(-1);
		if (to > from && words === 0 && previous)
			pieces[pieces.length - 1] = {
				...previous,
				to,
				endsStrong: previous.endsStrong || endsStrong,
			};
		else if (to > from) pieces.push({ from, to, words, endsStrong });
		from = to;
		words = 0;
	};
	for (const [index, segment] of segments.entries()) {
		if (isWord(segment)) words += 1;
		const kind = breakOf(segment);
		if (kind === null) continue;
		if (segment.text.trim() === "(") {
			close(index, true);
			continue;
		}
		close(index + 1, kind === "strong");
	}
	close(segments.length, true);
	return pieces;
}

export function wordsIn(
	segments: readonly SourceSegment[],
	ranges: readonly SegmentRange[],
): number {
	let words = 0;
	for (const { from, to } of ranges)
		for (let index = from; index < to; index += 1)
			if (isWord(segments[index] as SourceSegment)) words += 1;
	return words;
}

/** The index of the word before `index`, at or after `floor`, or null. */
export function wordBefore(
	segments: readonly SourceSegment[],
	index: number,
	floor: number,
): number | null {
	for (let at = index - 1; at >= floor; at -= 1)
		if (isWord(segments[at] as SourceSegment)) return at;
	return null;
}

/** The index of the word at or after `index`, before `ceiling`, or null. */
export function wordAfter(
	segments: readonly SourceSegment[],
	index: number,
	ceiling: number,
): number | null {
	for (let at = index; at < ceiling; at += 1)
		if (isWord(segments[at] as SourceSegment)) return at;
	return null;
}
