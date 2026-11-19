import type { SourceSegment } from "./link-members";
import type { PhraseOpeners } from "./phrase-openers";
import {
	clausePieces,
	isWord,
	type Piece,
	type SegmentRange,
	wordAfter,
	wordBefore,
	wordsIn,
} from "./source-excerpt-pieces";
import { type Excerpt, stitch } from "./source-excerpt-stitch";

const LIMITS = {
	/** A sentence this many words long or shorter is quoted whole. */
	wholeSentenceMaxWords: 30,
	/** The most words an excerpt of a unit whose words stand together keeps. */
	budgetWords: 18,
	/**
	 * The most words an excerpt of a scattered unit keeps, shared among its
	 * parts: it reads in fragments, so it gets more.
	 */
	scatteredBudgetWords: 24,
	/**
	 * An excerpt shorter than this after growing by whole pieces takes the
	 * next piece's first words, up to the budget.
	 */
	minWords: 10,
	/**
	 * A gap of fewer words than this is never cut: between two parts of a
	 * unit, between two kept stretches, or at the sentence's ends.
	 */
	minElidedWords: 5,
};

/** Which way a window grows first from its members. */
type Direction = "before" | "after" | "both";

/**
 * The part of a source sentence a Source Context quotes. A sentence of at
 * most 30 words is quoted whole, and so is one a cut would shorten by under
 * 5 words.
 *
 * A unit whose words stand together keeps the pieces (stretches between
 * commas, dashes, colons, semicolons, slashes and parentheses) that hold
 * them, grown by whole neighbouring pieces up to 18 words, preferring one in
 * the same clause, then the shorter, then the one before; a short excerpt
 * then takes the next piece's first words.
 *
 * A scattered unit, whose words span more than 18 and stand 5 or more words
 * apart, keeps each part's pieces and elides what lies between, sharing 24
 * words among the parts. A part's pieces too long for its share are cut by
 * words, growing only toward the other parts: the first part keeps what
 * follows it, the last what precedes it. Words left over grow the excerpt
 * outward by whole pieces.
 *
 * A piece too long for the budget is cut by words around the members, and no
 * cut ends on a determiner or starts just after a phrase opener
 * (`phraseOpeners`). Each cut shows as an
 * ellipsis Segment, and the member indices are remapped onto the excerpt.
 * Following the quote opens the whole sentence in place.
 */
export function excerptSourceSentence(
	segments: readonly SourceSegment[],
	memberSegmentIndices: readonly number[],
	phraseOpeners: PhraseOpeners = {
		determiners: new Set(),
		prepositions: new Set(),
	},
): Excerpt {
	const whole = { segments, memberSegmentIndices };
	const totalWords = segments.filter(isWord).length;
	if (
		totalWords <= LIMITS.wholeSentenceMaxWords ||
		memberSegmentIndices.length === 0
	)
		return whole;

	const pieces = clausePieces(segments);
	const clusters = memberClusters(segments, memberSegmentIndices);
	const ranges =
		clusters.length === 1
			? compactWindow(segments, pieces, clusters[0] as number[])
			: scatteredWindows(segments, pieces, clusters);
	const joined = joinRanges(segments, ranges);
	if (totalWords - wordsIn(segments, joined) < LIMITS.minElidedWords)
		return whole;
	return stitch(segments, joined, memberSegmentIndices, phraseOpeners);
}

/**
 * The unit's members in parts: one part when they span at most the budget,
 * otherwise split wherever 5 or more words stand between two members.
 */
function memberClusters(
	segments: readonly SourceSegment[],
	memberSegmentIndices: readonly number[],
): number[][] {
	const sorted = [...memberSegmentIndices].sort((a, b) => a - b);
	const first = sorted[0] as number;
	const last = sorted.at(-1) as number;
	if (
		wordsIn(segments, [{ from: first, to: last + 1 }]) <= LIMITS.budgetWords
	)
		return [sorted];
	const clusters: number[][] = [];
	for (const [position, member] of sorted.entries()) {
		const previous = sorted[position - 1];
		const gap =
			previous === undefined
				? Number.POSITIVE_INFINITY
				: wordsIn(segments, [{ from: previous + 1, to: member }]);
		if (gap >= LIMITS.minElidedWords) clusters.push([member]);
		else clusters.at(-1)?.push(member);
	}
	return clusters;
}

const pieceIndexOf = (pieces: readonly Piece[], segmentIndex: number) =>
	pieces.findIndex(
		(piece) => segmentIndex >= piece.from && segmentIndex < piece.to,
	);

/** The pieces a unit whose words stand together keeps. */
function compactWindow(
	segments: readonly SourceSegment[],
	pieces: readonly Piece[],
	members: readonly number[],
): SegmentRange[] {
	const first = pieceIndexOf(pieces, members[0] as number);
	const last = pieceIndexOf(pieces, members.at(-1) as number);
	const span = {
		from: (pieces[first] as Piece).from,
		to: (pieces[last] as Piece).to,
	};
	if (wordsIn(segments, [span]) > LIMITS.budgetWords)
		return [
			wordWindow(segments, span, members, LIMITS.budgetWords, "both"),
		];
	const grown = growByPieces(
		pieces,
		first - 1,
		last + 1,
		wordsIn(segments, [span]),
		LIMITS.budgetWords,
	);
	const range = {
		from: (pieces[grown.first] as Piece).from,
		to: (pieces[grown.last] as Piece).to,
	};
	if (grown.words >= LIMITS.minWords) return [range];
	return [
		fill(
			segments,
			range,
			pieces[grown.last + 1],
			pieces[grown.first - 1],
			LIMITS.budgetWords - grown.words,
		),
	];
}

/** The windows of a scattered unit's parts, sharing one budget. */
function scatteredWindows(
	segments: readonly SourceSegment[],
	pieces: readonly Piece[],
	clusters: readonly number[][],
): SegmentRange[] {
	const share = Math.floor(LIMITS.scatteredBudgetWords / clusters.length);
	const windows = clusters.map((cluster, position) => {
		const span = {
			from: (pieces[pieceIndexOf(pieces, cluster[0] as number)] as Piece)
				.from,
			to: (
				pieces[pieceIndexOf(pieces, cluster.at(-1) as number)] as Piece
			).to,
		};
		const direction: Direction =
			position === 0
				? "after"
				: position === clusters.length - 1
					? "before"
					: "both";
		return wordsIn(segments, [span]) <= share
			? span
			: wordWindow(segments, span, cluster, share, direction);
	});
	const firstWindow = windows[0] as SegmentRange;
	const lastWindow = windows.at(-1) as SegmentRange;
	const before = pieces.findIndex((piece) => piece.from === firstWindow.from);
	const after = pieces.findIndex((piece) => piece.to === lastWindow.to);
	const grown = growByPieces(
		pieces,
		before === -1 ? -1 : before - 1,
		after === -1 ? pieces.length : after + 1,
		wordsIn(segments, windows),
		LIMITS.scatteredBudgetWords,
	);
	return [
		...(before === -1 || grown.first >= before
			? []
			: [
					{
						from: (pieces[grown.first] as Piece).from,
						to: firstWindow.from,
					},
				]),
		...windows,
		...(after === -1 || grown.last <= after
			? []
			: [{ from: lastWindow.to, to: (pieces[grown.last] as Piece).to }]),
	];
}

/**
 * Adds whole pieces from `left` down and `right` up while the words stay
 * within the budget, preferring a piece in the same clause, then the
 * shorter, then the one before. Returns the first and last pieces kept,
 * which are `left + 1` and `right - 1` when none fits.
 */
function growByPieces(
	pieces: readonly Piece[],
	left: number,
	right: number,
	words: number,
	budget: number,
): { first: number; last: number; words: number } {
	let total = words;
	for (;;) {
		const candidates: { index: number; sameClause: boolean }[] = [];
		const leftPiece = pieces[left];
		const rightPiece = pieces[right];
		if (leftPiece && total + leftPiece.words <= budget)
			candidates.push({ index: left, sameClause: !leftPiece.endsStrong });
		if (rightPiece && total + rightPiece.words <= budget)
			candidates.push({
				index: right,
				sameClause: !pieces[right - 1]?.endsStrong,
			});
		const next = candidates.sort(
			(a, b) =>
				Number(b.sameClause) - Number(a.sameClause) ||
				(pieces[a.index]?.words ?? 0) - (pieces[b.index]?.words ?? 0) ||
				a.index - b.index,
		)[0];
		if (!next) break;
		total += pieces[next.index]?.words ?? 0;
		if (next.index === left) left -= 1;
		else right += 1;
	}
	return { first: left + 1, last: right - 1, words: total };
}

/**
 * Cuts a stretch down to the words around its members: their own span,
 * grown a word at a time within the stretch until the budget is spent. It
 * grows only `after` the members, only `before` them, or on alternating
 * sides, before first. Reaching the stretch's edge keeps what lies there,
 * such as its closing punctuation.
 */
function wordWindow(
	segments: readonly SourceSegment[],
	range: SegmentRange,
	members: readonly number[],
	budgetWords: number,
	direction: Direction,
): SegmentRange {
	let from = Math.min(...members);
	let to = Math.max(...members) + 1;
	let words = wordsIn(segments, [{ from, to }]);
	const budget = Math.max(budgetWords, words);
	let leftTurn = direction !== "after";
	while (words < budget) {
		const before =
			direction === "after"
				? null
				: wordBefore(segments, from, range.from);
		const after =
			direction === "before" ? null : wordAfter(segments, to, range.to);
		if (before === null && after === null) break;
		const takeLeft =
			after === null ||
			(before !== null &&
				(direction === "before" || (direction === "both" && leftTurn)));
		if (takeLeft) from = before as number;
		else to = (after as number) + 1;
		words += 1;
		leftTurn = !leftTurn;
	}
	if (wordBefore(segments, from, range.from) === null) from = range.from;
	if (wordAfter(segments, to, range.to) === null) to = range.to;
	return { from, to };
}

/**
 * Lengthens a short excerpt into the piece after it, by its first words,
 * which start a clause; with no piece after, into the piece before it, by
 * its last words.
 */
function fill(
	segments: readonly SourceSegment[],
	range: SegmentRange,
	after: Piece | undefined,
	before: Piece | undefined,
	words: number,
): SegmentRange {
	if (after) {
		let to = range.to;
		for (let taken = 0; to < after.to && taken < words; to += 1)
			if (isWord(segments[to] as SourceSegment)) taken += 1;
		return { from: range.from, to };
	}
	if (before) {
		let from = range.from;
		for (let taken = 0; from > before.from && taken < words; ) {
			from -= 1;
			if (isWord(segments[from] as SourceSegment)) taken += 1;
		}
		return { from, to: range.to };
	}
	return range;
}

/**
 * The kept stretches in order, overlapping ones merged, and two with fewer
 * than 5 words between them joined, since eliding those reads worse than
 * keeping them. A stretch within 5 words of the sentence's start or end
 * reaches it.
 */
function joinRanges(
	segments: readonly SourceSegment[],
	ranges: readonly SegmentRange[],
): SegmentRange[] {
	const joined: { from: number; to: number }[] = [];
	for (const range of [...ranges].sort((a, b) => a.from - b.from)) {
		const previous = joined.at(-1);
		if (
			previous &&
			(previous.to >= range.from ||
				wordsIn(segments, [{ from: previous.to, to: range.from }]) <
					LIMITS.minElidedWords)
		)
			previous.to = Math.max(previous.to, range.to);
		else joined.push({ ...range });
	}
	const first = joined[0];
	const last = joined.at(-1);
	if (
		first &&
		wordsIn(segments, [{ from: 0, to: first.from }]) < LIMITS.minElidedWords
	)
		first.from = 0;
	if (
		last &&
		wordsIn(segments, [{ from: last.to, to: segments.length }]) <
			LIMITS.minElidedWords
	)
		last.to = segments.length;
	return joined;
}
