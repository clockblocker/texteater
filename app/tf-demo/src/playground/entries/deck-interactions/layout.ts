import { CARD_WIDTH_REM, HEADER_REM } from "compass";
import { OPEN_SCALE } from "@/workspace/motion/motion-spec";
import {
	centre,
	FOOTPRINT_PAD_PX,
	inflate,
	type Rect,
	rotateAround,
	type Slot,
	union,
} from "./geometry";

const REM = 16;
/** The real Deck's sizes: a Card's width and one folded Heading row. */
const CARD_W = CARD_WIDTH_REM * REM;
const TAIL_PX = HEADER_REM * REM;
const CARD_H = 22 * REM;
const FRAME_PAD = 24;

export type Frame = { readonly w: number; readonly h: number };

/**
 * The real Deck's pile: each Card a whole Card, the ones behind showing
 * `tail` px of their tops above the next, the front one at the foot and
 * resting at the open scale. Index 0 is the back.
 */
export function pileSlots(frame: Frame, count: number, tail = TAIL_PX): Slot[] {
	const w = Math.min(CARD_W, frame.w - 2 * FRAME_PAD);
	const h = Math.min(CARD_H, frame.h - 2 * FRAME_PAD - tail * (count - 1));
	const pileH = tail * (count - 1) + h;
	const u = (frame.w - w) / 2;
	const top = Math.max(FRAME_PAD, (frame.h - pileH) / 2 - FRAME_PAD);
	return Array.from({ length: count }, (_, index) => ({
		u,
		v: top + index * tail,
		w,
		h,
		r: 0,
		s: index === count - 1 ? OPEN_SCALE : 1,
	}));
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

/**
 * The Deck's footprint: what shows of every Card not in hand, padded. A
 * Card behind shows its strip down to the next Card's top; the front one
 * shows whole. Carrying the front Card leaves only the strips, so the
 * place it rose from is not "over the Deck".
 */
export function footprintOf(
	slots: readonly Slot[],
	except: number,
): Rect | null {
	const front = slots.length - 1;
	const shown = slots.flatMap((slot, index) => {
		if (index === except) return [];
		const next = slots[index + 1];
		if (index === front || !next) return [slot];
		return [{ ...slot, h: Math.max(0, next.v - slot.v) }];
	});
	const rest = union(shown);
	return rest ? inflate(rest, FOOTPRINT_PAD_PX) : null;
}

/** The Cover a Card expands into: its Pane, inset as a Sheet is. */
export function coverRect(frame: Frame): Rect {
	const w = Math.min(720, frame.w - 2 * FRAME_PAD);
	return {
		u: (frame.w - w) / 2,
		v: FRAME_PAD,
		w,
		h: frame.h - 2 * FRAME_PAD,
	};
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
