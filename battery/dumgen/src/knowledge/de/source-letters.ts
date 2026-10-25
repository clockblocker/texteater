/**
 * The letter checks on a base Luna wrote for a German word's Source (system
 * ADR 0050), by the formation jev judged. They only refuse what the letters
 * rule out; whether the base is right is jev's confirmation.
 *
 * - A conversion turns a word of another Kind whole into this one: `Lauf`
 *   from `laufen`, `Wurf` from `werfen`, `fischen` from `Fisch`. Its stem
 *   starts as the base's does, and neither is the other with an affix from
 *   the closed inventory added, which would be an affixal derivation with
 *   Constituents (`Entspannung` = `entspannen + -ung`).
 * - A clipping or acronym keeps its base's Kind and is shorter, its letters
 *   found in the base in order, from its first letter (`Uni`, `Kita`,
 *   `Lkw`) or at its end (`Bus` from `Omnibus`).
 */
import { germanPrefixes, germanSuffixes } from "dumcorpus/inventories";
import { foldCase } from "dumling";

/** A word as the checks compare it: case and umlauts aside, letters only. */
const plain = (word: string) =>
	foldCase(word, "de")
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.replace(/ß/gu, "ss")
		.replace(/[^\p{L}]/gu, "");

/** A form's stem: a verb without its citation ending. */
function stemOf(form: string, kind: string): string {
	const word = plain(form);
	if (kind !== "VERB") return word;
	if (/(?:el|er)n$/u.test(word)) return word.slice(0, -1);
	return word.endsWith("en") ? word.slice(0, -2) : word;
}

const affixed = (longer: string, shorter: string) =>
	germanSuffixes.some(({ spelled }) => longer === shorter + plain(spelled)) ||
	germanPrefixes.some(({ spelled }) => longer === plain(spelled) + shorter);

/** Whether `word` of Kind `kind` can be a conversion of `base`. */
export function isConversionOf(
	word: string,
	kind: string,
	base: { readonly canonicalForm: string; readonly kind: string },
): boolean {
	if (base.kind === kind) return false;
	const stem = stemOf(word, kind);
	const baseStem = stemOf(base.canonicalForm, base.kind);
	return (
		stem.length >= 2 &&
		baseStem.length >= 2 &&
		stem[0] === baseStem[0] &&
		!affixed(stem, baseStem) &&
		!affixed(baseStem, stem)
	);
}

/** Whether `letters` occur in `text` in order, gaps allowed. */
function inOrder(letters: string, text: string): boolean {
	let at = 0;
	for (const letter of letters) {
		at = text.indexOf(letter, at);
		if (at < 0) return false;
		at++;
	}
	return true;
}

/** Whether `word` of Kind `kind` can be a clipping or an acronym of `base`. */
export function isShorteningOf(
	word: string,
	kind: string,
	base: { readonly canonicalForm: string; readonly kind: string },
): boolean {
	if (base.kind !== kind) return false;
	const short = plain(word);
	const long = plain(base.canonicalForm);
	return (
		short.length >= 2 &&
		short.length < long.length &&
		((short[0] === long[0] && inOrder(short, long)) || long.endsWith(short))
	);
}
