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
 * A slot of the foundation's pile in this engine's terms. A Card here is
 * scaled about its centre, so a scaled slot sits lower by half of what its
 * scale adds and its Card is drawn where the app draws it: its top edge a
 * whole Heading row below the Card Tail above it.
 */
function engineSlot(slot: PileSlot): Slot {
	return {
		u: slot.inlineStart,
		v: centreScaledTop(slot),
		w: slot.width,
		h: slot.height,
		r: 0,
		s: slot.scale,
	};
}

function pile(frame: Frame, count: number, openScale: number): PileSlot[] {
	return pileSlotsIn({ width: frame.w, height: frame.h }, count, {
		rem: remPx(),
		openScale,
	});
}

/**
 * The Deck's pile as it is dealt, back to front: the foundation's slots,
 * which are the app's, with the frame as the Pane.
 */
export function pileSlots(
	frame: Frame,
	count: number,
	openScale = OPEN_SCALE,
): Slot[] {
	return pile(frame, count, openScale).map(engineSlot);
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
