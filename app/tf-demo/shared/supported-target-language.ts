import type * as Dumling from "dumling/types";

/**
 * Every language a Text may name when it is submitted and stored. Only a
 * Supported Target Language is also resolved and has Notes.
 */
export const TEXT_LANGUAGE_VALUES = [
	"de",
	"en",
	"he",
] as const satisfies readonly Dumling.Language[];

export type TextLanguage = (typeof TEXT_LANGUAGE_VALUES)[number];

const SUPPORTED_TARGET_LANGUAGE_VALUES = [
	"de",
] as const satisfies readonly TextLanguage[];

export type SupportedTargetLanguage =
	(typeof SUPPORTED_TARGET_LANGUAGE_VALUES)[number];

/**
 * The target language of every Text for now: intake turns away a Text
 * that names another. A Sentence detected in any other language, or in
 * none, is a Plain Sentence (map #1175).
 */
const TEXT_TARGET_LANGUAGE = "de" satisfies SupportedTargetLanguage;

/** Whether a Sentence with this Detected Language is shown but not clickable. */
export function isPlainSentence(language: string | undefined): boolean {
	return language !== TEXT_TARGET_LANGUAGE;
}
