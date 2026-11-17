/**
 * The noun phrase a word opens, read from the words alone: where an
 * article or a preposition's phrase can still reach, and its Head.
 *
 * Clauses are cut at every punctuation mark (`sentence.ts`), but two marks
 * stand inside a noun phrase: the comma between coordinated attributive
 * adjectives (im rohen, geschälten und kalten Zustand) and an ordinal's
 * full stop (am 1. Mai). The Head owns the article across both
 * (de/noun-owns-its-article: "across adjectives, numerals and extended
 * attributes").
 */
import type { Segment } from "../segmented-sentence.js";
import { fusedSiblings, isArticle, nounLike } from "./candidates.js";
import type { GermanInventory } from "./inventory.js";
import type { Piece, Sentence } from "./sentence.js";

/** An adjective's ending: an inflected attributive adjective, determiner or participle ends so. */
export const adjectiveEnding = /(e|er|en|es|em)$/u;

/** A lowercase word with an adjective's ending: an inflected attributive word. */
const attributive = (piece: Piece) =>
	/^\p{Ll}/u.test(piece.text) && adjectiveEnding.test(piece.text);

/** The Segments between two pieces that are not whitespace. */
const marksBetween = (
	segments: readonly Segment[],
	before: Piece,
	after: Piece,
) =>
	segments
		.slice(before.segment + 1, after.segment)
		.filter((segment) => segment.kind !== "Whitespace");

/**
 * Whether only a noun phrase's own punctuation stands between two
 * neighbouring pieces: a comma between two attributive words, or the full
 * stop of an ordinal written in digits.
 */
function attributeGap(
	segments: readonly Segment[],
	before: Piece,
	after: Piece,
): boolean {
	const [mark, ...more] = marksBetween(segments, before, after);
	if (!mark || more.length > 0) return false;
	if (mark.text === ".") return /^\p{N}+$/u.test(before.text);
	if (mark.text === ",") return attributive(before) && attributive(after);
	return false;
}

/**
 * The pieces after `opener` its phrase can still reach, at most `reach`
 * of them: those of its clause, also past a noun phrase's own punctuation.
 */
export function phraseWindow(
	sentence: Sentence,
	opener: Piece,
	reach: number,
): Piece[] {
	const window: Piece[] = [];
	let previous = opener;
	for (const piece of sentence.pieces.slice(opener.id)) {
		if (piece.id > opener.id + reach) break;
		if (
			piece.clause !== previous.clause &&
			!attributeGap(sentence.segments, previous, piece)
		)
			break;
		window.push(piece);
		previous = piece;
	}
	return window;
}

/**
 * The noun a preposition's own phrase leads to, when only articles,
 * numbers and inflected attributive words stand between: mit dem Prinzip,
 * in der Nähe, nach jedem viertel Satz. That noun is the preposition's
 * complement, so it never governs the preposition
 * (de/governed-preposition-joins-its-governor: a word selects a
 * preposition for its complement). Undefined when anything else stands
 * first (auf ihn ist kein Verlass), so a noun past a pronoun may still be
 * a governor.
 */
function prepositionObject(
	sentence: Sentence,
	preposition: Piece,
): Piece | undefined {
	for (const piece of phraseWindow(sentence, preposition, 6)) {
		if (nounLike(piece)) return piece;
		if (
			!isArticle(piece) &&
			!/^\p{N}+$/u.test(piece.text) &&
			!attributive(piece)
		)
			return undefined;
	}
	return undefined;
}

/**
 * A preposition slot's answer as code reads it: the share of the noun its
 * own phrase leads to counts as none, since that noun is its complement,
 * never its governor. Any other slot's answer as given.
 */
export function governorShares(
	sentence: Sentence,
	slot: { readonly kind: string; readonly piece: Piece },
	probabilities: Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
	if (slot.kind !== "preposition") return probabilities;
	const object = prepositionObject(sentence, slot.piece);
	const key = object ? `p${object.id}` : undefined;
	const share = key ? probabilities[key] : undefined;
	if (key === undefined || share === undefined) return probabilities;
	const { [key]: _object, ...rest } = probabilities;
	return { ...rest, none: (probabilities.none ?? 0) + share };
}

/**
 * The preposition pieces of fused words, the zu of zum and the i of im:
 * pieces that share their written word with an article piece. Each is a
 * preposition whatever else its spelling may be (de/fused-word-pieces).
 */
export function fusedPrepositions(sentence: Sentence): ReadonlySet<number> {
	const siblings = fusedSiblings(sentence);
	const fusedArticle = (id: number) => {
		const piece = sentence.pieces[id - 1];
		return (
			piece !== undefined &&
			piece.surface !== piece.text &&
			isArticle(piece)
		);
	};
	return new Set(
		sentence.pieces
			.filter(
				(piece) =>
					!fusedArticle(piece.id) &&
					(siblings.get(piece.id) ?? []).some(fusedArticle),
			)
			.map((piece) => piece.id),
	);
}

/** Whether the piece right after `piece`, with only whitespace between, may open its phrase: an article, a pronoun or determiner, a noun or a number. */
export function opensPhrase(
	sentence: Sentence,
	inventory: Pick<GermanInventory, "identityCandidates">,
	piece: Piece,
): boolean {
	const { pieces, segments } = sentence;
	const next = pieces[piece.id];
	if (
		!next ||
		next.clause !== piece.clause ||
		!segments
			.slice(piece.segment + 1, next.segment)
			.every((segment) => segment.kind === "Whitespace")
	)
		return false;
	return (
		isArticle(next) ||
		nounLike(next) ||
		/^\p{N}/u.test(next.text) ||
		inventory.identityCandidates(next.word).length > 0
	);
}
