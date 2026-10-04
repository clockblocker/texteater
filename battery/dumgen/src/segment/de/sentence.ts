/**
 * One German Sentence as the unit stage's judge reads it. Its ResolvableText
 * Segments are the judge's pieces, numbered from 1, each with the word it
 * stands for, the written word it was split from and its clause. "Piece"
 * is the judge's word, kept inside the German implementation (Dumgen ADR
 * 0007); the stage's output names Segments by index.
 */
import type { EntryType } from "@typesafe-ai/sdk";
import type { Segment } from "../segmented-sentence.js";
import { unitGuide } from "./unit-guide.js";

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
	readonly segments: readonly Segment[];
};

const clauseBreak = /[,;:.!?–—"„“”«»‚‘’()[\]]/u;

export function sentenceOf(input: {
	readonly segments: readonly Segment[];
}): Sentence {
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

/** What the judge reads about one piece in a piece list. */
function pieceGloss(piece: Piece): string {
	const parts = [piece.text];
	if (piece.surface !== piece.text)
		parts.push(`stands for "${piece.surface}"`);
	if (piece.fusedWord)
		parts.push(`part of the written word "${piece.fusedWord}"`);
	return parts.join(", ");
}

/** How a question names a piece, matching the state's rendering. */
export type Reference = (piece: Piece) => string;

/**
 * The judge state every request of the unit stage reads: the plain
 * Sentence, its pieces keyed `p1`, `p2`, … for backticked paths, and the
 * unit guide. Questions name a piece as `` `pieces.p7` ("an") ``.
 */
export function judgeState(sentence: Sentence): {
	readonly state: Record<string, EntryType>;
	readonly ref: Reference;
} {
	const state: Record<string, EntryType> = {
		sentence: sentence.text,
		pieces: Object.fromEntries(
			sentence.pieces.map((piece) => [`p${piece.id}`, pieceGloss(piece)]),
		),
	};
	state.units = unitGuide;
	return {
		state,
		ref: (piece) => `\`pieces.p${piece.id}\` ("${piece.text}")`,
	};
}

export const joinRefs = (
	sentence: Sentence,
	ref: Reference,
	group: readonly number[],
): string =>
	group
		.map((id) => {
			const piece = sentence.pieces[id - 1];
			if (!piece) throw Error(`No piece p${id}`);
			return ref(piece);
		})
		.join(", ");
