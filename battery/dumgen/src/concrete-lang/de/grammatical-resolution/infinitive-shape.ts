/**
 * Whether text has the shape of a German VERB Canonical Form: an optional
 * `sich ` plus one lowercase word of at least four letters ending in -en, -ln
 * or -rn, or `sein`/`tun`. Finite and imperative forms (`erholt sich`, `Lauf`)
 * fail; every reviewed VERB Canonical Form passes.
 */
export function infinitiveShaped(text: string): boolean {
	const word = text.startsWith("sich ") ? text.slice("sich ".length) : text;
	if (word === "sein" || word === "tun") return true;
	return word.length >= 4 && /^[a-zäöüß]+(en|ln|rn)$/u.test(word);
}
