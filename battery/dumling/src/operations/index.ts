import type { SupportedLanguage } from "../types/public-types.js";
import type { DumlingApi, LanguageApi } from "./api-shape.js";
import { buildLanguageApi } from "./language-api.js";
import { supportedLanguages } from "./shared/language-inventory.js";

export const dumling = {
	de: buildLanguageApi("de"),
	en: buildLanguageApi("en"),
	he: buildLanguageApi("he"),
} satisfies DumlingApi;

function getLanguageApi<L extends SupportedLanguage>(
	language: L,
): LanguageApi<L> {
	return dumling[language] as unknown as LanguageApi<L>;
}

export { getLanguageApi, supportedLanguages };
