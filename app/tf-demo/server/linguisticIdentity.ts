import type { Lemma, SupportedLanguage } from "dumling";

function stableValue(value: unknown): unknown {
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

/** Returns tf-demo's stable database key for a canonical Lemma value. */
export function lemmaIdentityKey<L extends SupportedLanguage>(
	lemma: Lemma<L>,
): string;
export function lemmaIdentityKey(lemma: unknown): string;
export function lemmaIdentityKey(lemma: unknown): string {
	return JSON.stringify(stableValue(lemma));
}
