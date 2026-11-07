import type { Point } from "tabletop/core";

/**
 * How a reader turns a Note over (#1315), besides F on the Note under the
 * pointer or in focus, which always works.
 *
 * - `control`: Apple's Dashboard widget and Wallet pass, copied 1:1: a
 *   control in the bottom inline-end corner, shown while the pointer is
 *   over the Card or it has focus (always on touch), turns it over, and the
 *   same control on the back turns it back. A tap still opens the Card.
 * - `flick`: a quick sideways flick of the held Card turns it as it lands.
 * - `press`: a press held still turns it, and its tap no longer opens it.
 * - `key`: F alone.
 */
export type TurnGesture = "control" | "flick" | "press" | "key";

export const TURN_GESTURES: readonly {
	readonly value: TurnGesture;
	readonly label: string;
}[] = [
	{ value: "control", label: "corner control" },
	{ value: "flick", label: "flick in hand" },
	{ value: "press", label: "long press" },
	{ value: "key", label: "F only" },
];

/** A release this fast (px/s), mostly sideways, is a flick. */
const FLICK_SPEED = 650;
const FLICK_RATIO = 1.5;

/** Whether a release at `velocity` is a sideways flick. */
export function isFlick(velocity: Point): boolean {
	const across = Math.abs(velocity.x);
	return (
		across >= FLICK_SPEED && across >= FLICK_RATIO * Math.abs(velocity.y)
	);
}

/** How long a press holds still before it turns the Card, as iOS's long press. */
export const LONG_PRESS_MS = 500;
