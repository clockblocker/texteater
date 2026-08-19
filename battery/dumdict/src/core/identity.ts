import { readingFingerprint } from "dumling";
import type { Reading, SupportedLanguage } from "../dumling";

type LemmaLike = {
	canonicalForm: string;
	coreFeatures: object;
	family: string;
	kind: string;
	language: SupportedLanguage;
};

function stableValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(stableValue);
	}
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, member]) => [key, stableValue(member)]),
		);
	}
	return value;
}

export function lemmaFingerprint(lemma: LemmaLike): string {
	return JSON.stringify(stableValue(lemma));
}

export function compareLemmas(left: LemmaLike, right: LemmaLike): number {
	const leftKey = lemmaFingerprint(left);
	const rightKey = lemmaFingerprint(right);
	return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

export function sameLemma(left: LemmaLike, right: LemmaLike): boolean {
	return lemmaFingerprint(left) === lemmaFingerprint(right);
}

export function sameReading<L extends SupportedLanguage>(
	left: Reading<L>,
	right: Reading<L>,
): boolean {
	return readingFingerprint(left) === readingFingerprint(right);
}
