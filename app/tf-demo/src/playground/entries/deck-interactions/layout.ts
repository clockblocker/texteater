import { isNarrow } from "compass";
import {
	centreScaledTop,
	coverBoxIn,
	OPEN_SCALE,
	type PileSlot,
	pileSlotsIn,
	remPx,
} from "@/presentation/deck-geometry";
import { centre, type Rect, rotateAround, type Slot, union } from "./geometry";

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
 * The pile of a Deck dealt `dealt` Cards with only `count` of them on it,
 * closed up: the Cards left take the first places of the pile as dealt and
 * the last of them rests at the open scale. A Card keeps the size it was
 * dealt at, because the Deck still has the Cards a hand took off it.
 */
export function closedPileSlots(
	frame: Frame,
	count: number,
	dealt: number,
): Slot[] {
	return pile(frame, dealt, OPEN_SCALE)
		.slice(0, count)
		.map((slot, index) =>
			engineSlot({
				...slot,
				scale: index === count - 1 ? OPEN_SCALE : 1,
			}),
		);
}

/**
 * B's fan: every Card turned `degrees` from the next around the foot of
 * the Deck, the front one upright.
 */
export function fanSlots(slots: readonly Slot[], degrees: number): Slot[] {
	const box = union(slots);
	if (!box) return [];
	const pivot = { u: box.u + box.w / 2, v: box.v + box.h };
	const front = slots.length - 1;
	return slots.map((slot, index) => {
		const turn = (index - front) * degrees;
		const middle = rotateAround(centre(slot), pivot, turn);
		return {
			...slot,
			u: middle.u - slot.w / 2,
			v: middle.v - slot.h / 2,
			r: turn,
		};
	});
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

/** Where B and E put their targets: an L-shaped tray and an open pad. */
export type TableTargets = {
	/** At inline-start and bottom: a strip up the side and one along the foot. */
	readonly tray: readonly Rect[];
	/** At inline-end and top. */
	readonly pad: Rect;
};

export function tableTargets(frame: Frame, size: number): TableTargets {
	const inset = 16;
	const side = {
		u: inset,
		v: frame.h * 0.4,
		w: size,
		h: frame.h * 0.6 - inset - size,
	};
	const foot = {
		u: inset,
		v: frame.h - inset - size,
		w: frame.w * 0.45,
		h: size,
	};
	const padW = size * 3;
	const padH = size * 2;
	return {
		tray: [side, foot],
		pad: { u: frame.w - inset - padW, v: inset, w: padW, h: padH },
	};
}

/** Where a Deck leaves to: `distance` past the frame along `direction`. */
export function exitOffset(
	frame: Frame,
	direction: { readonly u: number; readonly v: number },
): { readonly u: number; readonly v: number } {
	const reach = Math.hypot(frame.w, frame.h);
	return { u: direction.u * reach, v: direction.v * reach };
}
