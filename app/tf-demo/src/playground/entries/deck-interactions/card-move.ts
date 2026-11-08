import { ease } from "./deck-of-cards-ease";
import type { Slot } from "./geometry";

/**
 * A Card's move as a pure plan, in deck-of-cards' terms (`modules/shuffle`
 * of github.com/deck-of-cards/deck-of-cards, ported in tabletop's
 * `trick`): legs on cubicInOut per channel, and when the Card restacks.
 * A tap's shuffle is a set of these; the Deck's player plays them on one
 * clock from where each Card shows.
 */

/** Each half of a reduced move's dissolve: out where it shows, then in at its rest. */
export const DISSOLVE_MS = 100;

/** What a move moves: everything a slot places, and the lift. */
export const CHANNELS = ["u", "v", "w", "h", "r", "s", "lift"] as const;
export type Channel = (typeof CHANNELS)[number];

/** A value for every channel: a Card's pose. */
export type Pose = Readonly<Record<Channel, number>>;

/** One step of a channel: `ms` long from `at` ms after its Card's move starts, to `to`. */
export type Leg = {
	readonly at: number;
	readonly ms: number;
	readonly to: number;
};

/** A Card's part of a move of the Deck, such as a tap's shuffle. */
export type CardMove = {
	readonly id: string;
	/** Its new place, 0 the back: its stacking from `zAtMs` on. */
	readonly index: number;
	/** When it starts, in ms after the move does. */
	readonly startMs: number;
	/**
	 * When it dissolves under reduced motion: for a shuffle, every Card on
	 * the first beat, 2 ms × its new place apart, so the Deck shows its new
	 * order at once.
	 */
	readonly reducedStartMs: number;
	/** How long it runs from its start. */
	readonly ms: number;
	/** When, from its start, its stacking changes to its new place. */
	readonly zAtMs: number;
	/** Whether it rides above every Card in the Deck from its start until `zAtMs`. */
	readonly lifted: boolean;
	/** Its legs per channel, timed from its start, none overlapping. */
	readonly legs: Readonly<Record<Channel, readonly Leg[]>>;
};

/** A slot as a pose, set down: no lift. */
export function poseOf(slot: Slot): Pose {
	return {
		u: slot.u,
		v: slot.v,
		w: slot.w,
		h: slot.h,
		r: slot.r,
		s: slot.s,
		lift: 0,
	};
}

/** Steps that move every channel together, each to its own pose, as legs per channel. */
export function legsOf(
	steps: readonly {
		readonly at: number;
		readonly ms: number;
		readonly to: Pose;
	}[],
): Readonly<Record<Channel, readonly Leg[]>> {
	const legs = {} as Record<Channel, Leg[]>;
	for (const channel of CHANNELS)
		legs[channel] = steps.map(({ at, ms, to }) => ({
			at,
			ms,
			to: to[channel],
		}));
	return legs;
}

/** Where a move leaves each channel: its last leg's end. */
export function restOf(move: CardMove): Pose {
	const rest = {} as Record<Channel, number>;
	for (const channel of CHANNELS) {
		const last = move.legs[channel].at(-1);
		if (last) rest[channel] = last.to;
	}
	return rest;
}

/**
 * `legs` as one keyframed tween from `from`: its keyframes, when each
 * falls as a share of the whole, the curve of each stretch between them
 * (cubicInOut for a leg, still for a gap) and its length in ms. A gap
 * before the first leg or between two holds the value where it is.
 */
export function keyframesOf(
	from: number,
	legs: readonly Leg[],
): {
	readonly keyframes: readonly number[];
	readonly times: readonly number[];
	readonly eases: readonly ((t: number) => number)[];
	readonly ms: number;
} {
	const keyframes = [from];
	const at = [0];
	const eases: ((t: number) => number)[] = [];
	let clock = 0;
	for (const leg of legs) {
		if (leg.at > clock) {
			keyframes.push(keyframes.at(-1) as number);
			at.push(leg.at);
			eases.push(ease.linear);
		}
		clock = Math.max(clock, leg.at + leg.ms);
		keyframes.push(leg.to);
		at.push(clock);
		eases.push(ease.cubicInOut);
	}
	if (clock <= 0)
		return {
			keyframes: [from, from],
			times: [0, 1],
			eases: [ease.linear],
			ms: 0,
		};
	return {
		keyframes,
		times: at.map((time) => time / clock),
		eases,
		ms: clock,
	};
}
