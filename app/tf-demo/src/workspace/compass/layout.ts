import {
	CARD_WIDTH_REM,
	type WritingDirection,
} from "react-resizable-panels/workspace";

/**
 * The renderer's side of the geometry: what reads the page, and the CSS
 * column a Note lays out in. Where things sit is the battery's workspace
 * geometry, which takes what is read here as arguments.
 */

/** The root font size, in px: the `rem` every geometry call takes. */
export function remPx(): number {
	return Number.parseFloat(
		getComputedStyle(document.documentElement).fontSize,
	);
}

/** The writing direction an element lays out in. */
export function directionOf(element: Element): WritingDirection {
	return getComputedStyle(element).direction === "rtl" ? "rtl" : "ltr";
}

/** The viewport's width, in px, as the `md` breakpoint reads it. */
export function viewportWidth(): number {
	return document.documentElement.clientWidth;
}

/** The Notes page's gutter; a Sheet's ← and × hang inside it. */
export const COVER_GUTTER_REM = 2.5;

/**
 * A Note's column in one form. As a Sheet its gutters hold ← and ×, and
 * whichever draws them, a Cover's Heading or a Floating Pane's bar, sets
 * its title on `body`, the Blocks' column. The gutters widen as a Card
 * becomes a Sheet and the column widens with them, so the text keeps its
 * measure and its place. `columnRem` is the Subject's Sheet column; see
 * `SubjectRenderer.columnRem`.
 */
export function sheetColumn(columnRem: number, sheet: boolean) {
	const column = sheet ? columnRem : CARD_WIDTH_REM;
	const gutterRem = sheet ? COVER_GUTTER_REM : 1;
	return {
		/** The Blocks' column, gutters included: a CSS width. */
		body: `${(column + 2 * (gutterRem - 1)).toString()}rem`,
		/** The padding either side of the Blocks, inside `body`, in rem. */
		gutterRem,
		/** The Card's title row is centred at this width. */
		column: `${column.toString()}rem`,
	};
}
