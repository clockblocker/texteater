/**
 * Where a Saying may lie in a Sentence: the spans the judge weighs as a
 * whole Saying (de/saying-needs-uptake), read from the words alone.
 */
import type { Piece, Sentence } from "./sentence.js";

/** A span the judge weighs as a whole Saying. */
export type SayingSpan = {
	readonly pieces: readonly Piece[];
	readonly text: string;
};

const quoteMarks = /[„“”"»«‚‘’›‹]/u;

/**
 * The whole sentence, every quoted stretch, every clause of three or more
 * pieces and every two adjacent clauses: where a Saying may lie.
 */
export function sayingSpans(sentence: Sentence): SayingSpan[] {
	const spans = new Map<string, readonly Piece[]>();
	const add = (pieces: readonly Piece[]) => {
		if (pieces.length >= 3)
			spans.set(pieces.map((piece) => piece.id).join(","), pieces);
	};
	add(sentence.pieces);
	let open: number | undefined;
	for (const [index, segment] of sentence.segments.entries()) {
		if (segment.kind !== "Punctuation" || !quoteMarks.test(segment.text))
			continue;
		if (open === undefined) open = index;
		else {
			const start = open;
			add(
				sentence.pieces.filter(
					(piece) => piece.segment > start && piece.segment < index,
				),
			);
			open = undefined;
		}
	}
	const clauses = [...new Set(sentence.pieces.map((piece) => piece.clause))];
	for (const [position, clause] of clauses.entries()) {
		add(sentence.pieces.filter((piece) => piece.clause === clause));
		const next = clauses[position + 1];
		if (next !== undefined)
			add(
				sentence.pieces.filter(
					(piece) => piece.clause === clause || piece.clause === next,
				),
			);
	}
	return [...spans.values()].map((pieces) => {
		const first = pieces[0]?.segment ?? 0;
		const last = pieces[pieces.length - 1]?.segment ?? 0;
		return {
			pieces,
			text: sentence.segments
				.slice(first, last + 1)
				.map((segment) => segment.text)
				.join(""),
		};
	});
}
