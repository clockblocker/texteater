import {
	buildLanguageApiFromParseOperations,
	supportedLanguages,
} from "dumling/id";
import type {
	CoreFeaturesFor,
	DumlingApi,
	EntityKind,
	LanguageApi,
	Lemma,
	LemmaFamilyFor,
	LemmaIdentity,
	LemmaKindFor,
	Reading,
	SupportedLanguage,
	Surface,
	SurfaceIdentity,
} from "dumling/types";
import { createLazyLanguageApiRecord } from "./lazy-language-api.js";
import { getDumdictCompatibilityParseOperations } from "./parsing/lightweight-parsers.js";

export {
	type DumlingIdInspection,
	inspectDumlingId,
	makeSurfaceId,
	type SurfaceId,
} from "./dumling-id.js";

export type {
	CoreFeaturesFor,
	DumlingApi,
	EntityKind,
	Lemma,
	LemmaFamilyFor,
	LemmaIdentity,
	LemmaKindFor,
	Reading,
	SupportedLanguage,
	Surface,
	SurfaceIdentity,
};

const languageApis = createLazyLanguageApiRecord<
	typeof supportedLanguages,
	DumlingApi
>(supportedLanguages, {
	de: () =>
		buildLanguageApiFromParseOperations(
			"de",
			getDumdictCompatibilityParseOperations("de"),
		),
	en: () =>
		buildLanguageApiFromParseOperations(
			"en",
			getDumdictCompatibilityParseOperations("en"),
		),
	he: () =>
		buildLanguageApiFromParseOperations(
			"he",
			getDumdictCompatibilityParseOperations("he"),
		),
});

export const dumling = languageApis.record;

export function getLanguageApi<L extends SupportedLanguage>(
	language: L,
): LanguageApi<L>;
export function getLanguageApi(language: SupportedLanguage): unknown {
	switch (language) {
		case "de":
			return languageApis.get("de");
		case "en":
			return languageApis.get("en");
		case "he":
			return languageApis.get("he");
	}
}

export { supportedLanguages };
