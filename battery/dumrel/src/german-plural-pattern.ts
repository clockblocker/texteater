import type { PluralPattern } from "./generated/types.js";

const UMLAUT: Readonly<Record<string, string>> = { a: "ä", o: "ö", u: "ü" };

/**
 * The singular with one stem vowel umlauted, once per vowel it could be:
 * `mutter` → `mütter`, `haus` → `häus`, `saal` → `säl`. Comparing each with
 * the plural finds the umlaut wherever it falls.
 */
function umlautings(singular: string): string[] {
	const results: string[] = [];
	for (const [index, letter] of [...singular].entries()) {
		const umlaut = UMLAUT[letter];
		if (!umlaut) continue;
		const doubled = singular[index + 1] === letter && letter !== "u";
		results.push(
			singular.slice(0, index) +
				umlaut +
				singular.slice(index + (doubled ? 2 : 1)),
		);
	}
	return results;
}

/** Endings a foreign singular drops before `-en`: `Pizza` → `Pizzen`, `Museum` → `Museen`. */
const FOREIGN_ENDINGS = ["a", "o", "um", "us", "on", "is"] as const;

/**
 * The Plural Pattern that turns a German noun's nominative singular into this
 * nominative plural (#597). Both are compared without case. `-n` and `-en` are
 * one pattern, as are the doubled consonant of `Kenntnisse` and `Lehrerinnen`
 * and a foreign ending replaced by `-en`. A plural no pattern derives is
 * `Other`: `Visa`, `Kommata`.
 */
export function germanPluralPattern(
	singular: string,
	plural: string,
): PluralPattern {
	const base = singular.toLocaleLowerCase("de");
	const form = plural.toLocaleLowerCase("de");
	if (form === base) return "NoEnding";
	const stems = /(in|s)$/.test(base) ? [base, base + base.at(-1)] : [base];
	for (const stem of stems) {
		if (form === `${stem}e`) return "E";
		if (form === `${stem}n` || form === `${stem}en`) return "En";
	}
	if (form === `${base}er`) return "Er";
	if (form === `${base}s`) return "S";
	for (const ending of FOREIGN_ENDINGS)
		if (
			base.endsWith(ending) &&
			base.length > ending.length &&
			form === `${base.slice(0, -ending.length)}en`
		)
			return "En";
	for (const umlauted of umlautings(base)) {
		if (form === umlauted) return "UmlautOnly";
		if (form === `${umlauted}e`) return "UmlautE";
		if (form === `${umlauted}er`) return "UmlautEr";
	}
	return "Other";
}
