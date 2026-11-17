import type { ExplainPronounInput, PassageSentence } from "dumgen";
import { isAntecedentCandidate } from "../shared/pronoun-explanation";
import type { StoredSegment, StoredUnit } from "./storedSegments";

/**
 * The passage a Pronoun Explanation asks about: the pronoun's Sentence
 * whole, after the context before it, with the noun units an Antecedent
 * may be marked as candidates.
 */

/** The most Sentences before the pronoun's that the context reaches back. */
export const CONTEXT_MAX_SENTENCES = 3;
/** The most words the context before the pronoun's Sentence holds. */
export const CONTEXT_MAX_WORDS = 50;

/** A stored Sentence as an explanation reads it. */
export type ExplainedSentence = {
	readonly sentenceId: string;
	readonly stitchedText: string;
	readonly segments: readonly Pick<
		StoredSegment,
		"index" | "kind" | "text"
	>[];
	/** Absent once Analysis Stripping removed them, or when segmentation failed. */
	readonly units?: readonly StoredUnit[];
};

type Piece = Pick<StoredSegment, "index" | "kind" | "text">;

/**
 * A Sentence's Segments, or, for one with none (a Plain Sentence, or one
 * Analysis Stripping emptied), its text split at whitespace into words.
 */
function piecesOf(sentence: ExplainedSentence): readonly Piece[] {
	if (sentence.segments.length > 0)
		return [...sentence.segments].sort((a, b) => a.index - b.index);
	return sentence.stitchedText
		.split(/(\s+)/)
		.filter((text) => text !== "")
		.map((text, index) => ({
			index,
			kind: /^\s+$/.test(text)
				? ("Whitespace" as const)
				: ("ResolvableText" as const),
			text,
		}));
}

const isWord = (piece: Piece) => piece.kind === "ResolvableText";

/** One context Sentence as the passage takes it: whole, or its last pieces only. */
type ContextPart = {
	readonly sentence: ExplainedSentence;
	readonly pieces: readonly Piece[];
	readonly cut: boolean;
};

/**
 * The context before the pronoun's Sentence, in reading order. The rule:
 * walk back from the Sentence just before it, one Sentence at a time, at
 * most `CONTEXT_MAX_SENTENCES` (3) Sentences and at most
 * `CONTEXT_MAX_WORDS` (50) words. A Sentence that fits in the words left
 * is taken whole. The first one that does not is taken as its last words
 * that still fit (none when no word is left), its start cut off, and the
 * walk ends there. A word is a ResolvableText Segment, or a
 * whitespace-separated word of a Sentence with no Segments. So a pronoun
 * after a short Sentence reads three Sentences back, and one after a long
 * Sentence reads that Sentence's last 50 words.
 *
 * `preceding` are the Sentences before the pronoun's, nearest first.
 */
export function precedingContext(
	preceding: readonly ExplainedSentence[],
): readonly ContextPart[] {
	const parts: ContextPart[] = [];
	let wordsLeft = CONTEXT_MAX_WORDS;
	for (const sentence of preceding.slice(0, CONTEXT_MAX_SENTENCES)) {
		const pieces = piecesOf(sentence);
		const words = pieces.filter(isWord).length;
		if (words <= wordsLeft) {
			parts.push({ sentence, pieces, cut: false });
			wordsLeft -= words;
			continue;
		}
		if (wordsLeft > 0) {
			// From the first of its last `wordsLeft` words to its end.
			let seen = 0;
			let from = pieces.length;
			while (from > 0 && seen < wordsLeft) {
				from -= 1;
				if (isWord(pieces[from] as Piece)) seen += 1;
			}
			parts.push({ sentence, pieces: pieces.slice(from), cut: true });
		}
		break;
	}
	return parts.reverse();
}

/** The noun units wholly inside `pieces`, by their Segments. */
function candidatesIn(
	units: readonly StoredUnit[] | undefined,
	pieces: readonly Piece[],
): (readonly number[])[] {
	const kept = new Set(pieces.map(({ index }) => index));
	return (units ?? [])
		.filter(isAntecedentCandidate)
		.filter(({ segments }) => segments.every((index) => kept.has(index)))
		.map(({ segments }) => [...segments]);
}

function passageSentence(part: ContextPart): PassageSentence {
	return {
		segments: part.pieces.map(({ index, text }) => ({ index, text })),
		candidates: candidatesIn(part.sentence.units, part.pieces),
		...(part.cut ? { cut: true as const } : {}),
	};
}

/**
 * What `explain.pronoun` is asked for one pronoun: the context before its
 * Sentence (`precedingContext`), then the Sentence whole, with every noun
 * unit marked; and each passage Sentence's id, by position, to read the
 * answer back with.
 */
export function explanationRequest({
	sentence,
	pronoun,
	preceding,
}: {
	readonly sentence: ExplainedSentence;
	readonly pronoun: readonly number[];
	/** The Sentences before it in its Scroll, nearest first. */
	readonly preceding: readonly ExplainedSentence[];
}): {
	readonly input: ExplainPronounInput;
	readonly sentenceIds: readonly string[];
} {
	const parts = [
		...precedingContext(preceding),
		{ sentence, pieces: piecesOf(sentence), cut: false },
	];
	return {
		input: {
			language: "de",
			passage: parts.map(passageSentence),
			pronoun: [...pronoun],
		},
		sentenceIds: parts.map((part) => part.sentence.sentenceId),
	};
}
