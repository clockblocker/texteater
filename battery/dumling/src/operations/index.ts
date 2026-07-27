import { languagePacks } from "../language-packs/index.js";
import type { SupportedLanguage } from "../types/public-types.js";
import type { DumlingApi, LanguageApi } from "./api-shape.js";
import { buildConvertOperations } from "./shared/convert.js";
import { buildDescribeOperations } from "./shared/describe.js";
import { buildExtractOperations } from "./shared/extract.js";
import { buildIdOperations } from "./shared/id.js";
import { supportedLanguages } from "./shared/language-inventory.js";

function buildImplementedLanguageApi<L extends SupportedLanguage>(
	language: L,
	descriptor: {
		create: LanguageApi<L>["create"];
		parse: LanguageApi<L>["parse"];
	},
): LanguageApi<L> {
	return {
		create: descriptor.create,
		convert: buildConvertOperations(language, descriptor.parse),
		describe: buildDescribeOperations<L>(),
		extract: buildExtractOperations<L>(),
		id: buildIdOperations(language, descriptor.parse),
		parse: descriptor.parse,
	};
}

export const dumling = {
	de: buildImplementedLanguageApi("de", languagePacks.de),
	en: buildImplementedLanguageApi("en", languagePacks.en),
	he: buildImplementedLanguageApi("he", languagePacks.he),
} satisfies DumlingApi;

function getLanguageApi<L extends SupportedLanguage>(
	language: L,
): LanguageApi<L> {
	return dumling[language] as unknown as LanguageApi<L>;
}

export { getLanguageApi, supportedLanguages };
