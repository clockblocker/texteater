import { type SegmentedSentence, stitchedText } from "dumgen";
import type { SupportedTargetLanguage } from "../shared/supported-target-language";
import { MAX_SEGMENTS_PER_SENTENCE } from "./storedSegments";

/**
 * A long Sentence through intake (#1193). `language.detect` reads its
 * opening slice, and `segment.inUnits` reads it in parts of at most
 * `PART_CHARACTERS`, each a Sentence of its own, whose Segments and units
 * are joined back into the one Sentence; a unit spanning two parts comes
 * back as two. A shorter Sentence passes through untouched. Only a
 * Sentence too long to store its Segments (`fitsSegments`) stays an
 * undetermined Plain Sentence.
 */

/**
 * At most how many characters one Sentence `segment.inUnits` reads holds.
 * One of its jev requests grows with the Sentence and TypeSafe refuses one
 * over its token limit: live on 2026-10-20, a 600-character German Sentence
 * took a request of 59,000 input tokens and a 700-character one failed
 * with `max_tokens_exceeded`.
 */
export const PART_CHARACTERS = 500;

/**
 * Whether a Sentence's Segments, at most one per character, fit
 * `MAX_SEGMENTS_PER_SENTENCE`. Over that, about 1,200 words, it is stored
 * as an undetermined Plain Sentence.
 */
export function fitsSegments(sentence: string): boolean {
	return stitchedText(sentence).length <= MAX_SEGMENTS_PER_SENTENCE;
}

const whitespaceRun = /\s+/gu;
/** A part preferably ends a clause, right before the whitespace run after it. */
const clauseEnd = /[,;:–—)\]»«"“”‘’]/u;

/**
 * Where `text`'s next part ends: before the last whitespace run that starts
 * within `limit`, preferring one after a clause end in the part's second
 * half, else mid-word at `limit`.
 */
function nextCut(
	text: string,
	limit: number,
): { readonly end: number; readonly separator: string } {
	let lastRun: RegExpExecArray | undefined;
	let lastClause: RegExpExecArray | undefined;
	for (const run of text.matchAll(whitespaceRun)) {
		if (run.index > limit) break;
		if (run.index === 0) continue;
		lastRun = run;
		if (clauseEnd.test(text.charAt(run.index - 1))) lastClause = run;
	}
	const run =
		lastClause && lastClause.index >= limit / 2 ? lastClause : lastRun;
	if (run) return { end: run.index, separator: run[0] };
	// No whitespace at all: cut mid-word, never inside a surrogate pair.
	const high = text.charCodeAt(limit - 1);
	const end = high >= 0xd800 && high <= 0xdbff ? limit - 1 : limit;
	return { end, separator: "" };
}

/** A Sentence cut into parts, with the whitespace that ran between each two. */
export type SentenceParts = {
	readonly parts: readonly string[];
	/** `separators[i]` ran between `parts[i]` and `parts[i + 1]`. */
	readonly separators: readonly string[];
};

/**
 * `sentence` as `segment.inUnits` reads it: whole when its Stitched Text
 * fits the bound, else that text in parts of at most `limit` UTF-16 units
 * (so at most `limit` characters), cut at whitespace, at a clause end when
 * one is near.
 */
export function sentenceParts(
	sentence: string,
	limit: number = PART_CHARACTERS,
): SentenceParts {
	let rest = stitchedText(sentence);
	if (rest.length <= limit) return { parts: [sentence], separators: [] };
	const parts: string[] = [];
	const separators: string[] = [];
	while (rest.length > limit) {
		const { end, separator } = nextCut(rest, limit);
		parts.push(rest.slice(0, end));
		separators.push(separator);
		rest = rest.slice(end + separator.length);
	}
	parts.push(rest);
	return { parts, separators };
}

/**
 * What `language.detect` reads of `sentence`: all of it when it fits the
 * bound, else its opening, cut at whitespace: a Sentence's language shows
 * there.
 */
export function detectionSlice(
	sentence: string,
	limit: number = PART_CHARACTERS,
): string {
	const text = stitchedText(sentence);
	if (text.length <= limit) return sentence;
	return text.slice(0, nextCut(text, limit).end);
}

/**
 * The one Sentence its parts' Segmented Sentences make: their Segments in
 * order with each separator a Whitespace Segment between them, and their
 * units with Segment indices shifted to match. When any part failed, the
 * Sentence failed, with no units.
 */
export function joinedSentence<L extends SupportedTargetLanguage>(
	segmented: readonly SegmentedSentence<L>[],
	{ separators }: Pick<SentenceParts, "separators">,
): SegmentedSentence<L> {
	if (segmented.length !== separators.length + 1)
		throw new Error(
			"segment.inUnits returned other parts than it was given.",
		);
	const [only] = segmented;
	if (segmented.length === 1 && only) return only;
	const segments: SegmentedSentence<L>["segments"][number][] = [];
	const units: SegmentedSentence<L>["units"][number][] = [];
	for (const [index, part] of segmented.entries()) {
		const offset = segments.length;
		segments.push(...part.segments);
		units.push(
			...part.units.map((unit) => ({
				...unit,
				segments: unit.segments.map((segment) => segment + offset),
			})),
		);
		const separator = separators[index];
		if (separator) segments.push({ kind: "Whitespace", text: separator });
	}
	const text = segments.map((segment) => segment.text).join("");
	return segmented.some((part) => part.failed)
		? { text, segments, units: [], failed: true }
		: { text, segments, units };
}
