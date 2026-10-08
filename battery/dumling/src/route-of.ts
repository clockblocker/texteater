import type { LemmaRoute } from "./types.js";

/** A Lemma's language, family and kind, still correlated per route. */
export type RouteOf<L> = L extends unknown
	? Pick<L, Extract<keyof L, "language" | "family" | "kind">>
	: never;

/**
 * Takes a Lemma's route as a fresh object. Destructuring the three fields
 * turns each into its own union, and rebuilding them loses which Family goes
 * with which Kind; this keeps them together and carries no other field.
 */
export function routeOf<L extends LemmaRoute>(lemma: L): RouteOf<L> {
	const { language, family, kind } = lemma;
	// Each field comes from the same L, so the rebuilt object is L's route.
	return { language, family, kind } as RouteOf<L>;
}
