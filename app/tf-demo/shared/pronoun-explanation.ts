/**
 * What the reader and the server agree on about a Pronoun Explanation:
 * which stored units are pronouns to explain, which are the nouns an
 * explanation may name, and the key one explanation is stored under.
 */

/** A stored unit as far as an explanation reads it: its Segments and route. */
type RoutedUnit = {
	readonly segments: readonly number[];
	readonly route: "Unresolved" | { readonly kind: string };
};

/** Whether intake routed the unit as a pronoun (PRON), so the explainer explains it. */
export function isPronounUnit(unit: RoutedUnit | undefined): boolean {
	return unit !== undefined && unit.route !== "Unresolved"
		? unit.route.kind === "PRON"
		: false;
}

/** Whether the unit is a noun or proper noun, which an explanation may name as an Antecedent. */
export function isAntecedentCandidate(unit: RoutedUnit): boolean {
	return (
		unit.route !== "Unresolved" &&
		(unit.route.kind === "NOUN" || unit.route.kind === "PROPN")
	);
}

/**
 * A unit's key in its Sentence, its Segments in order (`"4"`, `"4,6"`): a
 * pronoun's explanation is stored under it.
 */
export function unitKey(segments: readonly number[]): string {
	return [...segments].sort((left, right) => left - right).join(",");
}
