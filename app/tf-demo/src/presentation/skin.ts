import { CARD_WIDTH_REM } from "compass";
import { formLayout, type PresentationForm } from "./form";

/**
 * A Presentation's paper skin: the one place its box is drawn. The app's
 * renderer, the Notes gallery and Deck interactions all put this on the
 * element they move, so a change here changes all three.
 */

/**
 * The paper: its fill, its border, and the clip that makes every edge of
 * the Note its own. `contain` stops a size change's layout and paint at
 * this box rather than letting it walk the Deck.
 */
const PAPER =
	"flex flex-col overflow-hidden border bg-paper [contain:layout_paint]";
/** The paper's corners; a Ground fills its Pane, so it has none of its own. */
const PAPER_CORNERS = "rounded-[0.9rem]";
/** The corners of what is drawn inside a box's border, flush with it. */
export const PAPER_INNER_CORNERS = "rounded-[calc(0.9rem_-_1px)]";
/**
 * A Card is all handle, so none of it selects; a Sheet's text does, and
 * its Heading is the handle.
 */
const CARD = "select-none";
/** A Card a hand can pick up says so, and keeps a touch from scrolling the page under it. */
const CARD_HANDLE = "cursor-grab touch-none active:cursor-grabbing";

/**
 * The classes of a Presentation's box in `form`. `liftable` is off where
 * nothing picks a Card up, as in a gallery.
 */
export function boxClass(form: PresentationForm, liftable = true): string {
	const { sheet } = formLayout(form);
	return [
		PAPER,
		form === "ground"
			? "border-transparent"
			: `${PAPER_CORNERS} border-line-strong`,
		sheet ? "" : CARD,
		sheet || !liftable ? "" : CARD_HANDLE,
	]
		.filter(Boolean)
		.join(" ");
}

/**
 * The border colour a box rests at, as CSS, for an engine that animates
 * the border to a fate's colour and back: `boxClass` names the same one.
 */
export function restingBorder(form: PresentationForm): string {
	return form === "ground" ? "transparent" : "var(--line-strong)";
}

/**
 * The shadow a Presentation casts for a lift of 0, at rest, to 1, in the
 * hand: it drops further, spreads wider and darkens as the Card rises. A
 * Sheet is the same object lying down, so a Cover casts the resting one;
 * a Ground fills its Pane and casts none. Every form's shadow has the same
 * parts, so an engine can animate from one to another.
 */
export function paperShadow(form: PresentationForm, lift = 0): string {
	const cast = form === "ground" ? 0 : 1;
	const offset = (cast * (0.25 + 1.25 * lift)).toFixed(2);
	const blur = (cast * (0.75 + 2.25 * lift)).toFixed(2);
	const alpha = (cast * (0.2 + 0.25 * lift)).toFixed(2);
	return `0 ${offset}rem ${blur}rem rgb(0 0 0 / ${alpha})`;
}

/** The Notes page's gutter; a Sheet's ← and × hang inside it. */
export const COVER_GUTTER_REM = 2.5;

/**
 * A Note's column in one form. As a Sheet its gutters hold ← and ×, and
 * whichever draws them, a Cover's Heading or a Floating Pane's bar, sets
 * its title on `body`, the Blocks' column. The gutters widen as a Card
 * becomes a Sheet and the column widens with them, so the text keeps its
 * measure and its place. `columnRem` is the Subject's Sheet column; a
 * Card's is `CARD_WIDTH_REM`.
 *
 * A Sheet's Blocks never lay out wider than the Notes page's column
 * (`--container-note`), however much room `columnRem` asks the Pane for,
 * so `body` stops there too. Without that cap a Note's title started
 * 2.5rem before its Blocks in any Pane wider than the Notes page's column.
 */
export function sheetColumn(columnRem: number, sheet: boolean) {
	const column = sheet ? columnRem : CARD_WIDTH_REM;
	const gutterRem = sheet ? COVER_GUTTER_REM : 1;
	const width = `${(column + 2 * (gutterRem - 1)).toString()}rem`;
	return {
		/** The Blocks' column, gutters included: a CSS width. */
		body: sheet ? `min(${width}, var(--container-note))` : width,
		/** The padding either side of the Blocks, inside `body`, in rem. */
		gutterRem,
		/** The Card's title row is centred at this width. */
		column: `${column.toString()}rem`,
	};
}
