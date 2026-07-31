import type {
	ConstructionKind,
	LemmaFamily,
	MorphemeKind,
	PhrasemeKind,
	Pos,
	SurfaceKind,
} from "../core/enums.js";
import type {
	AbstractCoreFeatures,
	AbstractInflectionalFeatures,
} from "./features/features-catalog.js";

export type SurfaceFeatures = {
	historicalStatus: "Archaic" | null;
};

export type SegmentedSentenceId = string & {
	readonly __segmentedSentenceIdBrand: unique symbol;
};

export type AbstractLemmaKindFor<LK extends LemmaFamily> = LK extends "Lexeme"
	? Pos
	: LK extends "Morpheme"
		? MorphemeKind
		: LK extends "Phraseme"
			? PhrasemeKind
			: LK extends "Construction"
				? ConstructionKind
				: never;

export type AbstractCoreFeaturesFor<
	LK extends LemmaFamily = LemmaFamily,
	_LSK extends AbstractLemmaKindFor<LK> = AbstractLemmaKindFor<LK>,
> = AbstractCoreFeatures;

export type AbstractInflectionalFeaturesFor<
	LK extends LemmaFamily = LemmaFamily,
	_LSK extends AbstractLemmaKindFor<LK> = AbstractLemmaKindFor<LK>,
> = AbstractInflectionalFeatures;

export type AbstractLemma<
	L extends string = string,
	LK extends LemmaFamily = LemmaFamily,
	LSK extends AbstractLemmaKindFor<LK> = AbstractLemmaKindFor<LK>,
> = {
	language: L;
	canonicalForm: string;
	family: LK;
	kind: LSK;
	coreFeatures: AbstractCoreFeaturesFor<LK, LSK>;
};

type AbstractSurfacePayload<
	SK extends SurfaceKind,
	LK extends LemmaFamily,
	LSK extends AbstractLemmaKindFor<LK>,
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
	LK extends LemmaFamily = LemmaFamily,
	LSK extends AbstractLemmaKindFor<LK> = AbstractLemmaKindFor<LK>,
> = {
	language: L;
	normalizedSurface: string;
	spelling: "Canonical" | "Variant";
	realizationCoverage: "Full" | "Partial";
	surfaceKind: SK;
	surfaceFeatures: SurfaceFeatures | null;
	lemma: AbstractLemma<L, LK, LSK>;
} & AbstractSurfacePayload<SK, LK, LSK>;

export type AbstractSelection<
	L extends string = string,
	SK extends SurfaceKind = SurfaceKind,
	LK extends LemmaFamily = LemmaFamily,
	LSK extends AbstractLemmaKindFor<LK> = AbstractLemmaKindFor<LK>,
> = {
	segmentedSentenceId: SegmentedSentenceId;
	clickedSegmentIndex: number;
	surfaceSegmentIndices: number[];
	attestedSurface: string;
	selectedOrthography: "Standard" | "Typo";
	surface: AbstractSurface<L, SK, LK, LSK>;
};
