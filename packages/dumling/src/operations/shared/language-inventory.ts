import type { SupportedLanguage } from "../../types/public-types";

const supportedLanguageValues = [
	"de",
	"en",
	"he",
] as const satisfies readonly SupportedLanguage[];
const supportedLanguageSet = new Set<unknown>(supportedLanguageValues);

export const supportedLanguages = Object.freeze([
	...supportedLanguageValues,
]) as typeof supportedLanguageValues;

export function isSupportedLanguage(
	value: unknown,
): value is SupportedLanguage {
	return supportedLanguageSet.has(value);
}
