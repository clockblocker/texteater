import type { Ease } from "./ease";
import type { Logical } from "./geometry";
import type { Leg, Move, Path, Pose } from "./move";
import type { Posed } from "./place";
import { STACK_STEP } from "./poses";
import { DECK_OF_CARDS } from "./springs";
import type { Channel } from "./term";

/**
 * deck-of-cards' tricks as plans, with every number the library's own
 * (`lib/modules/*.js` at 54f2c4787ea5, MIT, `LICENSE-deck-of-cards`): a new
 * order and resting pose for the Deck, and for each Card the waypoints it
 * passes on the way there. Nobody sees a waypoint still, so it is not a
 * Place: it is an offset from the Card's final rest, in rem and logical
 * degrees, and the Table plays it as Terms. The library's px are rem at its
 * 16 px root; `scale` sizes them to Cards bigger than its 62 × 88 px ones.
 */

/** An offset from a Card's final rest: rem, logical degrees, opacity. */
type TrickOffset = {
	readonly u?: number;
	readonly v?: number;
	readonly w?: number;
	readonly h?: number;
	readonly rotate?: number;
	readonly opacity?: number;
};

/** A step `ms` long from `at` ms, moving every channel `to` names together. */
export type TrickLeg = {
	readonly at: number;
	readonly ms: number;
	readonly to: TrickOffset;
	readonly ease?: Ease;
};

export type TrickMove = {
	/** Where the Card starts, unseen before; otherwise from where it shows. */
	readonly from?: TrickOffset;
	readonly legs: readonly TrickLeg[];
	/** When its stacking order changes to its final one. */
	readonly zAt?: number;
	/** When it starts turning to its final side. */
	readonly sideAt?: number;
};

/** A Deck's new order (bottom first) and rest, and how each Card gets there. */
export type Trick = {
	readonly order: readonly string[];
	readonly rest: readonly Posed[];
	readonly moves: ReadonlyMap<string, TrickMove>;
};

/** The Deck's resting pose for an order: `pile`, `fan` or another pose. */
export type PoseOf = (order: readonly string[]) => readonly Posed[];

function trickOf(
	order: readonly string[],
	rest: readonly Posed[],
	move: (posed: Posed, i: number) => TrickMove,
): Trick {
	return {
		order,
		rest,
		moves: new Map(rest.map((posed, i) => [posed.id, move(posed, i)])),
	};
}

const AT_REST: TrickOffset = { u: 0, v: 0, rotate: 0 };

/**
 * The intro: every Card drops from 250 px above its rest, fading in over
 * the 1000 ms fall, 500 ms plus 10 ms a Card after the start. With
 * `faceDown` it turns over 250 ms after it lands, as the library's does.
 */
export function deal(
	order: readonly string[],
	poseOf: PoseOf,
	{
		scale = 1,
		faceDown = false,
	}: { readonly scale?: number; readonly faceDown?: boolean } = {},
): Trick {
	return trickOf(order, poseOf(order), (_, i) => {
		const at = 500 + i * 10;
		return {
			from: {
				u: 0,
				v: (-250 / 16) * scale,
				w: 0,
				h: 0,
				rotate: 0,
				opacity: -1,
			},
			legs: [
				{ at, ms: 1000, to: { u: 0, v: 0 } },
				{
					at,
					ms: 1000,
					to: { opacity: 0 },
					ease: DECK_OF_CARDS.linear,
				},
			],
			zAt: at,
			...(faceDown ? { sideAt: at + 1250 } : {}),
		};
	});
}

/**
 * Gathers the Deck onto `gather` (rem from the Region's centre) in 300 ms,
 * 10 ms a Card apart, then spreads it into the fan in another 300.
 */
export function fanOut(
	order: readonly string[],
	poseOf: PoseOf,
	{ gather = { u: 0, v: 0 } }: { readonly gather?: Logical } = {},
): Trick {
	return trickOf(order, poseOf(order), (posed, i) => {
		const at = i * 10;
		return {
			legs: [
				{
					at,
					ms: 300,
					to: {
						u: gather.u + i * STACK_STEP.u - posed.centre.u,
						v: gather.v + i * STACK_STEP.v - posed.centre.v,
						rotate: -posed.rotate,
					},
				},
				{ at: 300 + at, ms: 300, to: AT_REST },
			],
			zAt: 300 + at,
		};
	});
}

/** Fisher–Yates over `order`, drawing as the library draws. */
function reorder(
	order: readonly string[],
	random: () => number,
): readonly string[] {
	const next = [...order];
	for (let i = next.length - 1; i; i--) {
		const j = Math.floor(random() * (i + 1));
		[next[i], next[j]] = [next[j] as string, next[i] as string];
	}
	return next;
}

/**
 * Reorders the Deck at random and slides each Card 20–60 px to a random
 * side and back into its new place, 200 ms each way, 2 ms a Card apart.
 * `random` stands in for `Math.random`, drawn in the library's order: the
 * reorder first, then per Card the distance and then the side.
 */
export function shuffle(
	order: readonly string[],
	poseOf: PoseOf,
	{
		scale = 1,
		random = Math.random,
	}: { readonly scale?: number; readonly random?: () => number } = {},
): Trick {
	const next = reorder(order, random);
	return trickOf(next, poseOf(next), (posed, i) => {
		const at = i * 2;
		const distance = random() * 40 + 20;
		const sign = Math.round(random()) ? -1 : 1;
		return {
			legs: [
				{
					at,
					ms: 200,
					to: {
						u: (sign * distance * scale) / 16,
						v: 0,
						rotate: -posed.rotate,
					},
				},
				{ at: at + 200, ms: 200, to: AT_REST },
			],
			zAt: at + 200,
		};
	});
}

/**
 * Orders the Deck by `rank`, highest at the bottom (`reverse`: lowest),
 * each Card lifted to 150 px above `gather` in 400 ms, restacked there,
 * and put down from 500 ms; 10 ms a Card apart.
 */
export function sort(
	order: readonly string[],
	poseOf: PoseOf,
	{
		rank,
		reverse = false,
		scale = 1,
		gather = { u: 0, v: 0 },
	}: {
		readonly rank: (id: string) => number;
		readonly reverse?: boolean;
		readonly scale?: number;
		readonly gather?: Logical;
	},
): Trick {
	const next = [...order].sort((a, b) =>
		reverse ? rank(a) - rank(b) : rank(b) - rank(a),
	);
	return trickOf(next, poseOf(next), (posed, i) => {
		const at = i * 10;
		return {
			legs: [
				{
					at,
					ms: 400,
					to: {
						u: 0,
						v: gather.v - (150 * scale) / 16 - posed.centre.v,
						rotate: -posed.rotate,
					},
				},
				{ at: at + 500, ms: 400, to: AT_REST },
			],
			zAt: at + 400,
		};
	});
}

const CHANNEL_OF = {
	u: "x",
	v: "y",
	w: "width",
	h: "height",
	rotate: "rotate",
	opacity: "opacity",
} as const satisfies Record<keyof TrickOffset, Channel>;

/** The page a Trick plays on: the root size in px and the writing direction. */
export type Frame = { readonly remPx: number; readonly dir: 1 | -1 };

function physical(key: keyof TrickOffset, value: number, frame: Frame) {
	if (key === "u") return value * frame.remPx * frame.dir;
	if (key === "v" || key === "w" || key === "h") return value * frame.remPx;
	if (key === "rotate") return value * frame.dir;
	return value;
}

const KEYS = Object.keys(CHANNEL_OF) as (keyof TrickOffset)[];

/**
 * A Card's part of a Trick as the Move the Table plays: its waypoints in
 * physical px and degrees, mirrored once here for RTL.
 */
export function trickMove(move: TrickMove, frame: Frame): Move {
	const path: Partial<Record<Channel, Leg[]>> = {};
	const from: Pose = {};
	for (const key of KEYS) {
		const channel = CHANNEL_OF[key];
		const legs = move.legs.flatMap(({ at, ms, to, ease }) => {
			const value = to[key];
			if (value === undefined) return [];
			return [
				{
					at,
					ms,
					to: physical(key, value, frame),
					...(ease ? { ease } : {}),
				},
			];
		});
		if (legs.length > 0) path[channel] = legs;
		const start = move.from?.[key];
		if (start !== undefined) from[channel] = physical(key, start, frame);
	}
	return {
		source: "app",
		tween: DECK_OF_CARDS.move,
		path: path as Path,
		...(move.from ? { from } : {}),
		...(move.zAt === undefined ? {} : { zAt: move.zAt }),
		...(move.sideAt === undefined ? {} : { sideAt: move.sideAt }),
	};
}
