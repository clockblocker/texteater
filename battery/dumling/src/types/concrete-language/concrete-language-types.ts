import type {
	AbstractLemma,
	AbstractLemmaKindFor,
	AbstractSelection,
	AbstractSurface,
} from "../abstract/entities.js";
import type { LemmaFamily } from "../core/enums.js";
import type { Replace, ReplaceMany } from "../core/helpers.js";
import type {
	ConcreteLanguage,
	LanguagePackFeatureRegistry,
} from "./features/feature-registry.js";
import type { ValueOf } from "./shared.js";

type RegistryFor<L extends ConcreteLanguage> = LanguagePackFeatureRegistry[L];
type LemmaFamilyForLanguage<L extends ConcreteLanguage> = Extract<
	keyof RegistryFor<L>,
	LemmaFamily
>;
type LemmaKindForLanguage<
	L extends ConcreteLanguage,
	LK extends LemmaFamilyForLanguage<L>,
> = Extract<keyof RegistryFor<L>[LK], AbstractLemmaKindFor<LK>>;
type FeatureDefinitionForLanguage<
	L extends ConcreteLanguage,
	LK extends LemmaFamilyForLanguage<L>,
	LSK extends LemmaKindForLanguage<L, LK>,
> = RegistryFor<L>[LK][LSK] extends infer TFeatureDefinition extends {
	inflectional: Record<string, unknown>;
	core: Record<string, unknown>;
}
	? TFeatureDefinition
	: never;
type InherentFeatureSetForLanguage<
	L extends ConcreteLanguage,
	LK extends LemmaFamilyForLanguage<L>,
	LSK extends LemmaKindForLanguage<L, LK>,
> = FeatureDefinitionForLanguage<L, LK, LSK>["core"];
type InflectionalFeatureSetForLanguage<
	L extends ConcreteLanguage,
	LK extends LemmaFamilyForLanguage<L>,
	LSK extends LemmaKindForLanguage<L, LK>,
> = FeatureDefinitionForLanguage<L, LK, LSK>["inflectional"];

type InflectableLemmaKindsForLanguage<
	L extends ConcreteLanguage,
	LK extends LemmaFamilyForLanguage<L>,
> = {
	[LSK in LemmaKindForLanguage<
		L,
		LK
	>]: keyof InflectionalFeatureSetForLanguage<L, LK, LSK> extends never
		? never
		: LSK;
}[LemmaKindForLanguage<L, LK>];

type InflectableLemmaFamiliesForLanguage<L extends ConcreteLanguage> = {
	[LK in LemmaFamilyForLanguage<L>]: InflectableLemmaKindsForLanguage<
		L,
		LK
	> extends never
		? never
		: LK;
}[LemmaFamilyForLanguage<L>];

type ConcreteLemmaForLanguage<
	L extends ConcreteLanguage,
	LK extends LemmaFamilyForLanguage<L>,
	LSK extends LemmaKindForLanguage<L, LK>,
> = Replace<
	AbstractLemma<L, LK, LSK>,
	"coreFeatures",
	InherentFeatureSetForLanguage<L, LK, LSK>
>;

type ConcreteCitationSurfaceForLanguage<
	L extends ConcreteLanguage,
	LK extends LemmaFamilyForLanguage<L>,
	LSK extends LemmaKindForLanguage<L, LK>,
> = Replace<
	AbstractSurface<L, "Citation", LK, LSK>,
	"lemma",
	ConcreteLemmaForLanguage<L, LK, LSK>
>;

type ConcreteInflectionSurfaceForLanguage<
	L extends ConcreteLanguage,
	LK extends LemmaFamilyForLanguage<L>,
	LSK extends InflectableLemmaKindsForLanguage<L, LK>,
> = ReplaceMany<
	AbstractSurface<L, "Inflection", LK, LSK>,
	{
		inflectionalFeatures: InflectionalFeatureSetForLanguage<L, LK, LSK>;
		lemma: ConcreteLemmaForLanguage<L, LK, LSK>;
	}
>;

type ConcreteCitationSelectionForLanguage<
	L extends ConcreteLanguage,
	LK extends LemmaFamilyForLanguage<L>,
	LSK extends LemmaKindForLanguage<L, LK>,
> = Replace<
	AbstractSelection<L, "Citation", LK, LSK>,
	"surface",
	ConcreteCitationSurfaceForLanguage<L, LK, LSK>
>;

type ConcreteInflectionSelectionForLanguage<
	L extends ConcreteLanguage,
	LK extends LemmaFamilyForLanguage<L>,
	LSK extends InflectableLemmaKindsForLanguage<L, LK>,
> = Replace<
	AbstractSelection<L, "Inflection", LK, LSK>,
	"surface",
	ConcreteInflectionSurfaceForLanguage<L, LK, LSK>
>;

type UnionFromTwoLevelMap<
	T extends Record<PropertyKey, Record<PropertyKey, unknown>>,
> = ValueOf<{
	[K in keyof T]: ValueOf<T[K]>;
}>;

type UnionFromThreeLevelMap<
	T extends Record<
		PropertyKey,
		Record<PropertyKey, Record<PropertyKey, unknown>>
	>,
> = ValueOf<{
	[K in keyof T]: UnionFromTwoLevelMap<T[K]>;
}>;

type LemmaByFamilyForLanguage<L extends ConcreteLanguage> = {
	[LK in LemmaFamilyForLanguage<L>]: {
		[LSK in LemmaKindForLanguage<L, LK>]: ConcreteLemmaForLanguage<
			L,
			LK,
			LSK
		>;
	};
};

type CitationSurfaceByKindForLanguage<L extends ConcreteLanguage> = {
	[LK in LemmaFamilyForLanguage<L>]: {
		[LSK in LemmaKindForLanguage<
			L,
			LK
		>]: ConcreteCitationSurfaceForLanguage<L, LK, LSK>;
	};
};

type InflectionSurfaceByKindForLanguage<L extends ConcreteLanguage> = {
	[LK in InflectableLemmaFamiliesForLanguage<L>]: {
		[LSK in InflectableLemmaKindsForLanguage<
			L,
			LK
		>]: ConcreteInflectionSurfaceForLanguage<L, LK, LSK>;
	};
};

export type SurfaceByKindForLanguage<L extends ConcreteLanguage> = {
	Citation: CitationSurfaceByKindForLanguage<L>;
	Inflection: InflectionSurfaceByKindForLanguage<L>;
};

type CitationSelectionByKindForLanguage<L extends ConcreteLanguage> = {
	[LK in LemmaFamilyForLanguage<L>]: {
		[LSK in LemmaKindForLanguage<
			L,
			LK
		>]: ConcreteCitationSelectionForLanguage<L, LK, LSK>;
	};
};

type InflectionSelectionByKindForLanguage<L extends ConcreteLanguage> = {
	[LK in InflectableLemmaFamiliesForLanguage<L>]: {
		[LSK in InflectableLemmaKindsForLanguage<
			L,
			LK
		>]: ConcreteInflectionSelectionForLanguage<L, LK, LSK>;
	};
};

type SelectionByKindForLanguage<L extends ConcreteLanguage> = {
	Citation: CitationSelectionByKindForLanguage<L>;
	Inflection: InflectionSelectionByKindForLanguage<L>;
};

export type LanguageLemmaUnionMap = {
	[L in ConcreteLanguage]: UnionFromTwoLevelMap<LemmaByFamilyForLanguage<L>>;
};

export type LanguageSurfaceUnionMap = {
	[L in ConcreteLanguage]: UnionFromThreeLevelMap<
		SurfaceByKindForLanguage<L>
	>;
};

export type LanguageSelectionByKindMap = {
	[L in ConcreteLanguage]: SelectionByKindForLanguage<L>;
};
