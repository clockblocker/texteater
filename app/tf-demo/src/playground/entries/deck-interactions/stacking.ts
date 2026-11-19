import type { Place } from "compass";

/**
 * How a resting Deck stacks, as tf-demo's `deckSlots` stacks it
 * (battery/compass `geometry.ts`). The order never changes on a tap: one
 * Card is open, the front Card, and every Card keeps its slot by its
 * index. Its z rises toward the open Card from both sides, one step per
 * slot, and the open Card is over all of them. Which Card is open is a
 * state, not a move: a tap changes it at once.
 */

/** The stacking every Card rests at past `OPEN_RISE` slots from the open one. */
export const BASE_Z = 10;
/** How far over `BASE_Z` the open Card rests; its neighbours step down from it. */
export const OPEN_RISE = 9;

/**
 * Where the open Card sits in `order` (back to front): the Card `front`
 * names, or the last when it names none of them, as a Deck is dealt.
 */
export function openAtOf(
	order: readonly string[],
	front: string | null,
): number {
	const at = front === null ? -1 : order.indexOf(front);
	return at === -1 ? order.length - 1 : at;
}

/** The stacking of slot `index` at rest while the Card at `openAt` is open. */
export function restZOf(index: number, openAt: number): number {
	return BASE_Z + Math.max(0, OPEN_RISE - Math.abs(index - openAt));
}

/** Whether slot `index` is folded above the open Card, is it, or is folded below it. */
export function placeOf(index: number, openAt: number): Place {
	return index < openAt ? "above" : index > openAt ? "below" : "open";
}
