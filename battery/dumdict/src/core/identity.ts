import { canonicalFormKey, lemmaIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

/** Code-unit order, the same in every runtime, unlike `localeCompare`. */
export function compareCodeUnits(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Orders Lemmas by Dumling's case-folded identity key (system ADR 0002), so
 * the planner walks stored Lemmas in one deterministic order. Dumling compares
 * identity; this order is the planner's.
 */
export function compareLemmas(
	left: Dumling.Lemma,
	right: Dumling.Lemma,
): number {
	return compareCodeUnits(lemmaIdentityKey(left), lemmaIdentityKey(right));
}
/**
 * Whether a Unit Shadow describes this Lemma: the same language, Family and
 * Kind, and the same Canonical Form as Lemma identity compares it, normalized
 * and without letter case (system ADR 0002). A Shadow carries no Core
 * Features, so it can describe several Lemmas.
 */
export function shadowMatchesLemma(
	shadow: Dumrel.UnitShadow,
	lemma: Dumling.Lemma,
): boolean {
	return (
		shadow.language === lemma.language &&
		shadow.family === lemma.family &&
		shadow.kind === lemma.kind &&
		canonicalFormKey(shadow.canonicalForm, lemma.language) ===
			canonicalFormKey(lemma.canonicalForm, lemma.language)
	);
}
export function readingLemma<L extends Dumling.Language>(
	reading: Dumling.Reading<L>,
): Dumling.Lemma<L> {
	return reading.lemma;
}
export function lemmaLanguage<L extends Dumling.Language>(
	lemma: Dumling.Lemma<L>,
): L {
	// A generic L's Lemma is a union TypeScript can't reduce, so its language
	// reads as every Language; a Lemma<L> carries L.
	return lemma.language as L;
}
