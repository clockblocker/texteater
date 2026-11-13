import { CARRY_FOLLOWS, type CarryFollow } from "./carry";
import { HOLD_BUILDS, type HoldBuild } from "./hold";

/**
 * The hold to lift's knobs and their defaults. The hold is iOS's long
 * press, 500 ms, and the hand may drift as far as D's axis lock and still
 * count as still; a press past either the stillness or the axis lock
 * first is a swipe. While it builds the Card rises half way to its
 * lifted pose, from 150 ms in, so a tap or a swipe never shows it; at the
 * lift it pops up the rest, 4 % bigger than an open Card, and the Deck
 * closes its gap. In the hand it follows 1:1, as the hand does under
 * reduced motion; the stiff follow is critically damped at its stiffness.
 */
export const CARRY_DEFAULTS = {
	holdMs: 500,
	holdSlop: 10,
	holdBuild: "rise" as HoldBuild,
	holdBuildDelayMs: 150,
	liftScale: 1.04,
	carryFollow: "1:1" as CarryFollow,
	followStiffness: 1200,
	closeUp: true,
};

type Key = keyof typeof CARRY_DEFAULTS;

function num(
	key: Key,
	label: string,
	min: number,
	max: number,
	step: number,
	unit?: string,
) {
	return { kind: "number" as const, key, label, min, max, step, unit };
}

/** The hold's and the carry's inspector controls, to spread into D's knobs. */
export const CARRY_KNOBS = [
	num("holdMs", "Hold to lift", 200, 1500, 10, "ms"),
	num("holdSlop", "Hold stillness", 2, 40, 1, "px"),
	{
		kind: "choice" as const,
		key: "holdBuild" as const,
		label: "Hold build",
		options: HOLD_BUILDS,
	},
	num("holdBuildDelayMs", "Hold build delay", 0, 400, 10, "ms"),
	num("liftScale", "Lift scale", 1, 1.15, 0.01),
	{
		kind: "choice" as const,
		key: "carryFollow" as const,
		label: "Carry follow",
		options: CARRY_FOLLOWS,
	},
	num("followStiffness", "Stiff follow stiffness (ζ 1)", 200, 4000, 50),
	{
		kind: "toggle" as const,
		key: "closeUp" as const,
		label: "Deck closes the gap",
	},
];
