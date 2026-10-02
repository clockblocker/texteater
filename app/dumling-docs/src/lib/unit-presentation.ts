import type * as Dumling from "dumling/types";

export function describeLemma(lemma: Dumling.Lemma): string {
	return [
		lemma.canonicalForm,
		lemma.language,
		lemma.family,
		lemma.kind,
		JSON.stringify(lemma.coreFeatures),
	].join(" · ");
}

/**
 * A Surface's spelling as one label per tag, so a Variant tagged Licensed and
 * Regional counts as `Variant (Licensed)` and as `Variant (Regional)`.
 */
export function spellingTagLabels(
	spelling: Dumling.Surface["spelling"],
): string[] {
	return spelling.kind === "Variant"
		? spelling.variantTags.map((tag) => `Variant (${tag})`)
		: [spelling.kind];
}
