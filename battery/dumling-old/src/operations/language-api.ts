import type { SupportedLanguage } from "../types/public-types.js";
import type { LanguageApi } from "./api-shape.js";
import { buildLanguageApiFromParseOperations } from "./shared/language-api.js";
import { buildParseOperations } from "./shared/parse/parse.js";

export function buildLanguageApi<L extends SupportedLanguage>(
	language: L,
): LanguageApi<L> {
	return buildLanguageApiFromParseOperations(
		language,
		buildParseOperations(language),
	);
}
