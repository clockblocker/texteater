import { CARRY_DEFAULTS, CARRY_KNOBS } from "./carry-knobs";
import { CLOSE_DEFAULTS, CLOSE_KNOBS } from "./cover-close";
import type { AnyKnob } from "./knobs";
import { COLLAPSE_CURVES, type CollapseCurve } from "./swipe-gesture";
import { TAP_DEFAULTS, TAP_KNOBS } from "./tap-card";

/**
 * D's knobs and their tuned defaults. One threshold is the breakpoint for
 * everything: the Deck is whole, the panel lights and a release commits
 * there, and, with "Flick commits" off, nowhere else. With it on, a
 * release short of it also commits when the hand's speed, carried on for
 * `flickMs`, would reach it; the panel still lights on the distance alone. Under the hand everything tracks it 1:1, the
 * panel's icon too, which stops once the strip is full; the springs are
 * Motion's stiffness/damping at mass 1, and the reduced return is
 * critically damped at whatever stiffness.
 * Toward Close deck the Deck fades as one layer with the gather, to
 * `dismissOpacity` at the threshold; a commit carries it on at the hand's
 * speed for at most `driftPx`, slowing to a stop, while it fades out in
 * `exitFadeMs`. A Card held still lifts into the hand: its knobs are
 * the carry's (`carry-knobs.ts`), and the haptic tick marks the lift too.
 */
export const SWIPE_DEFAULTS = {
	...TAP_DEFAULTS,
	...CLOSE_DEFAULTS,
	...CARRY_DEFAULTS,
	threshold: 96,
	rubberLimit: 48,
	axisLock: 10,
	takeUp: 24,
	collapseCurve: "linear" as CollapseCurve,
	dismissOpacity: 0.5,
	driftPx: 40,
	exitFadeMs: 220,
	tint: 0.2,
	floodMs: 100,
	popScale: 1.16,
	pressLift: 0.3,
	reducedReturnStiffness: 260,
	panelFadeMs: 160,
	flickCommits: false,
	flickMs: 200,
	haptic: true,
	panelLabels: true,
};
export type SwipeKnobs = typeof SWIPE_DEFAULTS;

type SwipeKnob = AnyKnob & { readonly key: keyof SwipeKnobs };

function num(
	key: keyof SwipeKnobs,
	label: string,
	min: number,
	max: number,
	step: number,
	unit?: string,
): SwipeKnob {
	return { kind: "number", key, label, min, max, step, unit };
}

export const SWIPE_KNOBS: readonly SwipeKnob[] = [
	...TAP_KNOBS,
	...CLOSE_KNOBS,
	num("threshold", "Commit threshold", 40, 200, 2, "px"),
	num("rubberLimit", "Rubber band", 0, 160, 2, "px"),
	num("axisLock", "Axis lock", 2, 40, 1, "px"),
	num("takeUp", "Axis lock take-up", 0, 80, 1, "px"),
	{
		kind: "choice",
		key: "collapseCurve",
		label: "Deck collapse curve",
		options: COLLAPSE_CURVES,
	},
	num("dismissOpacity", "Deck opacity at the dismiss point", 0, 1, 0.05),
	num("driftPx", "Deck drift on a Close deck commit", 0, 160, 2, "px"),
	num("exitFadeMs", "Deck fade on a Close deck commit", 0, 600, 10, "ms"),
	num("tint", "Panel tint before the threshold", 0, 0.6, 0.01),
	num("floodMs", "Colour flood", 0, 400, 10, "ms"),
	num("popScale", "Icon pop", 1, 1.5, 0.01),
	num("pressLift", "Press lift", 0, 1, 0.05),
	num(
		"reducedReturnStiffness",
		"Reduced return stiffness (ζ 1)",
		60,
		1000,
		10,
	),
	num("panelFadeMs", "Panel fade on commit", 0, 400, 10, "ms"),
	{ kind: "toggle", key: "flickCommits", label: "Flick commits" },
	num("flickMs", "Flick projection", 50, 500, 10, "ms"),
	{ kind: "toggle", key: "haptic", label: "Haptic tick (where supported)" },
	{ kind: "toggle", key: "panelLabels", label: "Panel labels" },
	...CARRY_KNOBS,
];
