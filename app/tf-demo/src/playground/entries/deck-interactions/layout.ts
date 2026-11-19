import {
	centreScaledTop,
	coverBoxIn,
	OPEN_SCALE,
	type PileSlot,
	pileSlotsIn,
	remPx,
} from "@/presentation/deck-geometry";
import type { Rect, Slot } from "./geometry";
import type { Width } from "./width";

export type Frame = { readonly w: number; readonly h: number };

/**
 * A slot of the foundation's pile in this engine's terms, at `scale`. A
 * Card here is scaled about its centre, so a scaled slot sits lower by
 * half of what its scale adds and its Card is drawn where the app draws
 * it: its top edge a whole Heading row below the Card Tail above it.
 */
function engineSlot(slot: PileSlot, scale: number): Slot {
	const scaled = { ...slot, scale };
	return {
		u: slot.inlineStart,
		v: centreScaledTop(scaled),
		w: slot.width,
		h: slot.height,
		r: 0,
		s: scale,
	};
}

/**
 * The Deck's pile, back to front, with the Card at `openAt` open: the
 * foundation's slots, which are the app's, with the frame as the Pane and
 * `rem` the root font size. Every Card keeps its slot by its index; only
 * the open one rests at `openScale`, as tf-demo's `restScale` has it.
 */
export function pileSlotsAt(
	frame: Frame,
	count: number,
	openAt: number,
	rem: number,
	openScale = OPEN_SCALE,
): Slot[] {
	return pileSlotsIn({ width: frame.w, height: frame.h }, count, {
		rem,
		openScale,
	}).map((slot, index) => engineSlot(slot, index === openAt ? openScale : 1));
}

/**
 * The Deck's pile with the Card at `openAt` open, by default the last, as
 * it is dealt: `pileSlotsAt` at the page's root font size.
 */
export function pileSlots(
	frame: Frame,
	count: number,
	openAt = count - 1,
	openScale = OPEN_SCALE,
): Slot[] {
	return pileSlotsAt(frame, count, openAt, remPx(), openScale);
}

/**
 * The Cover a Card expands into: the app's Cover box, with the frame as
 * its Pane; on a phone it fills the Pane.
 */
export function coverRect(frame: Frame, narrow: boolean): Rect {
	const box = coverBoxIn(
		{ width: frame.w, height: frame.h },
		remPx(),
		narrow,
	);
	return { u: box.inlineStart, v: box.top, w: box.width, h: box.height };
}

/**
 * The frame as D's Panes: the Deck's own Pane at inline-start and, on a
 * wide screen, the other Pane at inline-end, `share` of the frame across.
 * On a phone the Deck's Pane is the whole frame and there is no other.
 * The Deck rests in its own Pane at every moment, so a Card opened in
 * the other Pane leaves it where it is.
 */
export function panesOf(
	frame: Frame,
	width: Width,
	share: number,
): { readonly deck: Frame; readonly other: Rect | null } {
	if (width === "phone") return { deck: frame, other: null };
	const w = Math.round(frame.w * share);
	return {
		deck: { w: frame.w - w, h: frame.h },
		other: { u: frame.w - w, v: 0, w, h: frame.h },
	};
}

/** Where a Card opened in the other Pane `pane` rests: a wide Pane's Cover box in it. */
export function otherCoverRect(pane: Rect): Rect {
	const box = coverBoxIn({ width: pane.w, height: pane.h }, remPx(), false);
	return {
		u: pane.u + box.inlineStart,
		v: pane.v + box.top,
		w: box.width,
		h: box.height,
	};
}
