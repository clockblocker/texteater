import {
	type AnimationPlaybackControls,
	animate,
	type MotionValue,
} from "motion/react";

/**
 * How motion plays on this page: whether it is reduced, and the slow-mo
 * time scale (1 is real time, 0.25 four times slower).
 */
export type MotionContext = {
	readonly reduce: boolean;
	readonly timeScale: number;
};

/** A spring in Motion's terms, mass 1. */
export type SpringSpec = {
	readonly stiffness: number;
	readonly damping: number;
};

export const SPRINGS = {
	/** Pick-up, back and the D return: response 0.25, ζ 1. */
	settle: { stiffness: 632, damping: 50 },
	/** Hover fan and gap closing: response 0.3, ζ 0.8. */
	reflow: { stiffness: 438, damping: 34 },
	/** Exits. */
	fly: { stiffness: 360, damping: 38 },
	/** A Card into the Cover and back. */
	morph: { stiffness: 380, damping: 38 },
	/** The lean under the hand. */
	tilt: { stiffness: 300, damping: 22 },
	/** B's pick-up: response 0.25, ζ 0.65, so the lift lands with a little give. */
	pop: { stiffness: 632, damping: 33 },
} as const satisfies Record<string, SpringSpec>;

/** The reduced path's system-driven move: short, never a jump. */
const REDUCED_TWEEN = { ms: 140 };
const EASE_OUT_QUINT = [0.23, 1, 0.32, 1] as const;
/** iOS's drawer curve (Ionic): a softer start than the quint, for a reduced move that travels far. */
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;
/** A reduced exit moves at most this far while it fades. */
export const REDUCED_EXIT_PX = 24;
export const REDUCED_EXIT_MS = 180;

/** A tween in this page's terms: its length in ms, on the ease-out quint unless it names another curve. */
export type TweenSpec = {
	readonly ms: number;
	readonly ease?: readonly [number, number, number, number];
};

/**
 * The transition `spec` makes on this page: slowed by `timeScale`. A
 * spring's stiffness is scaled by its square and its damping by it, which
 * keeps the damping ratio and stretches the period; its velocity (px/s) is
 * slowed the same way. Every move here is a `SPRINGS` entry, a knob or a
 * tween the spec names, passed through this.
 */
export function transition(
	spec: SpringSpec | TweenSpec,
	context: MotionContext,
	velocity?: number,
) {
	const s = context.timeScale;
	if ("ms" in spec)
		return {
			type: "tween" as const,
			duration: spec.ms / 1000 / s,
			ease: spec.ease ?? EASE_OUT_QUINT,
		};
	return {
		type: "spring" as const,
		stiffness: spec.stiffness * s * s,
		damping: spec.damping * s,
		...(velocity === undefined ? {} : { velocity: velocity * s }),
	};
}

/**
 * Moves `value` to `to` on `spec`, interrupting whatever drove it. Under
 * reduced motion a system-driven move is the short tween instead, over the
 * true distance.
 */
export function settle(
	value: MotionValue<number>,
	to: number,
	spec: SpringSpec,
	context: MotionContext,
	velocity?: number,
): AnimationPlaybackControls {
	return animate(
		value,
		to,
		transition(context.reduce ? REDUCED_TWEEN : spec, context, velocity),
	);
}

/** A spring even under reduced motion: for motion the hand drives. */
export function follow(
	value: MotionValue<number>,
	to: number,
	spec: SpringSpec,
	context: MotionContext,
): AnimationPlaybackControls {
	return animate(value, to, transition(spec, context));
}

/** A tween of `ms`, slowed by the time scale. */
export function tweenTo(
	value: MotionValue<number>,
	to: number,
	ms: number,
	context: MotionContext,
): AnimationPlaybackControls {
	return animate(value, to, transition({ ms }, context));
}

/** Waits `ms` of slowed time. */
export function wait(ms: number, context: MotionContext): Promise<void> {
	return new Promise((resolve) =>
		setTimeout(resolve, ms / context.timeScale),
	);
}
