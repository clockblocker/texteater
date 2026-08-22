import type {
	Lemma,
	LemmaFamilyFor,
	LemmaForRoute,
	LemmaKindFor,
	LemmaRoute,
	Reading,
	SupportedLanguage,
} from "../types/public-types.js";

export type FixedCatalogCoverage = "Complete" | "Curated";

export type FixedCatalog<T> = Readonly<{
	/** Stable name for the reviewed perimeter to which coverage applies. */
	scope: string;
	coverage: FixedCatalogCoverage;
	members: readonly T[];
}>;

export type FixedLemmaCatalog<R extends LemmaRoute = LemmaRoute> = FixedCatalog<
	LemmaForRoute<R>
> &
	Readonly<{ route: R }>;

export type FixedMembersFor = Readonly<{
	lemma<const R extends LemmaRoute>(
		route: R,
	): FixedCatalog<LemmaForRoute<R>> | undefined;
	reading<
		const L extends SupportedLanguage,
		const F extends LemmaFamilyFor<L>,
		const K extends LemmaKindFor<L, F>,
	>(lemma: Lemma<L, F, K>): FixedCatalog<Reading<L, F, K>> | undefined;
}>;
