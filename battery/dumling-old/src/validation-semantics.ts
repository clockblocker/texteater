import emojiRegex from "emoji-regex";

const MAX_EMOJI_GRAPHEMES = 4;
const emojiPatternSource = emojiRegex().source;
export const compactEmojiSequencePattern = new RegExp(
	`^(?:${emojiPatternSource}){1,${MAX_EMOJI_GRAPHEMES}}$`,
);
const singleEmojiPattern = new RegExp(`^(?:${emojiPatternSource})$`);
const standaloneEmojiModifierPattern = /^\p{Emoji_Modifier}$/u;
const graphemeSegmenter = new Intl.Segmenter(undefined, {
	granularity: "grapheme",
});

export function normalizeNfc(value: string): string {
	return value.normalize("NFC");
}

export function trimString(value: string): string {
	return value.trim();
}

export function normalizeReadingLemma(value: unknown): unknown {
	if (value === null || typeof value !== "object") return value;
	const canonicalForm = Reflect.get(value, "canonicalForm");
	if (typeof canonicalForm !== "string") return value;
	return {
		...value,
		canonicalForm: canonicalForm.trim().normalize("NFC"),
	};
}

export function hasMarkedSurfaceFeature(value: object): boolean {
	return Object.values(value).some((feature) => feature !== null);
}

export function surfaceFeaturesNonEmptyError(): string {
	return "Feature bag must contain at least one marked value";
}

export function hasMarkedInflectionFeature(value: object): boolean {
	return Object.values(value).some((feature) => feature !== null);
}

export function inflectionalFeaturesNonEmptyError(): string {
	return "inflectionalFeatures must not be empty";
}

export function hasDistinctPair(value: readonly unknown[]): boolean {
	const [first, second] = value;
	return first !== second;
}

export function hasGermanVerbInflectionSignal(value: {
	number: unknown;
	tense: unknown;
	voice: unknown;
}): boolean {
	return (
		value.number !== null || value.tense !== null || value.voice !== null
	);
}

export function isCompactEmojiSequence(value: string): boolean {
	const graphemes = [...graphemeSegmenter.segment(value)];
	return (
		graphemes.length <= MAX_EMOJI_GRAPHEMES &&
		graphemes.every(
			({ segment }) =>
				singleEmojiPattern.test(segment) &&
				!standaloneEmojiModifierPattern.test(segment),
		)
	);
}
