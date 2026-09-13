import emojiRegex from "emoji-regex";

/** Shared by Zod authoring and compiled validation operations. */
export function hasMarkedFeature(bag: Record<string, unknown>): boolean {
	return Object.values(bag).some((value) => value !== null);
}
export function nonEmptyFeatureBagError(): string {
	return "Feature Bag must contain a marked feature";
}
export function normalizeForm(value: string): string {
	return value.trim().normalize("NFC");
}
const emojiPattern = new RegExp(`^(?:${emojiRegex().source})$`);
const modifierPattern = /^\p{Emoji_Modifier}$/u;
let segmenter: Intl.Segmenter | undefined;
export function isEmojiDescription(value: string): boolean {
	segmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" });
	const segments = [...segmenter.segment(value)];
	return (
		segments.length >= 1 &&
		segments.length <= 4 &&
		segments.every(
			({ segment }) =>
				emojiPattern.test(segment) && !modifierPattern.test(segment),
		)
	);
}
export function emojiDescriptionError(): string {
	return "Emoji Description must contain one to four emoji graphemes";
}

/** Null records no marked distinction; it never substitutes for a known gender. */
export function isGermanPronounCore(core: Record<string, unknown>): boolean {
	const possessive = core.poss === "Yes";
	if (
		core["gender[psor]"] !== null &&
		(!possessive ||
			core.pronType !== "Prs" ||
			core.person !== "3" ||
			core.referenceNumber !== "Sing")
	)
		return false;
	if (core.gender !== null && core.number === "Plur") return false;
	if (
		!possessive &&
		core.pronType === "Prs" &&
		core.gender !== null &&
		(core.person !== "3" || core.referenceNumber !== "Sing")
	)
		return false;
	return true;
}
export function germanPronounCoreError(): string {
	return "German pronoun gender must agree with its subtype, person and number; possessor gender requires a third-person singular personal possessive";
}
