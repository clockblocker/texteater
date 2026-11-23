import { type SegmentedSentence, stitchedText } from "dumgen";
import type { SupportedTargetLanguage } from "../shared/supported-target-language";
import { MAX_SEGMENTS_PER_SENTENCE } from "./storedSegments";

/**
 * A long Sentence through intake (#1193, #1343). `segment.inUnits` reads a
 * Sentence of up to `PART_CHARACTERS` whole; only a longer one, mostly
 * text without sentence punctuation, is read in parts of at most that,
 * each a Sentence of its own, whose Segments and units are joined back
 * into the one Sentence. A unit spanning two parts comes back as two, so
 * the part is as long as segmentation allows. `language.detect` reads a
 * long Sentence's opening slice. Only a Sentence too long to store its
 * Segments (`fitsSegments`) is never cut, and stays a Plain Sentence.
 */

/**
 * At most how many characters one Sentence `segment.inUnits` reads holds.
 * jev cuts its requests by tokens, so a long Sentence no longer passes
 * TypeSafe's token limit (#1324): live, a 2,020-character Sentence
 * segmented whole in 26 requests of 500,680 input tokens and 2.0 s, and
 * Kleist Sentences of 1,039 and 1,553 characters in 16 and 23 requests of
 * 284,209 and 418,783 tokens, under 2 s each (#1343). A cut
 * splits the units that span it, and German puts a verb's two halves at
 * the two ends of a long clause, so the bound stays only for text without
 * sentence punctuation; a paste's Sentences reach it at most
 * (`textSubmissionLimits.ts`).
 */
export const PART_CHARACTERS = 2_000;

/**
 * At most how many characters of one Sentence `language.detect` reads: its
 * language shows in its opening, and a detection request holds every
 * Sentence of its window of about 30 in its state, which goes beside each
 * of the request's chunks.
 */
export const DETECTION_CHARACTERS = 500;

/**
 * Whether a Sentence's Segments, at most one per character, fit
 * `MAX_SEGMENTS_PER_SENTENCE`. Over that, about 1,200 words, it is stored
 * as a Plain Sentence.
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
	limit: number = DETECTION_CHARACTERS,
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
