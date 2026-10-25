import type * as Dumling from "dumling/types";

/**
 * The wording a Reading's Breakdown spells (ADR 0050): its Lemma's
 * Canonical Form, less the reflexive a lexically reflexive Lexeme cites
 * first. The reflexive is a satellite, read from the Lemma's
 * `lexicallyReflexive` (ADR 0029), and never a piece, so `sich
 * anschließen` breaks down as the word `anschließen` (`an- + schließen`)
 * and `sich erinnern` as `erinnern` (`er · inner · n`). A phraseme keeps
 * its whole wording, its `sich` included (`sich wie zu Hause fühlen`).
 */
export function breakdownWording(
	lemma: Pick<Dumling.Lemma, "family" | "canonicalForm" | "coreFeatures">,
): string {
	const core: Readonly<Record<string, unknown>> = lemma.coreFeatures;
	if (lemma.family !== "Lexeme" || (core.lexicallyReflexive ?? null) === null)
		return lemma.canonicalForm;
	const word = /^\S+\s+(\S.*)$/u.exec(lemma.canonicalForm)?.[1];
	return word ?? lemma.canonicalForm;
}
