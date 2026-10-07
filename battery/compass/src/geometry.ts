/**
 * Where things sit in a workspace: the Deck's column, a Pane's drop
 * regions, a Sheet's box, and which region a pointer is over.
 *
 * It is pure. Whatever only the page knows, the root font size and the
 * measured Pane boxes, comes in as an argument, and so does anything that
 * depends on what a Subject is, such as how wide its content column is.
 * Sizes are written in rem and come out in px at the `rem` given; boxes
 * are in the coordinates of the frame the Panes were measured in. Edges
 * are logical: the writing direction decides which physical side each
 * one sits on.
 */

import type { Edge, Presentation } from "./model";

export type Box = {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
};

export type WritingDirection = "ltr" | "rtl";

/* ---------------------------------------------------------------- sizes */

/** A Card's width, and a Note's content column. */
export const CARD_WIDTH_REM = 26;
/** The whole Deck column: the front Card plus one Heading row per folded Card. */
export const PILE_HEIGHT_REM = 30;
/** A Card's Heading row, which is all a folded Card shows. */
export const HEADER_REM = 2.75;
/** The Pane bar above a Ground: the trail and the ← or X control. */
export const BAR_REM = 2.25;
/**
 * A Card lifted from a Link or a Segment, or a Text lifted off its Ground,
 * rests in no Deck; this is the height it is held at.
 */
export const LOOSE_CARD_REM = 18;
/** How far below a Pane's top its Deck starts. */
export const DECK_TOP_REM = 12;
/** How far the return band reaches below the Deck's Cards. */
const RETURN_PAD_REM = 3;
/**
 * The least a Deck shrinks to in a short Pane: room for a front Card's
 * Heading and a few lines of it under the Headings of the Cards behind.
 */
const MIN_PILE_REM = 16;
/** The air a Deck keeps under its foot, inside its Pane. */
const DECK_FOOT_REM = 1;

/**
 * Below this viewport width, the `md` breakpoint, a screen is narrow: it
 * shows one Pane and makes no splits, so a Pane has no side edges and a
 * Cover fills it (tf-demo ADR 0008).
 */
export const NARROW_BELOW_REM = 48;

/**
 * A Cover's box: flush with its Pane's top, over the Pane bar, and inset
 * by these from the Pane's sides and foot. A Ground fills its Pane.
 */
const SHEET_INSET_X_REM = 1.5;
const SHEET_INSET_Y_REM = 1.5;

/** A spawned Pane never takes more than this share of the Pane it splits. */
const SPAWN_SHARE = 0.5;

/** A side region takes at most this share of its Pane, whatever it would spawn. */
const EDGE_SHARE = 0.3;

/**
 * A destination is left only once the pointer is this far outside its
 * region. A pointer's distance, so px whatever the root size.
 */
export const HYSTERESIS_PX = 12;

/** The gap a clicked Sentence keeps above the Deck once the Text has moved. */
export const DEAL_GAP_PX = 8;

/** The stacking bands over the Panes, lowest first. */
export const Z = {
	/** A Ground; each Cover above it is one higher. */
	sheet: 1,
	/** The Deck's Cards, rising toward the front one. */
	deck: 10,
	zone: 30,
	/** The return band, over the Deck's Pane's zones. */
	returnZone: 35,
	/** The Held Card, over everything until it is let go. */
	held: 40,
} as const;

/** Whether a viewport `width` px wide is a narrow screen, at the `rem` given. */
export function isNarrow(width: number, rem: number): boolean {
	return width < NARROW_BELOW_REM * rem;
}

/* ----------------------------------------------------------------- Deck */

/**
 * A Card's width in a Pane `paneWidth` wide. It leaves room for the front
 * Card's resting scale and the return band's outline.
 */
export function cardWidthIn(
	paneWidth: number,
	rem: number,
	openScale: number,
): number {
	return Math.max(
		0,
		Math.min(
			CARD_WIDTH_REM * rem,
			(paneWidth - 2 * rem) / Math.max(1, openScale),
		),
	);
}

/** How far below a Note's top edge the hand holds it, in px. */
const HAND_GRIP_PX = 24;

/**
 * The box a Note is held at when it is lifted out of a Sheet or from
 * nowhere, `height` px tall: Card-wide for a Pane `paneWidth` wide,
 * centred on the hand at client (`x`, `y`) and held `HAND_GRIP_PX` below
 * its top. It never leaves the frame across. `frame` is the frame's
 * client box; the box comes out in frame coordinates.
 */
export function handBoxIn(
	frame: Box,
	paneWidth: number,
	x: number,
	y: number,
	height: number,
	rem: number,
	openScale: number,
): Box {
	const width = cardWidthIn(paneWidth, rem, openScale);
	return {
		left: Math.max(
			0,
			Math.min(frame.width - width, x - frame.left - width / 2),
		),
		top: y - frame.top - HAND_GRIP_PX,
		width,
		height,
	};
}

/**
 * The front Card's height, in px, in a Deck of `count` Cards whose column
 * is `pileHeight` px tall: what is left of it under one Heading row per
 * Card behind, and never less than a Heading row.
 */
export function cardHeightPx(
	count: number,
	rem: number,
	pileHeight = PILE_HEIGHT_REM * rem,
): number {
	return Math.max(
		HEADER_REM * rem,
		pileHeight - (Math.max(1, count) - 1) * HEADER_REM * rem,
	);
}

/** The Deck's inset from either inline edge of its Pane: the Deck is centred. */
function deckInsetIn(paneWidth: number, cardWidth: number): number {
	return (paneWidth - cardWidth) / 2;
}

/**
 * The Deck's top inside its Pane, in px: one place, whatever was clicked.
 * `topRem` moves it for a renderer that has nothing above the Deck.
 */
export function deckTopIn(rem: number, topRem = DECK_TOP_REM): number {
	return topRem * rem;
}

/**
 * The Deck's column in a Pane: where its Cards sit, in frame coordinates.
 * It fits its Pane. A Pane too short for the whole pile below `topRem`
 * shrinks it, down to `MIN_PILE_REM`; one too short for that moves the
 * Deck up, though never above the Pane bar, and shrinks it to what is left.
 */
export function deckColumnIn(
	pane: Box,
	rem: number,
	openScale: number,
	topRem = DECK_TOP_REM,
): Box {
	const width = cardWidthIn(pane.width, rem, openScale);
	const room = Math.max(0, pane.height - DECK_FOOT_REM * rem);
	const preferred = deckTopIn(rem, topRem);
	const highest = Math.min(topRem, BAR_REM) * rem;
	const height = Math.max(
		0,
		Math.min(
			PILE_HEIGHT_REM * rem,
			Math.max(MIN_PILE_REM * rem, room - preferred),
			room - highest,
		),
	);
	return {
		left: pane.left + deckInsetIn(pane.width, width),
		top: pane.top + Math.max(highest, Math.min(preferred, room - height)),
		width,
		height,
	};
}

/**
 * Where a Card sits in its Deck: the open one in front, or folded above
 * or below it, which puts its Heading at its lower edge as a Card Tail.
 */
export type Place = "above" | "open" | "below";

/** A resting Card's slot in its Deck: its place, its box, and its z. */
export type DeckSlot<S> = {
	readonly card: Presentation<S>;
	readonly place: Place;
	readonly box: Box;
	readonly z: number;
};

/** How far over `Z.deck` the open Card rests; its neighbours step down from it. */
const OPEN_RISE = 9;

/**
 * Where a Deck's resting Cards sit in a Pane, in drawing order: the last
 * in rank on top of the column, each slot one Heading row below the one
 * before, every slot as tall as the front Card. The Card `frontId` names
 * is open, or the first in rank when it names none of `cards`; the Cards
 * drawn before it are folded above it and the rest below. Their z rises
 * toward the open Card from both sides, one step per slot, and the open
 * Card is over all of them. Past `OPEN_RISE` slots away they all rest at
 * `Z.deck`, which is safe: a Deck that long has slots one Heading row
 * tall (`cardHeightPx`), so no two of them overlap. A Card in hand is the
 * renderer's to lift over the rest.
 */
export function deckSlotsIn<S>(
	pane: Box,
	cards: readonly Presentation<S>[],
	frontId: string | null,
	rem: number,
	openScale: number,
	topRem = DECK_TOP_REM,
): readonly DeckSlot<S>[] {
	const count = cards.length;
	const column = deckColumnIn(pane, rem, openScale, topRem);
	const height = cardHeightPx(count, rem, column.height);
	const order = [...cards].reverse();
	const frontAt = order.findIndex((card) => card.id === frontId);
	const openAt = frontAt === -1 ? count - 1 : frontAt;
	return order.map((card, index) => {
		const place: Place =
			index < openAt ? "above" : index > openAt ? "below" : "open";
		return {
			card,
			place,
			box: {
				left: column.left,
				top: column.top + index * HEADER_REM * rem,
				width: column.width,
				height,
			},
			z: Z.deck + Math.max(0, OPEN_RISE - Math.abs(index - openAt)),
		};
	});
}

/** Where a Deck is drawn: how far below its Pane's top, and on what screen. */
export type DeckOptions = {
	/** Moves the Deck for a renderer that has nothing above it; see `deckTopIn`. */
	readonly topRem?: number;
	/** A narrow screen: its Panes have no side edges. */
	readonly narrow?: boolean;
};

/**
 * The return band over a Deck: the Pane's width between its two edge
 * regions, from the Deck's top to `RETURN_PAD_REM` below its column.
 * `columnRem` is the held Card's content column, as for `edgeWidth`.
 */
export function returnBandIn(
	pane: Box,
	columnRem: number,
	rem: number,
	openScale: number,
	{ topRem = DECK_TOP_REM, narrow = false }: DeckOptions = {},
): Box {
	const column = deckColumnIn(pane, rem, openScale, topRem);
	const side = narrow ? 0 : edgeWidth(columnRem, pane.width, rem);
	return {
		left: pane.left + side,
		top: column.top,
		width: pane.width - 2 * side,
		height: column.height + RETURN_PAD_REM * rem,
	};
}

/* --------------------------------------------------------------- Sheets */

/**
 * Where a Cover sits in a Pane: from the Pane's top edge, over its bar,
 * and inset from its sides and foot. A Cover carries its own bar. On a
 * narrow screen it fills its Pane: what would have been a Pane of its
 * own opens full-screen as a Cover.
 */
export function coverBoxIn(pane: Box, rem: number, narrow = false): Box {
	const insetX = narrow ? 0 : SHEET_INSET_X_REM * rem;
	const insetY = narrow ? 0 : SHEET_INSET_Y_REM * rem;
	return {
		left: pane.left + insetX,
		top: pane.top,
		width: Math.max(0, pane.width - 2 * insetX),
		height: Math.max(0, pane.height - insetY),
	};
}

/** Where a Ground sits: the whole Pane under its bar. */
export function groundBoxIn(pane: Box, rem: number, barRem = BAR_REM): Box {
	const bar = barRem * rem;
	return {
		left: pane.left,
		top: pane.top + bar,
		width: pane.width,
		height: Math.max(0, pane.height - bar),
	};
}

/**
 * How wide the Pane a Card spawns opens: its content column, `columnRem`,
 * plus the Cover insets, so a Note gets the room it lays out in and no
 * more, capped at half of the Pane it splits.
 */
export function spawnSize(
	columnRem: number,
	paneWidth: number,
	rem: number,
): number {
	const natural = (columnRem + 2 * SHEET_INSET_X_REM) * rem;
	return Math.round(Math.min(natural, paneWidth * SPAWN_SHARE));
}

/* ---------------------------------------------------------- drop regions */

/**
 * Where a drop lands, read off the Pane: inside the rectangle a Pane on
 * either side would take, it spawns that Pane; on the Pane bar it lands
 * nowhere; anywhere else in the Pane it opens as a Cover there. An edge
 * region is the very rectangle a drop there produces, so the zone drawn,
 * the preview and the Pane it becomes are one box. `dropRegions` is the
 * one place this geometry is written; the hit test, the drawn zones and
 * the preview all read it.
 */
export type DropRegions = {
	/** Where a drop opens a Cover in this Pane: between the sides, under the bar. */
	readonly cover: Box;
	/** Where a drop spawns a Pane on this side: the Pane it spawns. */
	readonly edges: readonly { readonly edge: Edge; readonly box: Box }[];
	/** The Pane bar: chrome, never a drop. */
	readonly bar: Box;
};

/** How wide a Pane's side regions are: the Pane it would spawn, capped at `EDGE_SHARE`. */
export function edgeWidth(
	columnRem: number,
	paneWidth: number,
	rem: number,
): number {
	return Math.min(
		spawnSize(columnRem, paneWidth, rem),
		paneWidth * EDGE_SHARE,
	);
}

export type DropOptions = {
	/** The Pane bar's height; a Floating Pane's bar is its Ground's Heading. */
	readonly barRem?: number;
	readonly direction?: WritingDirection;
	/** A narrow screen makes no splits: no side edges, and the cover region spans the Pane. */
	readonly narrow?: boolean;
};

/**
 * A Pane's drop regions for a held Card whose content column is
 * `columnRem`, in frame coordinates. The inline-start edge sits on the
 * left in left-to-right text and on the right in right-to-left text.
 */
export function dropRegions(
	pane: Box,
	columnRem: number,
	rem: number,
	{ barRem = BAR_REM, direction = "ltr", narrow = false }: DropOptions = {},
): DropRegions {
	const side = narrow ? 0 : edgeWidth(columnRem, pane.width, rem);
	const bar = barRem * rem;
	const [left, right]: readonly [Edge, Edge] =
		direction === "rtl"
			? ["inline-end", "inline-start"]
			: ["inline-start", "inline-end"];
	return {
		cover: {
			left: pane.left + side,
			top: pane.top + bar,
			width: pane.width - 2 * side,
			height: pane.height - bar,
		},
		edges: narrow
			? []
			: [
					{
						edge: left,
						box: {
							left: pane.left,
							top: pane.top,
							width: side,
							height: pane.height,
						},
					},
					{
						edge: right,
						box: {
							left: pane.left + pane.width - side,
							top: pane.top,
							width: side,
							height: pane.height,
						},
					},
				],
		bar: {
			left: pane.left,
			top: pane.top,
			width: pane.width,
			height: bar,
		},
	};
}

/** The physical side a logical edge sits on, for a renderer that needs one. */
export function sideOf(
	edge: Edge,
	direction: WritingDirection,
): "left" | "right" {
	return (edge === "inline-start") === (direction === "ltr")
		? "left"
		: "right";
}

/** A drop region a pointer is over: a Pane's cover region or one of its edges. */
export type Region =
	| { readonly kind: "cover"; readonly paneId: string }
	| { readonly kind: "edge"; readonly paneId: string; readonly edge: Edge };

/**
 * The region under the pointer at (`x`, `y`), or `null` over a Pane bar or
 * outside every Pane. `held` is the region the pointer was last over: it
 * is kept, the very object, until the pointer is `HYSTERESIS_PX` outside
 * it or on its Pane's bar, so leaving a region takes a little more than
 * entering it did. Otherwise Panes are read in order, and in each the bar
 * first, then the edges, then the cover region.
 */
export function regionAt(
	panes: readonly {
		readonly paneId: string;
		readonly regions: DropRegions;
	}[],
	x: number,
	y: number,
	held: Region | null = null,
): Region | null {
	const heldRegions = held
		? panes.find((pane) => pane.paneId === held.paneId)?.regions
		: undefined;
	if (held && heldRegions) {
		const box =
			held.kind === "edge"
				? heldRegions.edges.find((e) => e.edge === held.edge)?.box
				: heldRegions.cover;
		if (
			box &&
			inside(box, x, y, HYSTERESIS_PX) &&
			!inside(heldRegions.bar, x, y)
		)
			return held;
	}
	for (const { paneId, regions } of panes) {
		if (inside(regions.bar, x, y)) return null;
		for (const { edge, box } of regions.edges)
			if (inside(box, x, y)) return { kind: "edge", paneId, edge };
		if (inside(regions.cover, x, y)) return { kind: "cover", paneId };
	}
	return null;
}

/* ---------------------------------------------------------------- boxes */

/** Whether (`x`, `y`) is in `box`, or within `grow` px of it. */
export function inside(box: Box, x: number, y: number, grow = 0): boolean {
	return (
		x >= box.left - grow &&
		x <= box.left + box.width + grow &&
		y >= box.top - grow &&
		y <= box.top + box.height + grow
	);
}

function sameBox(a: Box | undefined, b: Box | undefined): boolean {
	return (
		a !== undefined &&
		b !== undefined &&
		a.left === b.left &&
		a.top === b.top &&
		a.width === b.width &&
		a.height === b.height
	);
}

/** Whether two sets of measured boxes, keyed by id, are the same. */
export function sameBoxes(
	a: Readonly<Record<string, Box>>,
	b: Readonly<Record<string, Box>>,
): boolean {
	const ids = Object.keys(b);
	return (
		ids.length === Object.keys(a).length &&
		ids.every((id) => sameBox(a[id], b[id]))
	);
}
