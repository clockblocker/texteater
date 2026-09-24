import { COVER_GUTTER_REM } from "./heading-design";
import type { Box, Edge, Presentation, Subject } from "./model";
import {
	BAR_REM,
	CARD_WIDTH_REM,
	HEADER_REM,
	PILE_HEIGHT_REM,
} from "./motion-spec";

/** Where things sit: the Deck's column, a Pane's drop regions, a Sheet's box. */

/**
 * Where a drop lands, read off the Pane: inside the rectangle a Pane on
 * the left or right would take, it spawns that Pane; in the band between
 * them that reaches a little past the Deck, it goes back on the Deck; on
 * the Pane bar it lands nowhere; anywhere else in the Pane it opens as a
 * Cover there. A Card lifted out of a Sheet reads that last region in
 * its own Pane as home: a release there is a release in place, and
 * previews nothing. An edge region is the very rectangle a drop there
 * produces, so the zone drawn, the ghost and the Pane it becomes are one
 * box. `dropRegions` is the one place this geometry is written; the hit
 * test, the drawn zones and the preview all read it.
 */
/** A destination is left only once the pointer is this far outside its region. */
export const HYSTERESIS_PX = 12;

/** The stacking bands over the Panes, lowest first. */
export const Z = {
	/** A Ground; each Cover above it is one higher. */
	sheet: 1,
	/** The Deck's Cards, rising toward the expanded one. */
	deck: 10,
	zone: 30,
	/** The return band, over the Deck's Pane's zones. */
	returnZone: 35,
	/** The Held Card, over everything until it is let go. */
	held: 40,
} as const;

export const CARD_WIDTH = `${CARD_WIDTH_REM.toString()}rem`;

/** A Cover's box: the Pane inset by these, one inset all round. A Ground fills its Pane. */
export const SHEET_INSET_X_REM = 1.5;

export const SHEET_INSET_Y_REM = 1.5;

/** How far the return band reaches below the Deck's cards. */
export const RETURN_PAD_REM = 3;

/** The gap a clicked Sentence keeps above the Deck once the Text has moved. */
export const DEAL_GAP_PX = 8;

export function remPx(): number {
	return Number.parseFloat(
		getComputedStyle(document.documentElement).fontSize,
	);
}

/** Leave room for the selected Card's resting scale and the return outline. */
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

/** The expanded Card's height, in px, for a Deck of `count` Cards. */
export function cardHeightPx(count: number): number {
	return (PILE_HEIGHT_REM - (Math.max(1, count) - 1) * HEADER_REM) * remPx();
}

/** The Deck's left edge inside its Pane: the Deck is centred. */
export function deckLeftIn(paneWidth: number, cardWidth: number): number {
	return (paneWidth - cardWidth) / 2;
}

/** The Text's content column in a Sheet; a Note's is `CARD_WIDTH_REM`. */
export const TEXT_COLUMN_REM = 42;

/** A spawned Pane never takes more than this share of the Pane it splits. */
export const SPAWN_SHARE = 0.5;

/**
 * How big the Pane a Card spawns opens: as wide as its content column plus
 * the Cover insets, so a Note gets the room it lays out in and no more,
 * capped at half of the Pane it splits.
 */
export function spawnSize(
	card: Presentation,
	paneWidth: number,
	rem: number,
): number {
	const column =
		card.subject.kind === "Text" ? TEXT_COLUMN_REM : CARD_WIDTH_REM;
	const natural = (column + 2 * SHEET_INSET_X_REM) * rem;
	return Math.round(Math.min(natural, paneWidth * SPAWN_SHARE));
}

export type DropRegions = {
	/** Where a drop opens a Cover in this Pane: between the sides, under the bar. */
	readonly cover: Box;
	/** Where a drop spawns a Pane on this side: the Pane it spawns. */
	readonly edges: readonly { readonly edge: Edge; readonly box: Box }[];
	/** The Pane bar: chrome, never a drop. */
	readonly bar: Box;
};

/** A side region takes at most this share of its Pane, whatever it would spawn. */
export const EDGE_SHARE = 0.3;

/** How wide a Pane's side regions are: the Pane it would spawn, capped at `EDGE_SHARE`. */
export function edgeWidth(
	card: Presentation,
	paneWidth: number,
	rem: number,
): number {
	return Math.min(spawnSize(card, paneWidth, rem), paneWidth * EDGE_SHARE);
}

/** A Pane's drop regions, in frame coordinates. */
export function dropRegions(
	pane: Box,
	card: Presentation,
	rem: number,
	barRem = BAR_REM,
): DropRegions {
	const side = edgeWidth(card, pane.width, rem);
	const bar = barRem * rem;
	return {
		cover: {
			left: pane.left + side,
			top: pane.top + bar,
			width: pane.width - 2 * side,
			height: pane.height - bar,
		},
		edges: [
			{
				edge: "left",
				box: {
					left: pane.left,
					top: pane.top,
					width: side,
					height: pane.height,
				},
			},
			{
				edge: "right",
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

export function inside(box: Box, x: number, y: number, grow = 0): boolean {
	return (
		x >= box.left - grow &&
		x <= box.left + box.width + grow &&
		y >= box.top - grow &&
		y <= box.top + box.height + grow
	);
}

export function sameBox(a: Box | undefined, b: Box): boolean {
	return (
		a !== undefined &&
		a.left === b.left &&
		a.top === b.top &&
		a.width === b.width &&
		a.height === b.height
	);
}

export function sameBoxes(
	a: Readonly<Record<string, Box>>,
	b: Readonly<Record<string, Box>>,
): boolean {
	const ids = Object.keys(b);
	return (
		ids.length === Object.keys(a).length &&
		ids.every((id) => sameBox(a[id], b[id] as Box))
	);
}

/** Where a Cover sits in a Pane: under the bar, inset from the edges. */
export function coverBoxIn(pane: Box, rem: number, barRem = BAR_REM): Box {
	const insetX = SHEET_INSET_X_REM * rem;
	const insetY = SHEET_INSET_Y_REM * rem;
	const bar = barRem * rem;
	return {
		left: pane.left + insetX,
		top: pane.top + bar + insetY,
		width: Math.max(0, pane.width - 2 * insetX),
		height: Math.max(0, pane.height - bar - 2 * insetY),
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

/** The Deck's top inside its Pane, in px: one place, whatever was clicked. */
export function deckTopIn(embedded: boolean): number {
	return (embedded ? 3 : 12) * 16;
}

/**
 * A Note's column. As a Sheet its gutters hold ← and ×, and whichever
 * draws them, a Cover's Heading or a Ground's Pane bar, sets its title on
 * `title`, the body's column. The gutters widen as a Card becomes a Sheet
 * and the column widens with them, so the text keeps its measure and its
 * place. A Text reads at prose width; a ported Note is laid out by the
 * Notes page's own column.
 */
export function sheetColumn(subject: Subject, sheet: boolean, ported: boolean) {
	const column = sheet && subject.kind === "Text" ? "42rem" : CARD_WIDTH;
	/* a Text's Blocks carry a rem of their own inside the column */
	const gutterRem = sheet
		? COVER_GUTTER_REM - (subject.kind === "Text" ? 1 : 0)
		: 1;
	const body = `calc(${column} + ${(2 * (gutterRem - 1)).toString()}rem)`;
	return {
		column,
		gutterRem,
		body,
		title: ported ? "var(--container-note)" : body,
	};
}
