import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";

function stableValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(stableValue);
	if (value !== null && typeof value === "object")
		return Object.fromEntries(
			Object.entries(value)
				.filter(([, child]) => child !== undefined)
				.sort(([left], [right]) =>
					left < right ? -1 : left > right ? 1 : 0,
				)
				.map(([name, child]) => [name, stableValue(child)]),
		);
	return value;
}

/** Dictionary-scoped structural identity, derived after canonical normalization. */
export function unitFingerprint(unit: Dumling.Unit): string {
	const result = parseUnit(unit);
	if (!result.success) throw result.error;
	return JSON.stringify(stableValue(result.chain.value));
}
export function lemmaFingerprint(lemma: Dumling.Lemma): string {
	return unitFingerprint(lemma);
}
export function readingFingerprint(reading: Dumling.Reading): string {
	return unitFingerprint(reading);
}
export function compareLemmas(
	left: Dumling.Lemma,
	right: Dumling.Lemma,
): number {
	const a = lemmaFingerprint(left),
		b = lemmaFingerprint(right);
	return a < b ? -1 : a > b ? 1 : 0;
}
export function sameLemma(left: Dumling.Lemma, right: Dumling.Lemma): boolean {
	return lemmaFingerprint(left) === lemmaFingerprint(right);
}
export function sameReading(
	left: Dumling.Reading,
	right: Dumling.Reading,
): boolean {
	return readingFingerprint(left) === readingFingerprint(right);
}
export function readingLemma<L extends Dumling.Language>(
	reading: Dumling.Reading<L>,
): Dumling.Lemma<L> {
	return reading.lemma as Dumling.Lemma<L>;
}
