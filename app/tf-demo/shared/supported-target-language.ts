import type * as Dumling from "dumling/types";

/**
 * Every language a Scroll may name when it is submitted and stored. Only a
 * Supported Target Language is also resolved and has Notes.
 */
export const SCROLL_LANGUAGE_VALUES = [
	"de",
	"en",
	"he",
] as const satisfies readonly Dumling.Language[];

export type ScrollLanguage = (typeof SCROLL_LANGUAGE_VALUES)[number];

const SUPPORTED_TARGET_LANGUAGE_VALUES = [
	"de",
] as const satisfies readonly ScrollLanguage[];

export type SupportedTargetLanguage =
	(typeof SUPPORTED_TARGET_LANGUAGE_VALUES)[number];

/**
 * The target language of every Scroll for now: intake turns away a Scroll
 * that names another. A Sentence detected in any other language, or in
 * none, is a Plain Sentence (map #1175).
 */
const SCROLL_TARGET_LANGUAGE = "de" satisfies SupportedTargetLanguage;

/** Whether a Sentence with this Detected Language is shown but not clickable. */
export function isPlainSentence(language: string | undefined): boolean {
	return language !== SCROLL_TARGET_LANGUAGE;
}
