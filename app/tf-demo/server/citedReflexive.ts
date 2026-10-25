/**
 * A wording that cites a German lexical reflexive, as a learner types it or
 * a sentence spells it before its verb (`sich erinnern`, `es sich gemütlich
 * machen`), normalized for lookup (ADR 0052): the `sich` that comes first,
 * or right after a leading `es`, is removed, so the wording finds its Lemma
 * (`erinnern`, `es gemütlich machen`) like any other. A wording that is
 * only that `sich`, or cites none, is returned as it is.
 */
export function withoutCitedReflexive(wording: string): string {
	const words = wording.trim().split(/\s+/u);
	const at = isWord(words[0], "es") ? 1 : 0;
	if (!isWord(words[at], "sich") || words.length <= at + 1) return wording;
	return words.toSpliced(at, 1).join(" ");
}

const isWord = (word: string | undefined, expected: string) =>
	word?.toLocaleLowerCase("de") === expected;
