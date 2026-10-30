import type { Translation } from "./generated/types.js";

/**
 * A Translation's text (ADR 0055): its pieces joined by a space, `have to do
 * with something`. Dedupe and matching compare this, never the pieces.
 */
export function translationText(translation: Translation): string {
	return translation.map(({ text }) => text).join(" ");
}
