import { schemasFor } from "../schemas/public-schemas.js";
import type { SupportedLanguage } from "../types/public-types.js";
import type { DumlingApi, LanguageApi } from "./api-shape.js";
import { buildLanguageApi } from "./language-api.js";
import { supportedLanguages } from "./shared/language-inventory.js";

export const dumling = {
	de: buildLanguageApi("de", schemasFor.de),
	en: buildLanguageApi("en", schemasFor.en),
	he: buildLanguageApi("he", schemasFor.he),
} satisfies DumlingApi;

function getLanguageApi<L extends SupportedLanguage>(
	language: L,
): LanguageApi<L> {
	return dumling[language] as unknown as LanguageApi<L>;
}

export { getLanguageApi, supportedLanguages };
