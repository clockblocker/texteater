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
