import { checkIfGrundform, parseUnit } from "dumling";
import type * as Dumling from "dumling/types";

function stable(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(stable);
	if (value !== null && typeof value === "object")
		return Object.fromEntries(
			Object.entries(value)
				.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
				.map(([key, child]) => [key, stable(child)]),
		);
	return value;
}

/** Deterministic docs-owned route identity after Dumling normalization. */
export function structuralIdentity(unit: Dumling.Unit): string {
	const parsed = parseUnit(unit);
	if (!parsed.success) throw parsed.error;
	return JSON.stringify(stable(parsed.chain.value));
}

export function describeLemma(lemma: Dumling.Lemma): string {
	return [
		lemma.canonicalForm,
		lemma.language,
		lemma.family,
		lemma.kind,
		JSON.stringify(lemma.coreFeatures),
	].join(" · ");
}

export function grundformLabel(surface: Dumling.Surface): string {
	const assessment = checkIfGrundform(surface);
	return assessment.success
		? assessment.value
			? "Grundform"
			: "Not Grundform"
		: "Undetermined";
}

/**
 * A Surface's spelling as one label: `Canonical`, or a Variant with its tags,
 * `Variant (Licensed, Regional)`.
 */
export function spellingLabel(spelling: Dumling.Surface["spelling"]): string {
	return spelling.kind === "Variant"
		? `Variant (${spelling.variantTags.join(", ")})`
		: spelling.kind;
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
