import type { Reading } from "../dto";
import type { SupportedLanguage } from "../dumling";

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

export function lemmaKey(lemma: LemmaLike): string {
	return JSON.stringify(stableValue(lemma));
}

export function readingKey<L extends SupportedLanguage>(
	reading: Reading<L>,
): string {
	return JSON.stringify([
		stableValue(reading.lemma),
		reading.emojiDescription.normalize("NFC"),
	]);
}

export function sameLemma(left: LemmaLike, right: LemmaLike): boolean {
	return lemmaKey(left) === lemmaKey(right);
}

export function sameReading<L extends SupportedLanguage>(
	left: Reading<L>,
	right: Reading<L>,
): boolean {
	return readingKey(left) === readingKey(right);
}
