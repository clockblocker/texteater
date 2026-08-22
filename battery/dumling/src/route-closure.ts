import type {
	LemmaFamilyFor,
	LemmaKindFor,
	LemmaRoute,
	SupportedLanguage,
} from "./types/public-types.js";

type SparseRoutePromotionTree = {
	readonly [L in SupportedLanguage]?: {
		readonly [F in LemmaFamilyFor<L>]?: {
			readonly [K in LemmaKindFor<L, F>]?: true;
		};
	};
};

/*
 * Reading promotions are authored first. A Reading promotion always promotes
 * the same Lemma route, so the subset invariant is structural rather than a
 * convention callers must remember.
 */
const CLOSED_READING_ROUTE_PROMOTIONS = deepFreeze({
	de: { Lexeme: { DET: true } },
} as const satisfies SparseRoutePromotionTree);

/* Add only routes whose Lemmas are Closed while their Readings remain Open. */
const CLOSED_LEMMA_ONLY_ROUTE_PROMOTIONS = deepFreeze(
	{} as const satisfies SparseRoutePromotionTree,
);

function isPromoted(
	tree: SparseRoutePromotionTree,
	route: LemmaRoute,
): boolean {
	const languages = tree as Readonly<
		Record<string, Readonly<Record<string, Readonly<Record<string, true>>>>>
	>;
	return languages[route.language]?.[route.family]?.[route.kind] === true;
}

/** Dumling-owned policy for selecting Open or Closed production. */
export const isClosedRouteFor = Object.freeze({
	lemma(route: LemmaRoute): boolean {
		return (
			isPromoted(CLOSED_READING_ROUTE_PROMOTIONS, route) ||
			isPromoted(CLOSED_LEMMA_ONLY_ROUTE_PROMOTIONS, route)
		);
	},
	reading(route: LemmaRoute): boolean {
		return isPromoted(CLOSED_READING_ROUTE_PROMOTIONS, route);
	},
});

function deepFreeze<T>(value: T): T {
	if (value !== null && typeof value === "object") {
		for (const member of Object.values(value)) deepFreeze(member);
		Object.freeze(value);
	}
	return value;
}
