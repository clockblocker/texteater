import type { Ease } from "./ease";
import type { Leg, Move, Path, Pose } from "./move";
import type { Posed, Side } from "./place";
import { DECK_OF_CARDS } from "./springs";
import type { Channel } from "./term";

/**
 * A Trick as a plan: a new order, rest and sides for the Deck, and for each
 * Card the waypoints it passes on the way there. Nobody sees a waypoint
 * still, so it is not a Place: it is an offset from the Card's final rest,
 * in rem and logical degrees, and the Table plays it as Terms.
 */

/** An offset from a Card's final rest: rem, logical degrees, opacity. */
export type TrickOffset = {
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
	/**
	 * Where the Card starts, unseen before; otherwise from where it shows.
	 * `turn` is degrees off its final side's angle: −180 shows the other
	 * side until the turn at `sideAt`.
	 */
	readonly from?: TrickOffset & { readonly turn?: number };
	readonly legs: readonly TrickLeg[];
	/** When its stacking order changes to its final one. */
	readonly zAt?: number;
	/** When it starts turning to its final side. */
	readonly sideAt?: number;
};

/**
 * A Deck's new order (bottom first), rest and sides, and how each Card
 * gets there. `sides` names the Cards the Trick turns over, and the side
 * each ends on; the app's commit gives them those Places.
 */
export type Trick = {
	readonly order: readonly string[];
	readonly rest: readonly Posed[];
	readonly sides?: ReadonlyMap<string, Side>;
	readonly moves: ReadonlyMap<string, TrickMove>;
};

/** The Deck's resting pose for an order: `pile`, `fan` or another pose. */
export type PoseOf = (order: readonly string[]) => readonly Posed[];

export function trickOf(
	order: readonly string[],
	rest: readonly Posed[],
	move: (posed: Posed, i: number) => TrickMove,
	sides?: ReadonlyMap<string, Side>,
): Trick {
	return {
		order,
		rest,
		...(sides ? { sides } : {}),
		moves: new Map(rest.map((posed, i) => [posed.id, move(posed, i)])),
	};
}

/** Every Card of `order` ending on `side`. */
export function allOn(order: readonly string[], side: Side) {
	return new Map(order.map((id) => [id, side]));
}

export const AT_REST: TrickOffset = { u: 0, v: 0, rotate: 0 };

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
 * physical px and degrees, mirrored once here for RTL. The turn stays
 * logical: the Shell mirrors it.
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
	if (move.from?.turn !== undefined) from.turn = move.from.turn;
	return {
		source: "app",
		tween: DECK_OF_CARDS.move,
		path: path as Path,
		...(move.from ? { from } : {}),
		...(move.zAt === undefined ? {} : { zAt: move.zAt }),
		...(move.sideAt === undefined ? {} : { sideAt: move.sideAt }),
	};
}
