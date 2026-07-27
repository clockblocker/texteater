import type {
	LanguageLemmaUnionMap,
	LanguageSelectionUnionMap,
	LanguageSurfaceUnionMap,
} from "../types/concrete-language/concrete-language-types";
import type { ConcreteLanguage } from "../types/concrete-language/features/feature-registry";
import type { LanguageTypePack } from "./contracts";

type ConcreteLanguageTypePack<L extends ConcreteLanguage> =
	LanguageTypePack<L> & {
		lemma: LanguageLemmaUnionMap[L];
		selection: LanguageSelectionUnionMap[L];
		surface: LanguageSurfaceUnionMap[L];
	};

export type LanguageTypePackMap = {
	[L in ConcreteLanguage]: ConcreteLanguageTypePack<L>;
};
