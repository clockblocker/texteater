import type {
	Reading,
	ReadingFingerprint,
	SupportedLanguage,
} from "../types/public-types.js";

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

/**
 * Returns the stable identity fingerprint for a Reading.
 *
 * Compatibility guarantee: equivalent Lemma values with the same trimmed,
 * NFC-normalized emoji description produce the same fingerprint regardless of
 * object property order. The serialized fingerprint format will not change
 * without an explicit identity migration.
 */
export function readingFingerprint<L extends SupportedLanguage>(
	reading: Reading<L>,
): ReadingFingerprint {
	return JSON.stringify([
		stableValue(reading.lemma),
		reading.emojiDescription.trim().normalize("NFC"),
	]) as ReadingFingerprint;
}
