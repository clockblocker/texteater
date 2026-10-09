import type { z } from "zod";
import type { Language, UnitMap } from "../generated/units.js";

/**
 * The `language/Family/Kind` key of a generated route of `L`. A route
 * condition that names a route the schemas do not define fails the type
 * check.
 */
export type RouteKey<L extends Language = Language> = Extract<
	keyof UnitMap,
	`${L}/${string}`
>;

/**
 * A route's check on one unit, with the error it reports. The check names the
 * unit fields it reads; it runs only on a unit its route's schema has parsed.
 */
export type Check = readonly [(input: never) => boolean, () => string];

/** A check that a route of the condition it names passes. */
type ConditionalCheck<Condition extends string> = readonly [
	condition: Condition,
	...check: Check,
];

/** The Attestation evidence fields a language's route policy may add. */
type PolicyEvidence<Condition extends PropertyKey> = {
	readonly [Field in "expletiveEvidence" | "valencyEvidence"]?: {
		readonly [Name in Condition]?: z.core.$ZodType;
	};
};

/**
 * States one language's route conditions beside its concrete routes. Each
 * condition names the routes of `language` it holds for, so a condition that
 * names a route the schemas do not define fails the type check.
 * Language-neutral conditions (`syncretism`, `foreign`, `lexemeArticleOwner`,
 * `locutionArticleOwner`, `comparability`) are read by `buildUnitSchemas`; a
 * language's own conditions bring the Surface and Attestation checks their
 * routes pass, in the listed order, and the evidence fields they add.
 */
export function routePolicy<
	L extends Language,
	const C extends Readonly<Record<string, readonly RouteKey<L>[]>>,
	const E extends PolicyEvidence<keyof C>,
>(
	language: L,
	policy: {
		conditions: C;
		surfaceChecks: readonly ConditionalCheck<keyof C & string>[];
		attestationChecks: readonly ConditionalCheck<keyof C & string>[];
		attestationEvidence: E;
	},
) {
	return { language, ...policy };
}
