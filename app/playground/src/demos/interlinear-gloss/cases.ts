import { hard } from "./hard-case";
import type { GlossCase } from "./model";
import { simple } from "./simple-case";

/** The two authored cases, the Locution first. */
export const cases: readonly GlossCase[] = [hard, simple];

/** The Cards a case deals, in order: the words, their Surface, its Lemma. */
export type CardKind = "attestation" | "surface" | "lemma";

/**
 * What a case with nothing to rearrange opens on: straight on the Surface
 * Card, or on a static Attestation Card that names only the case its
 * context sets.
 */
export type QuietAttestation = "skip" | "static";

/** The Card the popover opens on. */
export function firstCard(
	glossCase: GlossCase,
	quiet: QuietAttestation,
): CardKind {
	return glossCase.attestation.syntax || quiet === "static"
		? "attestation"
		: "surface";
}

/** The Card a Card's link leads to; none after the Lemma. */
export function nextCard(kind: CardKind): CardKind | null {
	if (kind === "attestation") return "surface";
	if (kind === "surface") return "lemma";
	return null;
}

/** A Card's title as text, for its crumb and its tail. */
export function titleOf(glossCase: GlossCase, kind: CardKind): string {
	if (kind === "attestation") return glossCase.attestation.title;
	if (kind === "surface") return glossCase.surface.title;
	return glossCase.lemma.title;
}
