import { foldCase, lemmaIdentityKey, readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

/** Orders Lemmas by Dumling's case-folded identity key (system ADR 0002). */
export function compareLemmas(
	left: Dumling.Lemma,
	right: Dumling.Lemma,
): number {
	const a = lemmaIdentityKey(left),
		b = lemmaIdentityKey(right);
	return a < b ? -1 : a > b ? 1 : 0;
}
/** Whether two Readings are one Reading, by Dumling's `readingIdentityKey`. */
export function sameReading(
	left: Dumling.Reading,
	right: Dumling.Reading,
): boolean {
	return readingIdentityKey(left) === readingIdentityKey(right);
}
/**
 * Whether two Canonical Forms in one language spell one Lemma's form, compared
 * without letter case as Lemma identity compares them (system ADR 0002).
 */
function sameCanonicalForm(
	left: string,
	right: string,
	language: Dumling.Language,
): boolean {
	return foldCase(left, language) === foldCase(right, language);
}
/**
 * Whether a Unit Shadow describes this Lemma: the same language, Family and
 * Kind, and the same Canonical Form without letter case. A Shadow carries no
 * Core Features, so it can describe several Lemmas.
 */
export function shadowMatchesLemma(
	shadow: Dumrel.UnitShadow,
	lemma: Dumling.Lemma,
): boolean {
	return (
		shadow.language === lemma.language &&
		shadow.family === lemma.family &&
		shadow.kind === lemma.kind &&
		sameCanonicalForm(
			shadow.canonicalForm,
			lemma.canonicalForm,
			lemma.language,
		)
	);
}
export function readingLemma<L extends Dumling.Language>(
	reading: Dumling.Reading<L>,
): Dumling.Lemma<L> {
	return reading.lemma as Dumling.Lemma<L>;
}
