import {
	type AnimationPlaybackControls,
	type AnimationPlaybackControlsWithThen,
	animate,
	delay,
	type MotionValue,
} from "motion/react";
import { ease as deckOfCardsEase } from "../deck-of-cards/ease";

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
export const REDUCED_TWEEN = { ms: 140 };
const EASE_OUT_QUINT = [0.23, 1, 0.32, 1] as const;
/** iOS's drawer curve (Ionic): a softer start than the quint, for a reduced move that travels far. */
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;
/** A reduced exit moves at most this far while it fades. */
export const REDUCED_EXIT_PX = 24;
export const REDUCED_EXIT_MS = 180;

/** A curve: a cubic Bézier, or a function of the linear time fraction. */
type Easing =
	| readonly [number, number, number, number]
	| ((t: number) => number);

/** Whether `ease` names a curve per leg rather than one curve. */
function isPerLeg(
	ease: NonNullable<TweenSpec["ease"]>,
): ease is readonly ((t: number) => number)[] {
	return typeof ease !== "function" && typeof ease[0] === "function";
}

/**
 * A tween in this page's terms: its length in ms, on the ease-out quint
 * unless it names another curve. A keyframed tween names when each
 * keyframe falls (`times`, 0 to 1) and a curve for each leg between them.
 */
export type TweenSpec = {
	readonly ms: number;
	readonly ease?: Easing | readonly ((t: number) => number)[];
	readonly times?: readonly number[];
};

/** A spec held back `delayMs` before it starts, as a staggered arrival is. */
type Delayed<S> = S & { readonly delayMs?: number };

/**
 * The transition `spec` makes on this page: slowed by `timeScale`. A
 * spring's stiffness is scaled by its square and its damping by it, which
 * keeps the damping ratio and stretches the period; its velocity (px/s)
 * and any delay are slowed the same way. Every move here is a `SPRINGS`
 * entry, a knob or a tween the spec names, passed through this.
 */
export function transition(
	spec: Delayed<SpringSpec> | Delayed<TweenSpec>,
	context: MotionContext,
	velocity?: number,
) {
	const s = context.timeScale;
	const delay = spec.delayMs ? { delay: spec.delayMs / 1000 / s } : {};
	if ("ms" in spec) {
		const ease = spec.ease ?? EASE_OUT_QUINT;
		return {
			type: "tween" as const,
			duration: spec.ms / 1000 / s,
			ease: isPerLeg(ease) ? [...ease] : ease,
			...(spec.times ? { times: [...spec.times] } : {}),
			...delay,
		};
	}
	return {
		type: "spring" as const,
		stiffness: spec.stiffness * s * s,
		damping: spec.damping * s,
		...(velocity === undefined ? {} : { velocity: velocity * s }),
		...delay,
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

/**
 * pakastin's deck-of-cards' motion, a profile beside `SPRINGS`: every move
 * a tween of fixed length on that library's own ease functions, handed to
 * Motion as they are, cubicInOut unless a move names another. A variant
 * takes it up by passing `phases` where it now passes a spring.
 */
export const DECK_OF_CARDS = {
	ease: deckOfCardsEase.cubicInOut,
	linear: deckOfCardsEase.linear,
} as const;

/** One leg of a move: `ms` long from `at` ms after the move is called, to `to`. */
export type Phase = {
	readonly at: number;
	readonly ms: number;
	readonly to: number;
	readonly ease?: (t: number) => number;
};

/**
 * Plays `legs` (in order, none overlapping) on `value` as one keyframed
 * tween on Motion's clock, from where `value` is now: a gap between legs
 * holds still, and the first leg's `at` is the delay. Under reduced motion
 * it is the short tween instead, from the same moment to the last leg's
 * end value, as `settle` does.
 */
export function phases(
	value: MotionValue<number>,
	legs: readonly Phase[],
	context: MotionContext,
): AnimationPlaybackControlsWithThen {
	const first = legs[0];
	const last = legs.at(-1);
	if (!first || !last)
		return animate(value, value.get(), transition({ ms: 0 }, context));
	if (context.reduce)
		return animate(
			value,
			last.to,
			transition({ ...REDUCED_TWEEN, delayMs: first.at }, context),
		);
	const keyframes = [value.get()];
	const times = [0];
	const eases: ((t: number) => number)[] = [];
	let clock = first.at;
	for (const leg of legs) {
		if (leg.at > clock) {
			keyframes.push(keyframes.at(-1) as number);
			times.push(leg.at - first.at);
			eases.push(DECK_OF_CARDS.linear);
		}
		clock = leg.at + leg.ms;
		keyframes.push(leg.to);
		times.push(clock - first.at);
		eases.push(leg.ease ?? DECK_OF_CARDS.ease);
	}
	const total = clock - first.at;
	if (total <= 0)
		return animate(value, last.to, transition({ ms: 0 }, context));
	return animate(
		value,
		keyframes,
		transition(
			{
				ms: total,
				delayMs: first.at,
				times: times.map((time) => time / total),
				ease: eases,
			},
			context,
		),
	);
}

/**
 * Calls `fn` `ms` of slowed time from now, on Motion's frame loop, so it
 * lands in the same frame as a tween timed from the same call. Returns its
 * cancel.
 */
export function cue(
	ms: number,
	fn: () => void,
	context: MotionContext,
): () => void {
	if (ms <= 0) {
		fn();
		return () => {};
	}
	return delay(fn, ms / context.timeScale);
}
