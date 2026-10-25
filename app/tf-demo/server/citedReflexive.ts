import { germanAdpositionEntry } from "dumcorpus/inventories";

/**
 * A wording that cites a German lexical reflexive, as a learner types it or
 * a sentence spells it before its verb, normalized for lookup (ADR 0052):
 * its `sich` is removed wherever a Citation puts it, so the wording finds
 * its Lemma like any other. That is first (`sich erinnern`), right after a
 * leading `es` (`es sich gemütlich machen`), or right after a preposition
 * with words still to follow (`außer sich sein`, `zu sich kommen`). A
 * wording that is only that `sich`, or cites none (`an sich`, `erinnert
 * sich`), is returned as it is.
 */
export function withoutCitedReflexive(wording: string): string {
	const words = wording.trim().split(/\s+/u);
	const at = citedReflexiveIndex(words);
	return at === null ? wording : words.toSpliced(at, 1).join(" ");
}

function citedReflexiveIndex(words: readonly string[]): number | null {
	const leading = isWord(words[0], "es") ? 1 : 0;
	if (isWord(words[leading], "sich"))
		return words.length > leading + 1 ? leading : null;
	const after = words.findIndex(
		(word, index) =>
			index > 0 &&
			index < words.length - 1 &&
			isWord(word, "sich") &&
			isPreposition(words[index - 1] ?? ""),
	);
	return after < 0 ? null : after;
}

const isWord = (word: string | undefined, expected: string) =>
	word?.toLocaleLowerCase("de") === expected;

const isPreposition = (word: string) =>
	germanAdpositionEntry({
		family: "Lexeme",
		canonicalForm: word.toLocaleLowerCase("de"),
	}) !== null;
