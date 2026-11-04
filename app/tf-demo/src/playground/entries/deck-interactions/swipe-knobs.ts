import type { AnyKnob } from "./knobs";
import { COLLAPSE_CURVES, type CollapseCurve } from "./swipe-gesture";

/**
 * D's knobs and their tuned defaults. Under the hand everything tracks it
 * 1:1, so the detent's resistance, and with it the snap, starts at 0. The
 * springs are Motion's stiffness/damping at mass 1: the snap is response
 * 0.21 s, ζ 0.77; the icon's lock is response 0.24 s, ζ 0.76, a little
 * bounce because the hand carried it there. The reduced return is critically damped at whatever
 * stiffness, so it never overshoots.
 */
export const SWIPE_DEFAULTS = {
	detent: 96,
	hysteresis: 12,
	resistance: 0,
	detentBand: 20,
	snapStiffness: 900,
	snapDamping: 46,
	rubberLimit: 48,
	axisLock: 10,
	takeUp: 24,
	flickSpeed: 0.5,
	tint: 0.2,
	floodMs: 100,
	lockStiffness: 700,
	lockDamping: 40,
	popScale: 1.16,
	pressLift: 0.3,
	collapseCurve: "linear" as CollapseCurve,
	reducedReturnStiffness: 260,
	panelFadeMs: 160,
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
	num("detent", "Detent", 40, 200, 2, "px"),
	num("hysteresis", "Detent hysteresis", 0, 40, 1, "px"),
	num("resistance", "Detent resistance", 0, 0.8, 0.01),
	num("detentBand", "Detent band", 0, 60, 1, "px"),
	num("snapStiffness", "Detent snap stiffness", 100, 2000, 20),
	num("snapDamping", "Detent snap damping", 1, 120, 1),
	num("rubberLimit", "Rubber band", 0, 160, 2, "px"),
	num("axisLock", "Axis lock", 2, 40, 1, "px"),
	num("takeUp", "Axis lock take-up", 0, 80, 1, "px"),
	num("flickSpeed", "Flick speed", 0.1, 3, 0.05, "px/ms"),
	num("tint", "Panel tint before the detent", 0, 0.6, 0.01),
	num("floodMs", "Colour flood", 0, 400, 10, "ms"),
	num("lockStiffness", "Icon lock stiffness", 100, 2000, 20),
	num("lockDamping", "Icon lock damping", 1, 120, 1),
	num("popScale", "Icon pop", 1, 1.5, 0.01),
	num("pressLift", "Press lift", 0, 1, 0.05),
	{
		kind: "choice",
		key: "collapseCurve",
		label: "Deck collapse curve",
		options: COLLAPSE_CURVES,
	},
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
];
