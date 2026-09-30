/**
 * The pieces of one German Sentence as the lab's `segment.inUnits` arms see
 * them: every ResolvableText Segment, numbered from 1 for the judge, with
 * the word it stands for, the written word it was split from and its
 * clause. Rendering helpers turn them into judge state.
 */
import type { SegmentInUnitsInput } from "../../evaluation/spec-corpus/segment-in-units.js";

export type Piece = {
	/** The label the judge reads, 1-based and dense. */
	readonly id: number;
	/** The Segment index the output names. */
	readonly segment: number;
	readonly text: string;
	/** The word it stands for: `dem` for the `m` of `im`, else its text. */
	readonly surface: string;
	/** The whole written word when the piece is one part of a fused word. */
	readonly fusedWord?: string;
	/** Clauses are split at punctuation; used only for candidate windows. */
	readonly clause: number;
};

export type Sentence = {
	readonly text: string;
	readonly pieces: readonly Piece[];
	readonly segments: SegmentInUnitsInput["segments"];
};

const clauseBreak = /[,;:.!?–—"„“”«»‚‘’()[\]]/u;

export function sentenceOf(input: SegmentInUnitsInput): Sentence {
	const { segments } = input;
	const pieces: Piece[] = [];
	let clause = 0;
	for (const [index, segment] of segments.entries()) {
		if (segment.kind === "Punctuation" && clauseBreak.test(segment.text))
			clause++;
		if (segment.kind !== "ResolvableText") continue;
		pieces.push({
			id: pieces.length + 1,
			segment: index,
			text: segment.text,
			surface: segment.surface ?? segment.text,
			clause,
		});
	}
	// A run of ResolvableText Segments with nothing between them is one
	// written word split into pieces (`zu` + `m`, `geht` + `'s`).
	const withFusion = pieces.map((piece) => {
		let start = piece.segment;
		while (segments[start - 1]?.kind === "ResolvableText") start--;
		let end = piece.segment;
		while (segments[end + 1]?.kind === "ResolvableText") end++;
		if (start === end) return piece;
		const fusedWord = segments
			.slice(start, end + 1)
			.map(({ text }) => text)
			.join("");
		return { ...piece, fusedWord };
	});
	return {
		text: segments.map(({ text }) => text).join(""),
		pieces: withFusion,
		segments,
	};
}

/** `"an" (p7)`, how a question names a piece. */
export function label(piece: Piece): string {
	return `"${piece.text}" (p${piece.id})`;
}

/** What the judge reads about one piece in a piece list. */
export function pieceGloss(piece: Piece): string {
	const parts = [piece.text];
	if (piece.surface !== piece.text)
		parts.push(`stands for "${piece.surface}"`);
	if (piece.fusedWord)
		parts.push(`part of the written word "${piece.fusedWord}"`);
	return parts.join(", ");
}

/** The pieces as an object keyed `p1`, `p2`, …, for backticked paths. */
export function pieceTable(sentence: Sentence): Record<string, string> {
	return Object.fromEntries(
		sentence.pieces.map((piece) => [`p${piece.id}`, pieceGloss(piece)]),
	);
}

/**
 * The sentence with each piece tagged inline: `Er[1] zog[2] … an[5].`,
 * fused pieces keep their written word visible: `zu[3]m[4]`.
 */
export function taggedText(sentence: Sentence): string {
	const byIndex = new Map(
		sentence.pieces.map((piece) => [piece.segment, piece]),
	);
	return sentence.segments
		.map((segment, index) => {
			const piece = byIndex.get(index);
			return piece ? `${segment.text}[${piece.id}]` : segment.text;
		})
		.join("");
}

/** The sentence with the given pieces wrapped in ⟦ ⟧ and nothing else tagged. */
export function bracketedText(
	sentence: Sentence,
	marked: readonly number[],
): string {
	const segments = new Set(
		sentence.pieces
			.filter((piece) => marked.includes(piece.id))
			.map((piece) => piece.segment),
	);
	return sentence.segments
		.map((segment, index) =>
			segments.has(index) ? `⟦${segment.text}⟧` : segment.text,
		)
		.join("");
}

export function pieceById(sentence: Sentence, id: number): Piece {
	const piece = sentence.pieces[id - 1];
	if (!piece || piece.id !== id) throw Error(`No piece p${id}`);
	return piece;
}

export function pieceBySegment(
	sentence: Sentence,
	segment: number,
): Piece | undefined {
	return sentence.pieces.find((piece) => piece.segment === segment);
}

/** A capitalized piece that does not open its sentence or clause: likely a noun. */
export function looksNominal(sentence: Sentence, piece: Piece): boolean {
	if (!/^\p{Lu}/u.test(piece.text)) return false;
	const previous = sentence.pieces[piece.id - 2];
	return previous !== undefined && previous.clause === piece.clause;
}

/**
 * The sentence with the given pieces in ⟦ ⟧, adjacent marked pieces sharing
 * one pair: `Sie ⟦hat den Faden verloren⟧.`, `⟦hat⟧ gestern ⟦verloren⟧`.
 */
export function markedText(
	sentence: Sentence,
	marked: readonly number[],
): string {
	const segments = new Set(
		sentence.pieces
			.filter((piece) => marked.includes(piece.id))
			.map((piece) => piece.segment),
	);
	const last = Math.max(...segments);
	let text = "";
	let open = false;
	for (const [index, segment] of sentence.segments.entries()) {
		if (segments.has(index) && !open) {
			text += "⟦";
			open = true;
		}
		if (open && !segments.has(index) && segment.kind !== "Whitespace") {
			text = text.replace(/(\s*)$/u, "⟧$1");
			open = false;
		}
		text += segment.text;
		if (open && index === last) {
			text += "⟧";
			open = false;
		}
	}
	return text;
}
