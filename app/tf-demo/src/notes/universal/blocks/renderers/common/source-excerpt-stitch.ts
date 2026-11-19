import type { SourceSegment } from "./link-members";
import type { PhraseOpeners } from "./phrase-openers";
import { breakOf, isWord, type SegmentRange } from "./source-excerpt-pieces";

/** An excerpt's Segments, ellipses included, and its members among them. */
export type Excerpt = {
	readonly segments: readonly SourceSegment[];
	readonly memberSegmentIndices: readonly number[];
};

const ELLIPSIS = "…";
/** How many phrase-opening words a cut may move back over. */
const MAX_OPENERS_TAKEN = 2;

const QUOTE_OPENERS = new Set(["(", "„", "»", "›", "‚", "“", '"']);
/** Each closing mark and the openers it closes. */
const QUOTE_CLOSERS = new Map<string, readonly string[]>([
	[")", ["("]],
	["“", ["„"]],
	["”", ["“", "„"]],
	["«", ["»"]],
	["‹", ["›"]],
	["‘", ["‚"]],
	['"', ['"']],
]);

/**
 * Joins the kept ranges with an ellipsis at each cut. A cut drops the
 * whitespace and break punctuation at its edge, and never strands a
 * phrase's opening word: a range starting just after an article or
 * preposition takes it in (`… in der grauen Livree`, not `… der grauen
 * Livree`), and one ending on such words drops them (`… selbst …`, not
 * `… selbst an den …`).
 */
export function stitch(
	segments: readonly SourceSegment[],
	ranges: readonly SegmentRange[],
	memberSegmentIndices: readonly number[],
	phraseOpeners: PhraseOpeners,
): Excerpt {
	const members = new Set(memberSegmentIndices);
	const out: SourceSegment[] = [];
	const outMembers: number[] = [];
	const ellipsis = (text: string): SourceSegment => ({
		kind: "Punctuation",
		text,
	});
	for (const [position, range] of ranges.entries()) {
		const { from, to } = trimAtCuts(
			segments,
			range,
			members,
			phraseOpeners,
		);
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

/**
 * A kept range with its cut edges settled: whitespace and break punctuation
 * go, an opening quotation mark or parenthesis at its start stays, a start
 * takes in up to two phrase openers before it, and an end drops the
 * determiners it ends on with the prepositions before them, and a
 * preposition the cut parts from its determiner. Any other preposition
 * stays at an end, since a German clause often ends on a separable particle
 * spelled like one (`rief dem Wachtmeister zu`).
 */
function trimAtCuts(
	segments: readonly SourceSegment[],
	range: SegmentRange,
	members: ReadonlySet<number>,
	phraseOpeners: PhraseOpeners,
): SegmentRange {
	const textAt = (index: number) =>
		(segments[index] as SourceSegment).text.toLowerCase();
	let { from, to } = range;
	if (from > 0) {
		from = skipToFirstWord(segments, from, to);
		for (let taken = 0; taken < MAX_OPENERS_TAKEN; taken += 1) {
			const previous = from - 2;
			if (
				segments[from - 1]?.kind !== "Whitespace" ||
				previous < 0 ||
				!(
					phraseOpeners.determiners.has(textAt(previous)) ||
					phraseOpeners.prepositions.has(textAt(previous))
				)
			)
				break;
			from = previous;
		}
	}
	if (to < segments.length) {
		to = settleEnd(segments, from, to);
		const droppable = (index: number, words: ReadonlySet<string>) =>
			index > from &&
			isWord(segments[index] as SourceSegment) &&
			!members.has(index) &&
			words.has(textAt(index)) &&
			segments[index - 1]?.kind === "Whitespace";
		// A preposition the cut parts from its determiner opens the cut
		// phrase; one before anything else may be a particle.
		let precedesDeterminer =
			segments[to]?.kind === "Whitespace" &&
			phraseOpeners.determiners.has(
				segments[to + 1]?.text.toLowerCase() ?? "",
			);
		while (droppable(to - 1, phraseOpeners.determiners)) {
			to = settleEnd(segments, from, to - 1);
			precedesDeterminer = true;
		}
		while (
			precedesDeterminer &&
			droppable(to - 1, phraseOpeners.prepositions)
		)
			to = settleEnd(segments, from, to - 1);
	}
	return { from, to };
}

/** The first word or opening mark at or after `from`. */
function skipToFirstWord(
	segments: readonly SourceSegment[],
	from: number,
	to: number,
): number {
	let at = from;
	while (at < to) {
		const segment = segments[at] as SourceSegment;
		if (isWord(segment) || QUOTE_OPENERS.has(segment.text)) break;
		at += 1;
	}
	return at;
}

/** `to` moved back over the whitespace and break punctuation it ends on. */
function settleEnd(
	segments: readonly SourceSegment[],
	from: number,
	to: number,
): number {
	let at = to;
	while (at > from && droppableAtCut(segments[at - 1] as SourceSegment))
		at -= 1;
	return at;
}

/** Whitespace and break punctuation go at a cut, but a closing `)` stays. */
function droppableAtCut(segment: SourceSegment): boolean {
	if (segment.kind === "Whitespace") return true;
	return breakOf(segment) !== null && segment.text.trim() !== ")";
}

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
		const closes = QUOTE_CLOSERS.get(segment.text);
		const pending = open.at(-1);
		if (
			closes &&
			pending !== undefined &&
			closes.includes((segments[pending] as SourceSegment).text)
		) {
			open.pop();
			continue;
		}
		if (QUOTE_OPENERS.has(segment.text)) open.push(index);
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
