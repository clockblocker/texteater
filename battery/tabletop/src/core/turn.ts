import type { Side } from "./place";

/**
 * A Body's turn: one angle in degrees about its own axis, 0 face up, 180
 * face down, and on round the same way (360 is face up again). The face
 * that shows is read off the angle. Ported from the playground's
 * `deck-tricks/card-turn.ts` (#1313).
 */

/** How a turn plays. */
export type TurnFeel = {
	/** The turn's length; 0 switches the face at once. */
	readonly ms: number;
	/** The viewer's distance in px, for the turn's perspective. */
	readonly perspective: number;
	/** How much bigger the Body is at the half turn, edge on: 0.06 is 6%. */
	readonly lift: number;
	/** The Body's own axis it turns about: its long one (y) or its short one (x). */
	readonly axis: "x" | "y";
};

/** #1313's defaults: 300 ms, 600 px perspective, 6% lift edge on, the long axis. */
export const DEFAULT_TURN: TurnFeel = {
	ms: 300,
	perspective: 600,
	lift: 0.06,
	axis: "y",
};

/** The resting angle of `side`: what the Body's CSS holds at rest. */
export function restAngle(side: Side): number {
	return side === "back" ? 180 : 0;
}

/** The face that shows at `angle`: the front until the Body is edge on. */
export function sideAt(angle: number): Side {
	const turned = ((angle % 360) + 360) % 360;
	return turned > 90 && turned < 270 ? "back" : "front";
}

/**
 * Where a Body at `angle`, resting on or turning to `target`, turns to
 * show `side`: on to the next half turn from rest, back to where it came
 * from when it is turned again mid-turn, and nowhere when it is already
 * headed there.
 */
export function turnTarget(angle: number, target: number, side: Side): number {
	if (sideAt(target) === side) return target;
	if (angle === target) return target + 180;
	return target - 180 * Math.sign(target - angle);
}

/** How far the Body is through a half turn, 0 flat, 1 edge on. */
function edgeOn(angle: number): number {
	return Math.abs(Math.sin((angle * Math.PI) / 180));
}

/** The scale the turning shell swells to at `angle`. */
export function turnLift(angle: number, lift: number): number {
	return Math.round((1 + lift * edgeOn(angle)) * 1e4) / 1e4;
}

/**
 * The turning element's transform at `angle`: turned about its axis in its
 * own perspective, swelling by the lift toward edge on. Under reduced
 * motion it stays flat; the front fades instead.
 */
export function turnTransform(
	angle: number,
	feel: TurnFeel,
	reduce: boolean,
): string {
	if (reduce) return "none";
	const rotate = feel.axis === "y" ? "rotateY" : "rotateX";
	return `perspective(${feel.perspective}px) ${rotate}(${angle}deg) scale(${turnLift(angle, feel.lift)})`;
}

/** The back's own transform: turned half round, so it faces away at 0. */
export function backTransform(feel: TurnFeel, reduce: boolean): string {
	if (reduce) return "none";
	return feel.axis === "y" ? "rotateY(180deg)" : "rotateX(180deg)";
}

/**
 * The front's opacity: solid while it turns, since the back hides behind
 * it; under reduced motion it fades out over the flat back as the angle
 * goes from face up to face down.
 */
export function frontOpacity(angle: number, reduce: boolean): number {
	if (!reduce) return 1;
	return (1 + Math.cos((angle * Math.PI) / 180)) / 2;
}
