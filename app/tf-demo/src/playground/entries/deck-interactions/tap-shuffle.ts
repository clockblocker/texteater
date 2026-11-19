import { type CardMove, legsOf, poseOf } from "./card-move";
import type { Slot } from "./geometry";

/**
 * A tap's reorder played as deck-of-cards' shuffle (`modules/shuffle` of
 * github.com/deck-of-cards/deck-of-cards, ported in tabletop's `shuffle`),
 * in that library's timing and structure: every leg 200 ms on cubicInOut,
 * each Card starting 2 ms × its new position late. One change to it: the
 * tapped Card never passes behind a Card. It is lifted above the whole
 * Deck as it starts, slides out sideways and into the front slot, and is
 * set down there; the library restacks it as its second leg starts,
 * which shows as a hop over the Cards it had been behind. The Cards
 * between it and the front move up a slot on that second beat, restacking
 * as they start. Pure: the Deck's player plays it.
 */

export const LEG_MS = 200;
export const STAGGER_MS = 2;
/** How high the tapped Card rides while it travels, as a lift of 0 to 1: its shadow. */
export const TAP_LIFT = 0.5;

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

/**
 * The shuffle that brings `id` to the front of `order` (back to front),
 * over a pile resting at `slots`: the new order and each moving Card's
 * part, or null when `id` is already in front or not in the Deck. The
 * tapped Card, above every Card from its start, goes `out` px along the
 * inline axis from its slot, upright, lifted by `TAP_LIFT` and at its
 * slot's height and scale, then into the front slot, set down there;
 * the Cards that were in front of it go to the slot below theirs. The
 * Cards behind it don't move.
 */
export function tapShuffle({
	order,
	id,
	slots,
	out,
	legMs = LEG_MS,
}: {
	readonly order: readonly string[];
	readonly id: string;
	readonly slots: readonly Slot[];
	readonly out: number;
	/** Each leg's length: deck-of-cards' 200 ms unless the inspector says otherwise. */
	readonly legMs?: number;
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
	const pulled = { ...poseOf(was), u: was.u + out, r: 0, lift: TAP_LIFT };
	const moves: CardMove[] = [
		{
			id,
			index: front,
			startMs: STAGGER_MS * front,
			reducedStartMs: STAGGER_MS * front,
			ms: 2 * legMs,
			zAtMs: 2 * legMs,
			lifted: true,
			legs: legsOf([
				{ at: 0, ms: legMs, to: pulled },
				{ at: legMs, ms: legMs, to: poseOf(top) },
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
			startMs: legMs + STAGGER_MS * index,
			reducedStartMs: STAGGER_MS * index,
			ms: legMs,
			zAtMs: 0,
			lifted: false,
			legs: legsOf([{ at: 0, ms: legMs, to: poseOf(slot) }]),
		});
	}
	return { order: next, moves };
}
