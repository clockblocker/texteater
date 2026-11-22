import { type Curve, doneAfter, lengthOf, progressAfter } from "./curve";
import { type Shape, shareAt } from "./shape";

/**
 * What a Body shows, channel by channel. The box (`x`, `y`, `width`,
 * `height`) is physical CSS px; `rotate` and `turn` are degrees; `lift` is
 * a share of its size (0.03 is 3% bigger); `opacity` adds to 1. The lean
 * toward the pointer is `tiltX` and `tiltY` in degrees, `tiltLift` the
 * share it swells by and `glare` how lit its Glares are, 0 to 1.
 */
export type Channel =
	| "x"
	| "y"
	| "width"
	| "height"
	| "rotate"
	| "lift"
	| "opacity"
	| "turn"
	| "tiltX"
	| "tiltY"
	| "tiltLift"
	| "glare";

/** A Part's channels: its offset in its Body, px, and its opacity, added to its rest. */
export type PartChannel = "x" | "y" | "opacity";

/**
 * One offset from rest on one channel: its delta times its shape's share
 * of its Move's progress. It is whole when the Move starts and nothing
 * when it ends.
 */
export type Term<C extends string = Channel> = {
	readonly channel: C;
	readonly delta: number;
	readonly shape: Shape;
};

export type PartTerm = Term<PartChannel>;

/**
 * A change of stacking, as part of a Move. The Body is drawn at `from`
 * and rests at `to`. Every Body whose order against it flips is `over`
 * it: how much that Body shows where they overlap goes from its `from`
 * to its `to` on the Move's progress. Through the crossing the Body is
 * drawn above all of them, veiled where each lies by that much, so a veil
 * is all it takes; at the end the Body takes its rest and no veil is
 * left. A `step` shape is a cut, as deck-of-cards' tricks do.
 */
export type Crossing = {
	readonly from: number;
	readonly to: number;
	readonly over: ReadonlyMap<
		string,
		{ readonly from: number; readonly to: number }
	>;
	readonly shape: Shape;
};

/**
 * One atomic change of a Body's form, place, pose or stacking. It starts
 * from exactly what is shown and ends exactly at rest, and every channel
 * of it rides its one progress: the box, rotation, lift and opacity, the
 * lean it lets go of, each Part's offset, exit and arrival, and the
 * stacking crossing. A Body shows its rest plus every live Move.
 */
export type Move = {
	readonly curve: Curve;
	/** Who started it: the hand, or the app (#1309 Q2). */
	readonly source: "hand" | "app";
	/** When its clock started, or `UNSTARTED` while the Table holds it. */
	readonly bornAt: number;
	readonly delayMs: number;
	readonly terms: readonly Term[];
	readonly parts: ReadonlyMap<string, readonly PartTerm[]>;
	readonly crossing: Crossing | null;
	/** The form whose own Parts leave on this Move: they stay until it ends. */
	readonly leaving: string | null;
};

/** The birth of a Move whose clock the Table hasn't started: it holds its start. */
export const UNSTARTED = Number.POSITIVE_INFINITY;

export const NO_PARTS: ReadonlyMap<string, readonly PartTerm[]> = new Map();

function elapsed(move: Move, now: number): number {
	return now - move.bornAt - move.delayMs;
}

/** How far `move` is at `now`, 0 to 1. */
function progressAt(move: Move, now: number): number {
	return progressAfter(move.curve, elapsed(move, now));
}

/** Whether `move` has ended for good at `now`. */
export function done(move: Move, now: number): boolean {
	return doneAfter(move.curve, elapsed(move, now));
}

/** The offset a Term of `move` holds at `now`. */
function valueAt<C extends string>(
	term: Term<C>,
	move: Move,
	now: number,
): number {
	const share = shareAt(term.shape, progressAt(move, now));
	return share === 0 ? 0 : term.delta * share;
}

/** The sum of every live offset on `channel` at `now`. */
export function sumAt(
	moves: readonly Move[],
	channel: Channel,
	now: number,
): number {
	let sum = 0;
	for (const move of moves)
		for (const term of move.terms)
			if (term.channel === channel) sum += valueAt(term, move, now);
	return sum;
}

/**
 * Summed offsets for every channel present in at least one Move's terms.
 * A channel absent from all Moves is `undefined`; a channel present in any
 * Move is a `number` (even when its value at `now` is `0`).
 */
export type MoveSample = Partial<Record<Channel, number>>;

const EMPTY_SAMPLE: MoveSample = Object.freeze({});

/** Evaluates `progressAt(move, now)` once per Move and sums every active channel in a single pass. */
export function sampleMoves(moves: readonly Move[], now: number): MoveSample {
	if (moves.length === 0) return EMPTY_SAMPLE;
	const sample: Partial<Record<Channel, number>> = {};
	for (const move of moves) {
		if (move.terms.length === 0) continue;
		const progress = progressAt(move, now);
		for (const term of move.terms) {
			const share = shareAt(term.shape, progress);
			const value = share === 0 ? 0 : term.delta * share;
			sample[term.channel] = (sample[term.channel] ?? 0) + value;
		}
	}
	return sample;
}

/** The sum of every live offset of Part `id` on `channel` at `now`. */
export function partSumAt(
	moves: readonly Move[],
	id: string,
	channel: PartChannel,
	now: number,
): number {
	let sum = 0;
	for (const move of moves)
		for (const term of move.parts.get(id) ?? [])
			if (term.channel === channel) sum += valueAt(term, move, now);
	return sum;
}

/** Whether any live Move moves `channel`. */
export function moves(list: readonly Move[], channel: Channel): boolean {
	return list.some((move) =>
		move.terms.some((term) => term.channel === channel),
	);
}

/** Whether any live Move moves Part `id` on `channel`. */
export function movesPart(
	list: readonly Move[],
	id: string,
	channel: PartChannel,
): boolean {
	return list.some((move) =>
		(move.parts.get(id) ?? []).some((term) => term.channel === channel),
	);
}

/** When `move` ends, in ms after its birth. */
export function endOf(move: Move): number {
	return move.delayMs + lengthOf(move.curve);
}

/** `moves`, with every one the Table held started at `at`. */
export function startMoves(list: readonly Move[], at: number): Move[] {
	return list.map((move) =>
		move.bornAt === UNSTARTED ? { ...move, bornAt: at } : move,
	);
}

/** `move` with nothing on the channels in `drop`, and no crossing if `crossing` is false. */
export function without(
	move: Move,
	drop: ReadonlySet<Channel>,
	{ crossing = true, parts = true } = {},
): Move {
	return {
		...move,
		terms: move.terms.filter((term) => !drop.has(term.channel)),
		crossing: crossing ? move.crossing : null,
		parts: parts ? move.parts : NO_PARTS,
		leaving: parts ? move.leaving : null,
	};
}

/** Whether `move` still carries anything. */
export function carries(move: Move): boolean {
	return (
		move.terms.length > 0 ||
		move.parts.size > 0 ||
		move.crossing !== null ||
		move.leaving !== null
	);
}

/**
 * How much each Body crossing `move`'s Body shows over it at `now`. It
 * follows the box's own way (the crossing's shape, so after any lead it sets
 * off from still): a Body coming off the moving one does so over the first
 * 60% of the way, while the moving one is still near where it was; one
 * coming over it from 40% on, as it nears its rest, done by 95% so the
 * spring's tail doesn't drag it out.
 */
export function overAt(move: Move, now: number): Map<string, number> {
	const out = new Map<string, number>();
	const crossing = move.crossing;
	if (!crossing) return out;
	const way = 1 - shareAt(crossing.shape, progressAt(move, now));
	for (const [id, { from, to }] of crossing.over) {
		const [lo, hi] = to > from ? [0.4, 0.95] : [0, 0.6];
		const share =
			way <= lo ? 1 : way >= hi ? 0 : 1 - (way - lo) / (hi - lo);
		out.set(id, to + (from - to) * share);
	}
	return out;
}

/**
 * The stacking order `move` draws its Body at, `now`: above every Body it
 * crosses while it crosses them (each shows through it as much as the
 * crossing has come), at its rest once a cut has passed.
 */
export function zAt(move: Move, now: number): number | null {
	const crossing = move.crossing;
	if (!crossing) return null;
	if (crossing.shape.kind === "step")
		return progressAt(move, now) < crossing.shape.at
			? crossing.from
			: crossing.to;
	return Math.max(crossing.from, crossing.to);
}
