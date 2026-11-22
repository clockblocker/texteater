import type * as Dumling from "dumling/types";

/**
 * One language's route policy table, keyed by its Families and Kinds, so a key
 * that names no Dumling route fails to type-check.
 */
export type RoutePolicy<L extends Dumling.Language, V> = {
	readonly [F in Dumling.Family<L>]?: {
		readonly [K in Dumling.Kind<L, F>]?: V;
	};
};

type RouteLookup<V> = Readonly<Record<string, Readonly<Record<string, V>>>>;

/**
 * Looks up a value by `language`, `family` and `kind` in a per-language route
 * policy map, guarding every level with `Object.hasOwn`.
 */
export function lookupRoute<V>(
	policies: { readonly [L in Dumling.Language]?: RoutePolicy<L, V> },
	route: Dumling.LemmaRoute,
): V | undefined {
	const byLanguage: Readonly<Record<string, RouteLookup<V> | undefined>> =
		policies;
	const policy = Object.hasOwn(byLanguage, route.language)
		? byLanguage[route.language]
		: undefined;
	const kinds =
		policy && Object.hasOwn(policy, route.family)
			? policy[route.family]
			: undefined;
	return kinds && Object.hasOwn(kinds, route.kind)
		? kinds[route.kind]
		: undefined;
}
