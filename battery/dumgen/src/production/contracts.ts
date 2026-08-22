import type { Lemma, Reading } from "dumling/types";

import type { GermanGrammaticalRoute } from "../schema/de-grammatical-resolution-inventory";

export type CatalogMissReason = "MemberNotCatalogued" | "InventoryNotLoaded";

export type CatalogMissBase = Readonly<{
	decision: "CatalogMiss";
	reason: CatalogMissReason;
	language: "de";
	route: GermanGrammaticalRoute;
}>;

export type LemmaCatalogMiss = CatalogMissBase &
	Readonly<{
		stage: "Lemma";
		candidate: Lemma<"de">;
	}>;

export type ReadingCatalogMiss = CatalogMissBase &
	Readonly<{
		stage: "Reading";
		candidate: Reading<"de">;
	}>;

export function routeFor(value: {
	readonly family: GermanGrammaticalRoute["family"];
	readonly kind: string;
}): GermanGrammaticalRoute {
	return Object.freeze({
		family: value.family,
		kind: value.kind,
	}) as GermanGrammaticalRoute;
}

export function lemmaRouteFor(value: {
	readonly family: GermanGrammaticalRoute["family"];
	readonly kind: string;
}): import("dumling/types").LemmaRoute<"de"> {
	return Object.freeze({ language: "de", ...routeFor(value) });
}
