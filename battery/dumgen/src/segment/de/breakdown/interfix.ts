/**
 * German's linking elements in a compound's Constituents (system ADR 0054):
 * a linking element is its own piece, an Interfix from the closed set, so
 * `Gästehaus` = `[[Gast|Gäst]] + [[-e-|e]] + [[Haus|haus]]`. Code finds it
 * once jev has named the first part's Canonical Form: the letters a part
 * shows past its form, or past its form without a final -e or a verb's
 * ending (`Hilf` + `s` of Hilfe, `Lieb` + `es`), are the Interfix when the
 * closed set holds them.
 */
import { germanInterfixes } from "dumcorpus/inventories";

const folded = (text: string) =>
	text.toLocaleLowerCase("de").normalize("NFD").replace(/\p{M}/gu, "");

/** The stems a form shows before a linking element: whole, without -e, without a verb's ending. */
function stemsOf(form: string): string[] {
	const stems = [form];
	if (form.endsWith("e")) stems.push(form.slice(0, -1));
	if (form.endsWith("en")) stems.push(form.slice(0, -2));
	else if (form.endsWith("n")) stems.push(form.slice(0, -1));
	return stems.filter((stem) => stem.length >= 2);
}

/**
 * `letters` split into the word part and its linking element, or undefined
 * when the letters spell the form, a truncation of it, or run past it by
 * something no Interfix spells.
 */
export function interfixOf(
	letters: string,
	canonicalForm: string,
):
	| {
			readonly word: string;
			readonly interfix: string;
			readonly canonicalForm: string;
	  }
	| undefined {
	const shown = folded(letters);
	const form = folded(canonicalForm);
	if (form.startsWith(shown)) return undefined;
	for (const stem of stemsOf(form)) {
		const rest = shown.slice(stem.length);
		if (
			shown.startsWith(stem) &&
			rest.length > 0 &&
			germanInterfixes.has(`-${rest}-`)
		)
			return {
				word: letters.slice(0, stem.length),
				interfix: letters.slice(stem.length),
				canonicalForm: `-${rest}-`,
			};
	}
	return undefined;
}
