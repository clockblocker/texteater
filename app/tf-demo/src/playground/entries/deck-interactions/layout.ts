import { isNarrow } from "compass";
import {
	centreScaledTop,
	coverBoxIn,
	OPEN_SCALE,
	type PileSlot,
	pileSlotsIn,
	remPx,
} from "@/presentation/deck-geometry";
import type { Rect, Slot } from "./geometry";

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

/** The Cover a Card expands into: the app's Cover box, with the frame as its Pane. */
export function coverRect(frame: Frame): Rect {
	const rem = remPx();
	const box = coverBoxIn(
		{ width: frame.w, height: frame.h },
		rem,
		isNarrow(document.documentElement.clientWidth, rem),
	);
	return { u: box.inlineStart, v: box.top, w: box.width, h: box.height };
}
