import type {
	LanguageLemmaUnionMap,
	LanguageSelectionUnionMap,
	LanguageSurfaceUnionMap,
} from "../types/concrete-language/concrete-language-types.js";
import type { ConcreteLanguage } from "../types/concrete-language/features/feature-registry.js";
import type { LanguageTypePack } from "./contracts.js";

type ConcreteLanguageTypePack<L extends ConcreteLanguage> =
	LanguageTypePack<L> & {
		lemma: LanguageLemmaUnionMap[L];
		selection: LanguageSelectionUnionMap[L];
		surface: LanguageSurfaceUnionMap[L];
	};

export type LanguageTypePackMap = {
	[L in ConcreteLanguage]: ConcreteLanguageTypePack<L>;
};
