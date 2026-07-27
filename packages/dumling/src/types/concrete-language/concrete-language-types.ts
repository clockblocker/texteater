import type {
	AbstractLemma,
	AbstractLemmaSubKindFor,
	AbstractSelection,
	AbstractSurface,
} from "../abstract/entities";
import type { LemmaKind } from "../core/enums";
import type { Replace, ReplaceMany } from "../core/helpers";
import type {
	ConcreteLanguage,
	LanguagePackFeatureRegistry,
} from "./features/feature-registry";
import type { ValueOf } from "./shared";

type RegistryFor<L extends ConcreteLanguage> = LanguagePackFeatureRegistry[L];
type LemmaKindForLanguage<L extends ConcreteLanguage> = Extract<
	keyof RegistryFor<L>,
	LemmaKind
>;
type LemmaSubKindForLanguage<
	L extends ConcreteLanguage,
	LK extends LemmaKindForLanguage<L>,
> = Extract<keyof RegistryFor<L>[LK], AbstractLemmaSubKindFor<LK>>;
type FeatureDefinitionForLanguage<
	L extends ConcreteLanguage,
	LK extends LemmaKindForLanguage<L>,
	LSK extends LemmaSubKindForLanguage<L, LK>,
> = RegistryFor<L>[LK][LSK] extends infer TFeatureDefinition extends {
	inflectional: Record<string, unknown>;
	inherent: Record<string, unknown>;
}
	? TFeatureDefinition
	: never;
type InherentFeatureSetForLanguage<
	L extends ConcreteLanguage,
	LK extends LemmaKindForLanguage<L>,
	LSK extends LemmaSubKindForLanguage<L, LK>,
> = FeatureDefinitionForLanguage<L, LK, LSK>["inherent"];
type InflectionalFeatureSetForLanguage<
	L extends ConcreteLanguage,
	LK extends LemmaKindForLanguage<L>,
	LSK extends LemmaSubKindForLanguage<L, LK>,
> = FeatureDefinitionForLanguage<L, LK, LSK>["inflectional"];

type InflectableLemmaSubKindsForLanguage<
	L extends ConcreteLanguage,
	LK extends LemmaKindForLanguage<L>,
> = {
	[LSK in LemmaSubKindForLanguage<
		L,
		LK
	>]: keyof InflectionalFeatureSetForLanguage<L, LK, LSK> extends never
		? never
		: LSK;
}[LemmaSubKindForLanguage<L, LK>];

type InflectableLemmaKindsForLanguage<L extends ConcreteLanguage> = {
	[LK in LemmaKindForLanguage<L>]: InflectableLemmaSubKindsForLanguage<
		L,
		LK
	> extends never
		? never
		: LK;
}[LemmaKindForLanguage<L>];

type ConcreteLemmaForLanguage<
	L extends ConcreteLanguage,
	LK extends LemmaKindForLanguage<L>,
	LSK extends LemmaSubKindForLanguage<L, LK>,
> = Replace<
	AbstractLemma<L, LK, LSK>,
	"inherentFeatures",
	InherentFeatureSetForLanguage<L, LK, LSK>
>;

type ConcreteCitationSurfaceForLanguage<
	L extends ConcreteLanguage,
	LK extends LemmaKindForLanguage<L>,
	LSK extends LemmaSubKindForLanguage<L, LK>,
> = Replace<
	AbstractSurface<L, "Citation", LK, LSK>,
	"lemma",
	ConcreteLemmaForLanguage<L, LK, LSK>
>;

type ConcreteInflectionSurfaceForLanguage<
	L extends ConcreteLanguage,
	LK extends LemmaKindForLanguage<L>,
	LSK extends InflectableLemmaSubKindsForLanguage<L, LK>,
> = ReplaceMany<
	AbstractSurface<L, "Inflection", LK, LSK>,
	{
		inflectionalFeatures: InflectionalFeatureSetForLanguage<L, LK, LSK>;
		lemma: ConcreteLemmaForLanguage<L, LK, LSK>;
	}
>;

type ConcreteCitationSelectionForLanguage<
	L extends ConcreteLanguage,
	LK extends LemmaKindForLanguage<L>,
	LSK extends LemmaSubKindForLanguage<L, LK>,
> = Replace<
	AbstractSelection<L, "Citation", LK, LSK>,
	"surface",
	ConcreteCitationSurfaceForLanguage<L, LK, LSK>
>;

type ConcreteInflectionSelectionForLanguage<
	L extends ConcreteLanguage,
	LK extends LemmaKindForLanguage<L>,
	LSK extends InflectableLemmaSubKindsForLanguage<L, LK>,
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

type UnionFromFourLevelMap<
	T extends Record<
		PropertyKey,
		Record<PropertyKey, Record<PropertyKey, Record<PropertyKey, unknown>>>
	>,
> = ValueOf<{
	[K in keyof T]: UnionFromThreeLevelMap<T[K]>;
}>;

export type LemmaByKindForLanguage<L extends ConcreteLanguage> = {
	[LK in LemmaKindForLanguage<L>]: {
		[LSK in LemmaSubKindForLanguage<L, LK>]: ConcreteLemmaForLanguage<
			L,
			LK,
			LSK
		>;
	};
};

type CitationSurfaceByKindForLanguage<L extends ConcreteLanguage> = {
	[LK in LemmaKindForLanguage<L>]: {
		[LSK in LemmaSubKindForLanguage<
			L,
			LK
		>]: ConcreteCitationSurfaceForLanguage<L, LK, LSK>;
	};
};

type InflectionSurfaceByKindForLanguage<L extends ConcreteLanguage> = {
	[LK in InflectableLemmaKindsForLanguage<L>]: {
		[LSK in InflectableLemmaSubKindsForLanguage<
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
	[LK in LemmaKindForLanguage<L>]: {
		[LSK in LemmaSubKindForLanguage<
			L,
			LK
		>]: ConcreteCitationSelectionForLanguage<L, LK, LSK>;
	};
};

type InflectionSelectionByKindForLanguage<L extends ConcreteLanguage> = {
	[LK in InflectableLemmaKindsForLanguage<L>]: {
		[LSK in InflectableLemmaSubKindsForLanguage<
			L,
			LK
		>]: ConcreteInflectionSelectionForLanguage<L, LK, LSK>;
	};
};

export type SelectionByKindForLanguage<L extends ConcreteLanguage> = {
	Citation: CitationSelectionByKindForLanguage<L>;
	Inflection: InflectionSelectionByKindForLanguage<L>;
};

export type LanguageLemmaUnionMap = {
	[L in ConcreteLanguage]: UnionFromTwoLevelMap<LemmaByKindForLanguage<L>>;
};

export type LanguageSurfaceUnionMap = {
	[L in ConcreteLanguage]: UnionFromThreeLevelMap<
		SurfaceByKindForLanguage<L>
	>;
};

export type LanguageSelectionByKindMap = {
	[L in ConcreteLanguage]: SelectionByKindForLanguage<L>;
};

export type LanguageSelectionUnionMap = {
	[L in ConcreteLanguage]: UnionFromThreeLevelMap<
		SelectionByKindForLanguage<L>
	>;
};
