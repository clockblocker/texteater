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

/** A spring the share runs on, mass 1. */
type SpringCurve = {
	readonly kind: "spring";
	readonly stiffness: number;
	readonly damping: number;
	/**
	 * How fast the share heads for 0 at the start, in shares per second:
	 * 0 from rest, and for a release the part of the hand's speed aimed at
	 * the rest. Given, never inferred.
	 */
	readonly rate: number;
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

/**
 * How a Term's share of its delta runs from its start to 0. A curve says
 * nothing about a channel or a distance, so one curve object can drive
 * every Term of a Move: the box's channels, its Parts' offsets and the
 * tilt it lets go then ride one progress (#1311 rule 1).
 */
export type Curve = SpringCurve | TweenCurve;

/**
 * One offset from a Body's rest that decays to nothing: its delta times
 * its curve's share. It holds its starting value until `delayMs` after it
 * is born, then follows its curve to 0. A Body shows its rest plus the sum
 * of its live Terms.
 */
export type Term = {
	readonly channel: Channel;
	readonly delta: number;
	readonly curve: Curve;
	readonly delayMs: number;
	/** When its clock started, or `UNSTARTED` while the Table holds it. */
	readonly bornAt: number;
	/** Who started the move: the hand, or the app (#1309 Q2). */
	readonly source: "hand" | "app";
	/** Whether the Body stays raised over the others while this lives. */
	readonly raise?: boolean;
};

/**
 * The birth of a Term whose clock the Table hasn't started: it holds its
 * start until `startTerms` gives it one.
 */
export const UNSTARTED = Number.POSITIVE_INFINITY;

/**
 * A share is done once it stays this close to 0 and moves this slowly
 * (per second): a 900 px move ends within 0.09 px, so no channel snaps
 * visibly at its end, and every channel on one curve ends together
 * (#1311 rule 9).
 */
const PROGRESS_REST = { restDelta: 1e-4, restSpeed: 1e-3 } as const;

type Generator = ReturnType<typeof spring>;
const generators = new WeakMap<SpringCurve, Generator>();

function generatorOf(curve: SpringCurve): Generator {
	let generator = generators.get(curve);
	if (!generator) {
		generator = spring({
			keyframes: [1, 0],
			velocity: -curve.rate,
			stiffness: curve.stiffness,
			damping: curve.damping,
			...PROGRESS_REST,
		});
		generators.set(curve, generator);
	}
	return generator;
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

/** Whether a curve passes waypoints rather than running straight to 0. */
export function keyframed(curve: Curve): boolean {
	return curve.kind === "tween" && (curve.keyframes?.length ?? 2) > 2;
}

/** The share `curve` shows `t` ms into its run. */
export function shareAfter(curve: Curve, t: number): number {
	if (t <= 0) return startShare(curve);
	if (curve.kind === "spring") {
		const state = generatorOf(curve).next(t);
		return state.done ? 0 : state.value;
	}
	if (t >= curve.ms) return 0;
	return shareAt(curve, t / curve.ms);
}

/** How long `term` has run at `now`: negative before its delay, -∞ unstarted. */
function elapsed(term: Term, now: number): number {
	return now - term.bornAt - term.delayMs;
}

/** The offset `term` holds at `now`, in its channel's units. */
export function valueAt(term: Term, now: number): number {
	const share = shareAfter(term.curve, elapsed(term, now));
	return share === 0 ? 0 : term.delta * share;
}

/** How fast `term` changes at `now`, in channel units per second. */
export function velocityAt(term: Term, now: number): number {
	const t = elapsed(term, now);
	if (t < 0) return 0;
	const curve = term.curve;
	if (curve.kind === "spring") {
		const generator = generatorOf(curve);
		if (generator.next(t).done) return 0;
		return term.delta * (generator.velocity?.(t) ?? 0);
	}
	if (t >= curve.ms) return 0;
	const h = Math.min(0.5, curve.ms / 4);
	const before = Math.max(0, t - h);
	const after = Math.min(curve.ms, t + h);
	const shares =
		shareAt(curve, after / curve.ms) - shareAt(curve, before / curve.ms);
	return (term.delta * shares * 1000) / (after - before);
}

function doneAfter(curve: Curve, t: number): boolean {
	if (t <= 0) return false;
	if (curve.kind === "spring") return generatorOf(curve).next(t).done;
	return t >= curve.ms;
}

/** Whether `term` has reached 0 for good. */
export function done(term: Term, now: number): boolean {
	return doneAfter(term.curve, elapsed(term, now));
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
	const start = Math.abs(startShare(term.curve));
	for (let t = 0; t < 4000; t += 8)
		if (
			Math.abs(shareAfter(term.curve, t)) <= start * (1 - share) ||
			doneAfter(term.curve, t)
		)
			return term.delayMs + t;
	return term.delayMs + 4000;
}

/** `terms`, with every one the Table held started at `at`. */
export function startTerms(terms: readonly Term[], at: number): Term[] {
	return terms.map((term) =>
		term.bornAt === UNSTARTED ? { ...term, bornAt: at } : term,
	);
}
