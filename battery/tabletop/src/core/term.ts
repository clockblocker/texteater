import { spring } from "motion";
import type { Ease } from "./ease";

/**
 * What a Term moves. The box is physical CSS px; `rotate`, `turn`, `tiltX`
 * and `tiltY` are degrees; `lift` is a share of the Body's size (0.06 is 6%
 * bigger); `z` is stacking order; `opacity` is added to 1; `glare` is how
 * lit a Body's glare is, 0 to 1.
 */
export type Channel =
	| "x"
	| "y"
	| "width"
	| "height"
	| "rotate"
	| "lift"
	| "z"
	| "turn"
	| "tiltX"
	| "tiltY"
	| "opacity"
	| "glare";

export const BOX_CHANNELS = ["x", "y", "width", "height"] as const;

type SpringCurve = {
	readonly kind: "spring";
	readonly stiffness: number;
	readonly damping: number;
	/** Channel units per second at the Term's start: given, never inferred. */
	readonly velocity: number;
};

export type TweenCurve = {
	readonly kind: "tween";
	readonly ms: number;
	/** One curve for the whole tween, or one for each leg between keyframes. */
	readonly ease: Ease | readonly Ease[];
	/**
	 * Waypoints as multiples of the delta, from the start to the end. The
	 * default is `[1, 0]`; a Term is 0 once its tween is over whatever the
	 * last waypoint says, so `[1, 1]` holds the delta and then drops it.
	 */
	readonly keyframes?: readonly number[];
	/** When each keyframe falls, 0 to 1; evenly spread by default. */
	readonly times?: readonly number[];
};

export type Curve = SpringCurve | TweenCurve;

/**
 * One offset from a Body's rest that decays to nothing. It holds its
 * starting value until `delayMs` after it is born, then follows its curve
 * to 0. A Body shows its rest plus the sum of its live Terms.
 */
export type Term = {
	readonly channel: Channel;
	readonly delta: number;
	readonly curve: Curve;
	readonly delayMs: number;
	readonly bornAt: number;
	/** Who started the move: the hand, or the app (#1309 Q2). */
	readonly source: "hand" | "app";
	/** Whether the Body stays raised over the others while this lives. */
	readonly raise?: boolean;
};

type Generator = ReturnType<typeof spring>;
const generators = new WeakMap<Term, Generator>();

function generatorOf(term: Term & { readonly curve: SpringCurve }) {
	let generator = generators.get(term);
	if (!generator) {
		generator = spring({
			keyframes: [term.delta, 0],
			velocity: term.curve.velocity,
			stiffness: term.curve.stiffness,
			damping: term.curve.damping,
		});
		generators.set(term, generator);
	}
	return generator;
}

function isSpring(term: Term): term is Term & { readonly curve: SpringCurve } {
	return term.curve.kind === "spring";
}

/** The waypoint share a tween shows at `progress`, 0 to 1. */
export function shareAt(curve: TweenCurve, progress: number): number {
	const keys = curve.keyframes ?? [1, 0];
	const last = keys.length - 1;
	if (last <= 0) return keys[0] ?? 0;
	const times = curve.times ?? keys.map((_, index) => index / last);
	for (let index = 0; index < last; index++) {
		const end = times[index + 1] ?? 1;
		if (progress >= end && index < last - 1) continue;
		const start = times[index] ?? 0;
		const span = end - start;
		const local =
			span <= 0 ? 1 : Math.min(1, Math.max(0, (progress - start) / span));
		const ease =
			typeof curve.ease === "function"
				? curve.ease
				: (curve.ease[index] ?? ((t: number) => t));
		const from = keys[index] ?? 0;
		const to = keys[index + 1] ?? 0;
		return from + (to - from) * ease(local);
	}
	return keys[last] ?? 0;
}

/** The share of its delta a Term starts at. */
export function startShare(curve: Curve): number {
	return curve.kind === "tween" ? (curve.keyframes?.[0] ?? 1) : 1;
}

/** The offset `term` holds at `now`, in its channel's units. */
export function valueAt(term: Term, now: number): number {
	const t = now - term.bornAt - term.delayMs;
	if (t <= 0) return term.delta * startShare(term.curve);
	if (isSpring(term)) {
		const state = generatorOf(term).next(t);
		return state.done ? 0 : state.value;
	}
	const curve = term.curve as TweenCurve;
	if (t >= curve.ms) return 0;
	return term.delta * shareAt(curve, t / curve.ms);
}

/** How fast `term` changes at `now`, in channel units per second. */
export function velocityAt(term: Term, now: number): number {
	const t = now - term.bornAt - term.delayMs;
	if (t < 0) return 0;
	if (isSpring(term)) {
		const generator = generatorOf(term);
		if (generator.next(t).done) return 0;
		return generator.velocity?.(t) ?? 0;
	}
	const curve = term.curve as TweenCurve;
	if (t >= curve.ms) return 0;
	const h = Math.min(0.5, curve.ms / 4);
	const before = Math.max(0, t - h);
	const after = Math.min(curve.ms, t + h);
	const shares =
		shareAt(curve, after / curve.ms) - shareAt(curve, before / curve.ms);
	return (term.delta * shares * 1000) / (after - before);
}

/** Whether `term` has reached 0 for good. */
export function done(term: Term, now: number): boolean {
	const t = now - term.bornAt - term.delayMs;
	if (t <= 0) return false;
	if (isSpring(term)) return generatorOf(term).next(t).done;
	return t >= (term.curve as TweenCurve).ms;
}

/** Whether none of `terms` moves any more. */
export function settled(terms: readonly Term[], now: number): boolean {
	return terms.every((term) => done(term, now));
}

/** The sum of the live offsets on `channel` at `now`. */
export function sumAt(
	terms: readonly Term[],
	channel: Channel,
	now: number,
): number {
	let sum = 0;
	for (const term of terms)
		if (term.channel === channel) sum += valueAt(term, now);
	return sum;
}

/**
 * How long after its birth `term` first comes within `1 - share` of its
 * end, in ms: when a move is "most of the way there".
 */
export function timeToShare(term: Term, share: number): number {
	const target = Math.abs(term.delta * startShare(term.curve)) * (1 - share);
	for (let t = 0; t < 4000; t += 8) {
		const now = term.bornAt + term.delayMs + t;
		if (Math.abs(valueAt(term, now)) <= target || done(term, now))
			return term.delayMs + t;
	}
	return term.delayMs + 4000;
}
