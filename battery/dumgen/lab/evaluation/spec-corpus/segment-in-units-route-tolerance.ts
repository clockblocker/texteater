/**
 * Which route misses `segment.inUnits` scoring tolerates (Dumgen ADR 0008).
 * The evaluator and the lab both judge a returned unit's route through
 * `acceptableRoute`, so the tolerated set lives here only.
 */
import type { Unit } from "./segment-in-units.js";

type UnitRoute = Unit["route"];

/**
 * Kind pairs a learner barely notices, tolerated in either direction within
 * Family `Lexeme`. The authorities disagree on the first two: grammis reads
 * Abtönungspartikel and Adverbkonnektor where STTS and UD read ADV and KON.
 */
export const toleratedKindPairs = [
	["PART", "ADV"],
	["CCONJ", "ADV"],
	["ADJ", "ADV"],
	["NOUN", "PROPN"],
	["PRON", "DET"],
] as const;

export type ToleratedKindPair = (typeof toleratedKindPairs)[number];

const toleratedFamily = "Lexeme";

export function sameRoute(expected: UnitRoute, returned: UnitRoute): boolean {
	if (expected === "Unresolved" || returned === "Unresolved")
		return expected === returned;
	return (
		expected.language === returned.language &&
		expected.family === returned.family &&
		expected.kind === returned.kind
	);
}

/**
 * The tolerated pair a returned route confuses with the expected one, or
 * undefined when the routes are equal or differ in anything else: language,
 * Family, `Unresolved`, or a Kind pair outside the set.
 */
export function toleratedPairOf(
	expected: UnitRoute,
	returned: UnitRoute,
): ToleratedKindPair | undefined {
	if (expected === "Unresolved" || returned === "Unresolved") return;
	if (
		expected.language !== returned.language ||
		expected.family !== toleratedFamily ||
		returned.family !== toleratedFamily
	)
		return;
	return toleratedKindPairs.find(
		([left, right]) =>
			(expected.kind === left && returned.kind === right) ||
			(expected.kind === right && returned.kind === left),
	);
}

/**
 * Whether a returned route is acceptable for the expected one: the same
 * route, or a tolerated Kind confusion of it. Callers ask only this, so a
 * later DTO that returns a pair of Kinds can change the check here alone.
 */
export function tolerableRoute(
	expected: UnitRoute,
	returned: UnitRoute,
): boolean {
	return (
		sameRoute(expected, returned) ||
		toleratedPairOf(expected, returned) !== undefined
	);
}

/**
 * Whether a returned unit routes acceptably (Dumgen ADR 0008): a
 * borderline unit when the expected route is among its variants, a unit
 * with one route when that route is tolerable. The tolerated Kind pairs
 * apply to single routes only.
 */
export function acceptableRoute(
	expected: UnitRoute,
	returned: Pick<Unit, "route" | "variants">,
): boolean {
	if (returned.variants)
		return returned.variants.some((variant) =>
			sameRoute(expected, variant),
		);
	return tolerableRoute(expected, returned.route);
}
