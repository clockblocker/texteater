import type { AnyKnob } from "./knobs";
import { COLLAPSE_CURVES, type CollapseCurve } from "./swipe-gesture";
import { HOVER_DEFAULTS, HOVER_KNOBS } from "./use-deck-hover";

/**
 * D's knobs and their tuned defaults. One threshold is the breakpoint for
 * everything: the Deck is whole, the panel lights and a release commits
 * there, and nowhere else. Under the hand everything tracks it 1:1; the
 * springs are Motion's stiffness/damping at mass 1. The icon's lock is
 * response 0.24 s, ζ 0.76, a little bounce because the hand carried it
 * there; the reduced return is critically damped at whatever stiffness.
 */
export const SWIPE_DEFAULTS = {
	threshold: 96,
	rubberLimit: 48,
	axisLock: 10,
	takeUp: 24,
	collapseCurve: "linear" as CollapseCurve,
	panelInset: 16,
	tint: 0.2,
	floodMs: 100,
	lockStiffness: 700,
	lockDamping: 40,
	popScale: 1.16,
	pressLift: 0.3,
	reducedReturnStiffness: 260,
	panelFadeMs: 160,
	haptic: true,
	panelLabels: true,
	...HOVER_DEFAULTS,
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
	num("panelInset", "Panel inset from the Card's edges", 0, 40, 1, "px"),
	num("tint", "Panel tint before the threshold", 0, 0.6, 0.01),
	num("floodMs", "Colour flood", 0, 400, 10, "ms"),
	num("lockStiffness", "Icon lock stiffness", 100, 2000, 20),
	num("lockDamping", "Icon lock damping", 1, 120, 1),
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
	{ kind: "toggle", key: "haptic", label: "Haptic tick (where supported)" },
	{ kind: "toggle", key: "panelLabels", label: "Panel labels" },
	...HOVER_KNOBS,
];
