import type { SourceSegment } from "./link-members";

type ExcerptLimits = {
	/** A sentence this many words long or shorter is quoted whole. */
	readonly wholeSentenceMaxWords: number;
	/** An excerpt grows by whole clause pieces up to this many words. */
	readonly budgetWords: number;
	/**
	 * An excerpt shorter than this after growing by whole pieces takes the
	 * next piece's first words, up to the budget.
	 */
	readonly minWords: number;
	/** A cut that would drop fewer words than this quotes the whole sentence. */
	readonly minElidedWords: number;
};

const LIMITS: ExcerptLimits = {
	wholeSentenceMaxWords: 30,
	budgetWords: 18,
	minWords: 10,
	minElidedWords: 5,
};

const ELLIPSIS = "…";

/** Punctuation a clause piece ends at; a strong one ends a clause, too. */
const WEAK_BREAKS = new Set([","]);
const STRONG_BREAKS = new Set([";", ":", "–", "—", "/", "(", ")"]);

type Piece = {
	/** First Segment index, inclusive. */
	readonly from: number;
	/** Last Segment index, exclusive. */
	readonly to: number;
	readonly words: number;
	/** The piece ends at a strong break, so growing past it leaves the clause. */
	readonly endsStrong: boolean;
};

type Excerpt = {
	readonly segments: readonly SourceSegment[];
	readonly memberSegmentIndices: readonly number[];
};

const isWord = (segment: SourceSegment) =>
	segment.kind === "ResolvableText" || segment.kind === "OpaqueText";

const breakOf = (segment: SourceSegment): "weak" | "strong" | null => {
	if (segment.kind !== "Punctuation") return null;
	const text = segment.text.trim();
	if (WEAK_BREAKS.has(text)) return "weak";
	if (STRONG_BREAKS.has(text)) return "strong";
	// A spaced hyphen stands in for a dash; a word-internal one is not a break.
	if (text === "-" && segment.text !== text) return "strong";
	return null;
};

/**
 * Splits a sentence into clause pieces at commas, dashes, semicolons, colons,
 * slashes and parentheses. A break ends the piece before it, except an
 * opening parenthesis, which starts the piece after it.
 */
function clausePieces(segments: readonly SourceSegment[]): Piece[] {
	const pieces: Piece[] = [];
	let from = 0;
	let words = 0;
	const close = (to: number, endsStrong: boolean) => {
		const previous = pieces.at(-1);
		// Breaks with no word between them (`–,`) end one piece.
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

/**
 * The part of a source sentence a Source Context quotes: the clause pieces
 * holding the occurrence's members, grown by whole neighbouring pieces while
 * the excerpt stays within the word budget, preferring a neighbour in the
 * same clause, then the shorter one, then the one before; a short excerpt
 * then takes the next piece's first words. A sentence of at most 30 words
 * is quoted whole, and so is one a cut would shorten by under 5 words. A
 * piece too long for the budget is cut by words around the members. Each
 * cut shows as an ellipsis Segment, and the member indices are remapped onto
 * the excerpt. Following the quote opens the whole sentence in place.
 */
export function excerptSourceSentence(
	segments: readonly SourceSegment[],
	memberSegmentIndices: readonly number[],
): Excerpt {
	const { wholeSentenceMaxWords, budgetWords, minWords, minElidedWords } =
		LIMITS;
	const whole = { segments, memberSegmentIndices };
	const totalWords = segments.filter(isWord).length;
	if (totalWords <= wholeSentenceMaxWords) return whole;
	if (memberSegmentIndices.length === 0) return whole;

	const pieces = clausePieces(segments);
	const pieceOf = (segmentIndex: number) =>
		pieces.findIndex(
			(piece) => segmentIndex >= piece.from && segmentIndex < piece.to,
		);
	const memberPieces = new Set(memberSegmentIndices.map(pieceOf));
	const first = Math.min(...memberPieces);
	const last = Math.max(...memberPieces);

	// The core: every piece from the first member's to the last member's,
	// dropping memberless pieces between them when the span is over budget.
	const spanWords = sum(pieces.slice(first, last + 1).map((p) => p.words));
	const kept = new Set<number>();
	for (let index = first; index <= last; index += 1)
		if (spanWords <= budgetWords || memberPieces.has(index))
			kept.add(index);
	let keptWords = sum([...kept].map((index) => pieces[index]?.words ?? 0));

	let left = first - 1;
	let right = last + 1;
	for (;;) {
		const candidates: { index: number; sameClause: boolean }[] = [];
		const leftPiece = pieces[left];
		const rightPiece = pieces[right];
		if (leftPiece && keptWords + leftPiece.words <= budgetWords)
			candidates.push({ index: left, sameClause: !leftPiece.endsStrong });
		if (rightPiece && keptWords + rightPiece.words <= budgetWords)
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
		kept.add(next.index);
		keptWords += pieces[next.index]?.words ?? 0;
		if (next.index === left) left -= 1;
		else right += 1;
	}

	let ranges = [...kept]
		.sort((a, b) => a - b)
		.map((index) => {
			const piece = pieces[index] as Piece;
			return { from: piece.from, to: piece.to };
		});
	if (keptWords > budgetWords)
		ranges = ranges.map((range) =>
			wordWindow(segments, range, memberSegmentIndices, budgetWords),
		);
	else if (keptWords < minWords)
		ranges = fill(
			segments,
			ranges,
			pieces[right],
			pieces[left],
			budgetWords - keptWords,
		);

	if (totalWords - wordsIn(segments, ranges) < minElidedWords) return whole;
	return stitch(segments, mergeRanges(ranges), memberSegmentIndices);
}

/**
 * Cuts a piece that holds members down to the words around them: the
 * members' own span, grown a word at a time on alternating sides, before
 * first, until the budget is spent.
 */
function wordWindow(
	segments: readonly SourceSegment[],
	range: { from: number; to: number },
	memberSegmentIndices: readonly number[],
	budgetWords: number,
): { from: number; to: number } {
	const inside = memberSegmentIndices.filter(
		(index) => index >= range.from && index < range.to,
	);
	if (inside.length === 0) return range;
	let from = Math.min(...inside);
	let to = Math.max(...inside) + 1;
	let words = wordsIn(segments, [{ from, to }]);
	const budget = Math.max(budgetWords, words);
	const wordBefore = (index: number) => {
		for (let i = index - 1; i >= range.from; i -= 1)
			if (isWord(segments[i] as SourceSegment)) return i;
		return null;
	};
	const wordAfter = (index: number) => {
		for (let i = index; i < range.to; i += 1)
			if (isWord(segments[i] as SourceSegment)) return i;
		return null;
	};
	let leftTurn = true;
	while (words < budget) {
		const before = wordBefore(from);
		const after = wordAfter(to);
		if (before === null && after === null) break;
		if ((leftTurn && before !== null) || after === null) {
			from = before as number;
		} else {
			to = after + 1;
		}
		words += 1;
		leftTurn = !leftTurn;
	}
	// Reaching a piece's edge keeps its trailing punctuation.
	if (wordAfter(to) === null) to = range.to;
	return { from, to };
}

/**
 * Lengthens a short excerpt into the piece after it, by its first words,
 * which start a clause; with no piece after, into the piece before it, by
 * its last words.
 */
function fill(
	segments: readonly SourceSegment[],
	ranges: { from: number; to: number }[],
	after: Piece | undefined,
	before: Piece | undefined,
	words: number,
): { from: number; to: number }[] {
	const first = ranges[0];
	const last = ranges.at(-1);
	if (!first || !last) return ranges;
	if (after) {
		let to = last.to;
		let taken = 0;
		while (to < after.to && taken < words) {
			if (isWord(segments[to] as SourceSegment)) taken += 1;
			to += 1;
		}
		return [...ranges.slice(0, -1), { from: last.from, to }];
	}
	if (before) {
		let from = first.from;
		let taken = 0;
		while (from > before.from && taken < words) {
			from -= 1;
			if (isWord(segments[from] as SourceSegment)) taken += 1;
		}
		return [{ from, to: first.to }, ...ranges.slice(1)];
	}
	return ranges;
}

function wordsIn(
	segments: readonly SourceSegment[],
	ranges: readonly { from: number; to: number }[],
): number {
	let words = 0;
	for (const { from, to } of ranges)
		for (let index = from; index < to; index += 1)
			if (isWord(segments[index] as SourceSegment)) words += 1;
	return words;
}

function mergeRanges(
	ranges: readonly { from: number; to: number }[],
): { from: number; to: number }[] {
	const merged: { from: number; to: number }[] = [];
	for (const range of ranges) {
		const previous = merged.at(-1);
		if (previous && previous.to >= range.from) previous.to = range.to;
		else merged.push({ ...range });
	}
	return merged;
}

/**
 * Joins the kept ranges with an ellipsis at each cut. A cut drops the
 * whitespace and break punctuation at its edge, so the excerpt reads
 * `… und seiner Plaidrolle in einem kleinen grau gepolsterten Abteil …`.
 */
function stitch(
	segments: readonly SourceSegment[],
	ranges: readonly { from: number; to: number }[],
	memberSegmentIndices: readonly number[],
): Excerpt {
	const members = new Set(memberSegmentIndices);
	const out: SourceSegment[] = [];
	const outMembers: number[] = [];
	const ellipsis = (text: string): SourceSegment => ({
		kind: "Punctuation",
		text,
	});
	for (const [position, range] of ranges.entries()) {
		const { from, to } = trimAtCuts(segments, range);
		if (from > 0)
			out.push(
				ellipsis(position === 0 ? `${ELLIPSIS} ` : ` ${ELLIPSIS} `),
			);
		for (let index = from; index < to; index += 1) {
			if (members.has(index)) outMembers.push(out.length);
			out.push(segments[index] as SourceSegment);
		}
		if (to < segments.length && position === ranges.length - 1)
			out.push(ellipsis(` ${ELLIPSIS}`));
	}
	return dropUnpairedQuotes(out, outMembers);
}

const OPENERS = new Set(["(", "„", "»", "›", "‚", "“", '"']);
/** Each closing mark and the openers it closes. */
const CLOSERS = new Map<string, readonly string[]>([
	[")", ["("]],
	["“", ["„"]],
	["”", ["“", "„"]],
	["«", ["»"]],
	["‹", ["›"]],
	["‘", ["‚"]],
	['"', ['"']],
]);

/**
 * Drops a quotation mark or parenthesis whose partner a cut left out and
 * that encloses no word of the excerpt, such as a `„` left right before the
 * closing ellipsis. One that encloses words stays, so `(ein hagerer Mann …`
 * still reads as an aside. `“` closes a pending `„` and otherwise opens;
 * `"` closes a pending `"` and otherwise opens.
 */
function dropUnpairedQuotes(
	segments: readonly SourceSegment[],
	memberSegmentIndices: readonly number[],
): Excerpt {
	const open: number[] = [];
	const unpairedClosers: number[] = [];
	for (const [index, segment] of segments.entries()) {
		if (segment.kind !== "Punctuation") continue;
		const closes = CLOSERS.get(segment.text);
		const pending = open.at(-1);
		if (
			closes &&
			pending !== undefined &&
			closes.includes((segments[pending] as SourceSegment).text)
		) {
			open.pop();
			continue;
		}
		if (OPENERS.has(segment.text)) open.push(index);
		else if (closes) unpairedClosers.push(index);
	}
	const unpaired = new Set([
		...open.filter((index) => !segments.slice(index + 1).some(isWord)),
		...unpairedClosers.filter(
			(index) => !segments.slice(0, index).some(isWord),
		),
	]);
	if (unpaired.size === 0) return { segments, memberSegmentIndices };
	const shift = (index: number) =>
		index - [...unpaired].filter((dropped) => dropped < index).length;
	return {
		segments: segments.filter((_, index) => !unpaired.has(index)),
		memberSegmentIndices: memberSegmentIndices.map(shift),
	};
}

/**
 * A kept range without the whitespace and break punctuation at its cut
 * edges. An opening quotation mark or parenthesis at its start stays.
 */
function trimAtCuts(
	segments: readonly SourceSegment[],
	range: { from: number; to: number },
): { from: number; to: number } {
	let { from, to } = range;
	if (from > 0)
		while (from < to) {
			const segment = segments[from] as SourceSegment;
			if (isWord(segment) || OPENERS.has(segment.text)) break;
			from += 1;
		}
	if (to < segments.length)
		while (to > from && droppableAtCut(segments[to - 1] as SourceSegment))
			to -= 1;
	return { from, to };
}

/** Whitespace and break punctuation go at a cut, but a closing `)` stays. */
function droppableAtCut(segment: SourceSegment): boolean {
	if (segment.kind === "Whitespace") return true;
	return breakOf(segment) !== null && segment.text.trim() !== ")";
}

function sum(values: readonly number[]): number {
	return values.reduce((total, value) => total + value, 0);
}
