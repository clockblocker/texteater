import {
	cardHeightPx,
	coverPlacement,
	DECK_TOP_REM,
	deckPlacements,
	type Placement,
	placementBox,
} from "compass";

/**
 * A Deck's resting geometry, in px. Every length is the Compass battery's:
 * the app places a resting Note with the same placements as CSS (tf-demo
 * ADR 0012), and a renderer that moves its Cards on px values reads them
 * here, so the two piles are one pile. Sizes come out as px numbers at the
 * `rem` given; nothing here reads the page but `remPx`.
 */

/**
 * The open Card's resting scale: 5 % larger than the Cards behind it.
 *
 * A tap used to be marked with a pulse. It is not any more: the open Card
 * simply rests larger than the rest, so which Card is in front reads at a
 * glance instead of only in the moment of the tap.
 */
export const OPEN_SCALE = 1.05;

/** The root font size, in px: the `rem` every geometry call takes. */
export function remPx(): number {
	return Number.parseFloat(
		getComputedStyle(document.documentElement).fontSize,
	);
}

/** A Pane's size in px; a frame that holds only a Deck is its Pane. */
type PaneSize = { readonly width: number; readonly height: number };

/**
 * A box in its Pane, in px: `inlineStart` from the Pane's inline-start
 * edge, so it reads the same in either writing direction.
 */
type PaneBox = {
	readonly inlineStart: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
};

/** Where one Card of a dealt Deck rests, and the scale it rests at. */
export type PileSlot = PaneBox & {
	/**
	 * The scale the Card rests at, about the middle of its top edge: the
	 * open Card grows downward and never rises over the Card Tail above it.
	 */
	readonly scale: number;
};

type PileOptions = {
	readonly rem: number;
	/** The open Card's scale; the Cards' width leaves room for it. */
	readonly openScale?: number;
	/** How far below its Pane's top the Deck starts. */
	readonly topRem?: number;
};

function boxIn(placement: Placement, pane: PaneSize, rem: number): PaneBox {
	const box = placementBox(placement, { left: 0, top: 0, ...pane }, rem);
	return {
		inlineStart: box.left,
		top: box.top,
		width: box.width,
		height: box.height,
	};
}

/**
 * A Deck of `count` Cards as it is dealt, back to front: each Card a
 * whole Card, the ones behind showing one Heading row above the next as
 * Card Tails, the front one open at the foot and resting at the open
 * scale.
 */
export function pileSlotsIn(
	pane: PaneSize,
	count: number,
	{ rem, openScale = OPEN_SCALE, topRem = DECK_TOP_REM }: PileOptions,
): PileSlot[] {
	return deckPlacements(count, openScale, topRem).map((placement, index) => ({
		...boxIn(placement, pane, rem),
		scale: index === count - 1 ? openScale : 1,
	}));
}

/**
 * The top of `slot`'s box for a renderer that scales a Card about its
 * centre: lower by half of what the scale adds, so the Card is drawn with
 * its top edge where the slot has it.
 */
export function centreScaledTop(slot: PileSlot): number {
	return slot.top + ((slot.scale - 1) * slot.height) / 2;
}

/** A Cover's box in its Pane: flush with the Pane's top, inset from its sides and foot. */
export function coverBoxIn(
	pane: PaneSize,
	rem: number,
	narrow = false,
): PaneBox {
	return boxIn(coverPlacement(narrow), pane, rem);
}

/**
 * A Card's height in a Deck of `count` Cards whose Pane has room for the
 * whole pile, in rem: what a surface that lays a Card out in the page's
 * flow, outside any Pane, gives it.
 */
export function cardHeightRem(count: number): number {
	return cardHeightPx(count, 1);
}
