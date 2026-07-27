import type {
	ConstructionKind,
	LemmaKind,
	MorphemeKind,
	PhrasemeKind,
	Pos,
	SurfaceKind,
} from "../core/enums";
import type {
	AbstractInflectionalFeatures,
	AbstractInherentFeatures,
} from "./features/features-catalog";

type RequireAtLeastOne<T extends object> = {
	[K in keyof T]-?: Required<Pick<T, K>> & Partial<Omit<T, K>>;
}[keyof T];

export type SelectionFeatures = RequireAtLeastOne<{
	orthography?: "Typo";
	coverage?: "Partial";
	spelling?: "Variant";
}>;

export type SurfaceFeatures = RequireAtLeastOne<{
	historicalStatus?: "Archaic";
}>;

export type AbstractLemmaSubKindFor<LK extends LemmaKind> = LK extends "Lexeme"
	? Pos
	: LK extends "Morpheme"
		? MorphemeKind
		: LK extends "Phraseme"
			? PhrasemeKind
			: LK extends "Construction"
				? ConstructionKind
				: never;

export type AbstractInherentFeaturesFor<
	LK extends LemmaKind = LemmaKind,
	_LSK extends AbstractLemmaSubKindFor<LK> = AbstractLemmaSubKindFor<LK>,
> = AbstractInherentFeatures;

export type AbstractInflectionalFeaturesFor<
	LK extends LemmaKind = LemmaKind,
	_LSK extends AbstractLemmaSubKindFor<LK> = AbstractLemmaSubKindFor<LK>,
> = RequireAtLeastOne<AbstractInflectionalFeatures>;

export type AbstractLemma<
	L extends string = string,
	LK extends LemmaKind = LemmaKind,
	LSK extends AbstractLemmaSubKindFor<LK> = AbstractLemmaSubKindFor<LK>,
> = {
	language: L;
	canonicalLemma: string;
	lemmaKind: LK;
	lemmaSubKind: LSK;
	inherentFeatures: AbstractInherentFeaturesFor<LK, LSK>;
	meaningInEmojis: string;
};

type AbstractSurfacePayload<
	SK extends SurfaceKind,
	LK extends LemmaKind,
	LSK extends AbstractLemmaSubKindFor<LK>,
> = SK extends "Citation"
	? Record<never, never>
	: SK extends "Inflection"
		? {
				inflectionalFeatures: AbstractInflectionalFeaturesFor<LK, LSK>;
			}
		: never;

export type AbstractSurface<
	L extends string = string,
	SK extends SurfaceKind = SurfaceKind,
	LK extends LemmaKind = LemmaKind,
	LSK extends AbstractLemmaSubKindFor<LK> = AbstractLemmaSubKindFor<LK>,
> = {
	language: L;
	normalizedFullSurface: string;
	surfaceKind: SK;
	surfaceFeatures?: SurfaceFeatures;
	lemma: AbstractLemma<L, LK, LSK>;
} & AbstractSurfacePayload<SK, LK, LSK>;

export type AbstractSelection<
	L extends string = string,
	SK extends SurfaceKind = SurfaceKind,
	LK extends LemmaKind = LemmaKind,
	LSK extends AbstractLemmaSubKindFor<LK> = AbstractLemmaSubKindFor<LK>,
> = {
	language: L;
	selectionFeatures?: SelectionFeatures;
	spelledSelection: string;
	surface: AbstractSurface<L, SK, LK, LSK>;
};
