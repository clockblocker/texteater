import type { Prettify } from "common-utils";
import type { Lemma, Reading } from "dumling-old/types";

import type { GermanGrammaticalRoute } from "../schema/de-grammatical-resolution-inventory";

export type CatalogMissReason = "MemberNotCatalogued" | "InventoryNotLoaded";

export type CatalogMissBase<
	Route extends GermanGrammaticalRoute = GermanGrammaticalRoute,
> = Readonly<{
	decision: "CatalogMiss";
	reason: CatalogMissReason;
	language: "de";
	route: Route;
}>;

export type LemmaCatalogMiss = CatalogMissBase &
	Readonly<{
		stage: "Lemma";
		candidate: Lemma<"de">;
	}>;

export type GermanReadingRoute<Value extends Reading<"de">> =
	Value extends unknown
		? Readonly<{
				family: Value["lemma"]["family"];
				kind: Value["lemma"]["kind"];
			}>
		: never;

export type ReadingCatalogMissFor<Value extends Reading<"de">> =
	Value extends unknown
		? Prettify<
				CatalogMissBase<GermanReadingRoute<Value>> &
					Readonly<{
						stage: "Reading";
						candidate: Value;
					}>
			>
		: never;

export type ReadingCatalogMiss = ReadingCatalogMissFor<Reading<"de">>;

export function routeFor(value: {
	readonly family: GermanGrammaticalRoute["family"];
	readonly kind: string;
}): GermanGrammaticalRoute {
	return Object.freeze({
		family: value.family,
		kind: value.kind,
	}) as GermanGrammaticalRoute;
}

export function readingRouteFor<Value extends Reading<"de">>(
	reading: Value,
): GermanReadingRoute<Value> {
	return routeFor(reading.lemma) as GermanReadingRoute<Value>;
}

export function lemmaRouteFor(value: {
	readonly family: GermanGrammaticalRoute["family"];
	readonly kind: string;
}): import("dumling-old/types").LemmaRoute<"de"> {
	return Object.freeze({ language: "de", ...routeFor(value) });
}
