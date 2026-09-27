import type { Surface } from "../types.js";

// A word is letters, marks and digits, joined inside by an apostrophe, a
// hyphen or a Hebrew geresh or gershayim (geht's, Wer-A, צה״ל).
const word = /[\p{L}\p{M}\p{N}]+(?:['’׳״-][\p{L}\p{M}\p{N}]+)*/gu;

function words(value: string): string {
	return (value.match(word) ?? []).join(" ");
}

/**
 * Whether a Surface spells its Lemma's Canonical Form. A Saying keeps its
 * internal punctuation, so only its words count (ADR 0039): `Wer rastet, der
 * rostet!` spells `Wer rastet, der rostet`. Every other route compares the
 * whole spelling.
 */
export function spellsCanonicalForm(surface: Surface): boolean {
	const { canonicalForm, family } = surface.lemma;
	return family === "Saying"
		? words(surface.normalizedSurface) === words(canonicalForm)
		: surface.normalizedSurface === canonicalForm;
}
