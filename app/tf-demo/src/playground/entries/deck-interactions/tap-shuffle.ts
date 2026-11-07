import { ease } from "./deck-of-cards-ease";
import type { Slot } from "./geometry";

/**
 * A tap's reorder played as deck-of-cards' shuffle (`modules/shuffle` of
 * github.com/deck-of-cards/deck-of-cards, ported in tabletop's `shuffle`),
 * in that library's timing and structure: every leg 200 ms on cubicInOut,
 * each Card starting 2 ms × its new position late, and a Card's stacking
 * changing to its new place as its second leg starts. The tapped Card
 * slides out sideways, takes the front's place in the stack and slides
 * into the front slot; the Cards between it and the front move up a slot
 * on that second beat. Pure: the Deck plays it.
 */

export const LEG_MS = 200;
export const STAGGER_MS = 2;
/** Each half of a reduced move's dissolve: out where it shows, then in at its rest. */
export const DISSOLVE_MS = 100;

/** What a tap's shuffle moves: everything a slot places, and the lift. */
export const CHANNELS = ["u", "v", "w", "h", "r", "s", "lift"] as const;
export type Channel = (typeof CHANNELS)[number];

/** One step of a channel: `ms` long from `at` ms after its Card's move starts, to `to`. */
export type Leg = {
	readonly at: number;
	readonly ms: number;
	readonly to: number;
};

/** A Card's part of a tap's shuffle. */
export type CardMove = {
	readonly id: string;
	/** Its new place, 0 the back: its stacking from `zAtMs` on. */
	readonly index: number;
	/** When it starts, in ms after the tap. */
	readonly startMs: number;
	/**
	 * When it dissolves under reduced motion: every Card on the first beat,
	 * 2 ms × its new place apart, so the Deck shows its new order at once.
	 */
	readonly reducedStartMs: number;
	/** How long it runs from its start. */
	readonly ms: number;
	/** When, from its start, its stacking changes to its new place. */
	readonly zAtMs: number;
	/** Its legs per channel, timed from its start, none overlapping. */
	readonly legs: Readonly<Record<Channel, readonly Leg[]>>;
};

/** How far the tapped Card slides out: deck-of-cards' own reach, or a share of the Card. */
export const PULL_OUTS = [
	"off",
	"20–60 px",
	"⅓ card",
	"½ card",
	"⅔ card",
] as const;
export type PullOut = (typeof PULL_OUTS)[number];

/** Which way it slides: deck-of-cards picks a side at random. */
export const SIDES = ["inline-end", "inline-start", "random"] as const;
export type Side = (typeof SIDES)[number];

const SHARE: Readonly<Record<PullOut, number | null>> = {
	off: null,
	"20–60 px": null,
	"⅓ card": 1 / 3,
	"½ card": 1 / 2,
	"⅔ card": 2 / 3,
};

/** The page's root font size: deck-of-cards scales its reach by it over 16. */
const FONT_PX = 16;

/**
 * How far the tapped Card slides out along the inline axis, signed (+ is
 * inline-end), for a Card `width` px wide; null when the tap doesn't
 * shuffle. `random` stands in for `Math.random`, drawn as the library
 * draws it: the distance first, then the side.
 */
export function pullOutOf(
	pullOut: PullOut,
	side: Side,
	width: number,
	random: () => number = Math.random,
): number | null {
	if (pullOut === "off") return null;
	const share = SHARE[pullOut];
	const distance =
		share === null ? ((random() * 40 + 20) * FONT_PX) / 16 : width * share;
	if (side === "inline-end") return distance;
	if (side === "inline-start") return -distance;
	return Math.round(random()) ? -distance : distance;
}

function poseOf(slot: Slot): Readonly<Record<Channel, number>> {
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

function legsOf(
	steps: readonly {
		readonly at: number;
		readonly to: Readonly<Record<Channel, number>>;
	}[],
): Readonly<Record<Channel, readonly Leg[]>> {
	const legs = {} as Record<Channel, Leg[]>;
	for (const channel of CHANNELS)
		legs[channel] = steps.map(({ at, to }) => ({
			at,
			ms: LEG_MS,
			to: to[channel],
		}));
	return legs;
}

/**
 * The shuffle that brings `id` to the front of `order` (back to front),
 * over a pile resting at `slots`: the new order and each moving Card's
 * part, or null when `id` is already in front or not in the Deck. The
 * tapped Card goes `out` px along the inline axis from its slot, upright,
 * unlifted and at its slot's height and scale, then into the front slot;
 * the Cards that were in front of it go to the slot below theirs. The
 * Cards behind it don't move.
 */
export function tapShuffle({
	order,
	id,
	slots,
	out,
}: {
	readonly order: readonly string[];
	readonly id: string;
	readonly slots: readonly Slot[];
	readonly out: number;
}): {
	readonly order: readonly string[];
	readonly moves: readonly CardMove[];
} | null {
	const from = order.indexOf(id);
	const front = order.length - 1;
	const was = slots[from];
	const top = slots[front];
	if (from < 0 || from === front || !was || !top) return null;
	const next = [...order.filter((other) => other !== id), id];
	const pulled = { ...poseOf(was), u: was.u + out, r: 0 };
	const moves: CardMove[] = [
		{
			id,
			index: front,
			startMs: STAGGER_MS * front,
			reducedStartMs: STAGGER_MS * front,
			ms: 2 * LEG_MS,
			zAtMs: LEG_MS,
			legs: legsOf([
				{ at: 0, to: pulled },
				{ at: LEG_MS, to: poseOf(top) },
			]),
		},
	];
	for (let index = from; index < front; index++) {
		const other = next[index];
		const slot = slots[index];
		if (other === undefined || !slot) continue;
		moves.push({
			id: other,
			index,
			startMs: LEG_MS + STAGGER_MS * index,
			reducedStartMs: STAGGER_MS * index,
			ms: LEG_MS,
			zAtMs: 0,
			legs: legsOf([{ at: 0, to: poseOf(slot) }]),
		});
	}
	return { order: next, moves };
}

/** Where a move leaves each channel: its last leg's end. */
export function restOf(move: CardMove): Readonly<Record<Channel, number>> {
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
