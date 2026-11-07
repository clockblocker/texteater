import {
	type AnimationPlaybackControls,
	animate,
	type MotionValue,
} from "motion/react";
import {
	DECK_OF_CARDS,
	type MotionContext,
	REDUCED_TWEEN,
	transition,
} from "../deck-interactions/motion-kit";
import type { Side } from "./playing-cards";

/**
 * A Card's turn: one angle in degrees about its own axis, 0 face up, 180
 * face down, and on round the same way (360 is face up again). The face
 * that shows is read off the angle, so what the tricks see and what the
 * felt shows never disagree. Nothing here knows playing cards: any Card
 * with two sides can turn on it.
 */

/** How a turn plays: the inspector's knobs. */
export type TurnFeel = {
	/** The turn's length; 0 is today's instant face switch. */
	readonly ms: number;
	/** The viewer's distance in px, for the turn's perspective. */
	readonly perspective: number;
	/** How much bigger the Card is at the half turn, edge on: 0.06 is 6%. */
	readonly lift: number;
	/** The Card's own axis it turns about: its long one (y) or its short one (x). */
	readonly axis: "x" | "y";
};

export const DEFAULT_TURN: TurnFeel = {
	ms: 300,
	perspective: 600,
	lift: 0.06,
	axis: "y",
};

/** The face that shows at `angle`: the front until the Card is edge on. */
export function sideAt(angle: number): Side {
	const turned = ((angle % 360) + 360) % 360;
	return turned > 90 && turned < 270 ? "back" : "front";
}

/**
 * Where a Card at `angle`, resting on or turning to `target`, turns to
 * show `side`: on to the next half turn from rest, back to where it came
 * from when it is turned again mid-turn, and nowhere when it is already
 * headed there.
 */
export function turnTarget(angle: number, target: number, side: Side): number {
	if (sideAt(target) === side) return target;
	if (angle === target) return target + 180;
	return target - 180 * Math.sign(target - angle);
}

/**
 * Turns `value` to `to`: on the deck-of-cards curve over the feel's
 * length, at once when it has none, or, under reduced motion, in the
 * short tween `settle` uses, which the faces show as a crossfade.
 */
export function turnTo(
	value: MotionValue<number>,
	to: number,
	feel: TurnFeel,
	context: MotionContext,
): AnimationPlaybackControls | undefined {
	if (feel.ms <= 0) {
		value.jump(to);
		return undefined;
	}
	return animate(
		value,
		to,
		transition(
			context.reduce
				? REDUCED_TWEEN
				: { ms: feel.ms, ease: DECK_OF_CARDS.ease },
			context,
		),
	);
}

/** How far the Card is through a half turn, 0 flat, 1 edge on. */
function edgeOn(angle: number): number {
	return Math.abs(Math.sin((angle * Math.PI) / 180));
}

/**
 * The turning element's transform at `angle`: the Card turned about its
 * axis in its own perspective, swelling by the lift toward edge on. Under
 * reduced motion it stays flat; the front fades instead.
 */
export function turnTransform(
	angle: number,
	feel: TurnFeel,
	reduce: boolean,
): string {
	if (reduce) return "none";
	const rotate = feel.axis === "y" ? "rotateY" : "rotateX";
	const scale = Math.round((1 + feel.lift * edgeOn(angle)) * 1e4) / 1e4;
	return `perspective(${feel.perspective}px) ${rotate}(${angle}deg) scale(${scale})`;
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
