/**
 * Canonical JSON used for demo-owned compound identities.
 *
 * Lemma keys remain demo-owned. Reading fingerprints and Surface IDs are
 * provided by Dumling.
 */
export function stableValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(stableValue);
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, member]) => [key, stableValue(member)]),
		);
	}
	return value;
}

export function lemmaKeyFor(lemma: unknown): string {
	return JSON.stringify(stableValue(lemma));
}
