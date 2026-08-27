import type { AbstractFeatureName } from "../../types/abstract/features/features-catalog.js";

/** Compact Zod-free runtime inventory used by presentation DTO adapters. */
export const presentedFeatureNames = [
	"abbr",
	"adpType",
	"animacy",
	"aspect",
	"case",
	"clusivity",
	"conjType",
	"definite",
	"degree",
	"deixis",
	"deixisRef",
	"discourseFormulaRole",
	"evident",
	"extPos",
	"foreign",
	"gender",
	"gender[psor]",
	"governedCase",
	"hasGovPrep",
	"hasSepPrefix",
	"hebBinyan",
	"hebExistential",
	"hyph",
	"lexicallyReflexive",
	"mood",
	"nounClass",
	"numForm",
	"number",
	"number[psor]",
	"numType",
	"partType",
	"person",
	"phrasal",
	"polarity",
	"polite",
	"poss",
	"prefix",
	"pronType",
	"punctType",
	"reflex",
	"style",
	"tense",
	"variant",
	"verbForm",
	"verbType",
	"voice",
] as const satisfies readonly AbstractFeatureName[];

type Assert<T extends true> = T;
type _PresentedFeatureNamesAreComplete = Assert<
	[AbstractFeatureName, (typeof presentedFeatureNames)[number]] extends [
		(typeof presentedFeatureNames)[number],
		AbstractFeatureName,
	]
		? true
		: false
>;
