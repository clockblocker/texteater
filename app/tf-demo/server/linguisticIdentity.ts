import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";

function stableValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(stableValue);
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) =>
					left < right ? -1 : left > right ? 1 : 0,
				)
				.map(([key, member]) => [key, stableValue(member)]),
		);
	}
	return value;
}

/** Returns tf-demo's stable database key for a canonical Lemma value. */
export function lemmaIdentityKey<L extends Dumling.Language>(
	lemma: Dumling.Lemma<L>,
): string;
export function lemmaIdentityKey(lemma: unknown): string;
export function lemmaIdentityKey(lemma: unknown): string {
	const parsed = parseUnit(lemma);
	if (!parsed.success) throw parsed.error;
	if (parsed.chain.unitKind !== "Lemma") throw new Error("Expected a Lemma.");
	return JSON.stringify(stableValue(parsed.chain.value));
}

/** Dictionary Reading key includes the canonical unit tag and all Lemma features. */
export function readingIdentityKey(reading: Dumling.Reading): string {
	const parsed = parseUnit(reading);
	if (!parsed.success) throw parsed.error;
	if (parsed.chain.unitKind !== "Reading")
		throw new Error("Expected a Reading.");
	return JSON.stringify(stableValue(parsed.chain.value));
}
