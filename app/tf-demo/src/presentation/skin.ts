import { CARD_WIDTH_REM } from "compass";
import { formLayout, type PresentationForm } from "./form";

/**
 * A Presentation's paper skin: the one place its box is drawn. The app's
 * renderer, the Notes gallery and Deck interactions all put this on the
 * element they move, so a change here changes all three.
 */

/**
 * The paper: its fill, its border slot (transparent at rest so armed state
 * borders never shift layout), and the clip that makes every edge of the
 * Note its own. `contain` stops a size change's layout and paint at this
 * box rather than letting it walk the Deck.
 */
const PAPER =
	"flex flex-col overflow-hidden border bg-clip-padding [contain:layout_paint]";
/** Tokenized Card corners (`14px`); a rising Cover rounds only its top corners. */
const CARD_CORNERS = "rounded-xl";
const COVER_CORNERS = "rounded-t-2xl rounded-b-none";
/** The corners of what is drawn inside a Card box's border, flush with it. */
export const PAPER_INNER_CORNERS = "rounded-[calc(var(--radius-xl)_-_1px)]";
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
	const surface =
		form === "card"
			? `${CARD_CORNERS} border-[var(--border-card-rest)] bg-paper-elevated [--note-bg:var(--paper-elevated)] shadow-card-rest`
			: form === "tail-above" || form === "tail-below"
				? `${CARD_CORNERS} border-[var(--border-card-tail)] bg-paper shadow-card-tail [&_[data-heading-title]]:opacity-80`
				: form === "ground"
					? "border-transparent bg-paper shadow-none"
					: `${COVER_CORNERS} border-[var(--border-cover)] bg-paper shadow-cover`;
	return [
		PAPER,
		surface,
		sheet ? "" : CARD,
		sheet || !liftable ? "" : CARD_HANDLE,
	]
		.filter(Boolean)
		.join(" ");
}

/**
 * The border colour a box rests at, as CSS, for an engine that animates
 * the border to a fate's colour and back: one real 1px border carries both
 * the subtle resting rim and armed states (`--link` / `--destructive`), so
 * the box never stacks a second outer shadow ring around a transparent border.
 */
export function restingBorder(form: PresentationForm): string {
	if (form === "ground") return "transparent";
	if (form === "card") return "var(--border-card-rest)";
	if (form === "tail-above" || form === "tail-below")
		return "var(--border-card-tail)";
	return "var(--border-cover)";
}

function lerp(a: number, b: number, t: number): string {
	return (a + (b - a) * t).toFixed(2);
}

/**
 * The shadow a Presentation casts for a lift of 0, at rest, to 1, in the
 * hand: active Cards rest on `--shadow-card-rest` and rise to
 * `--shadow-card-lift`, inactive deck tails recede to `--shadow-card-tail`,
 * Covers cast `--shadow-cover`, and Grounds cast none.
 */
export function paperShadow(form: PresentationForm, lift = 0): string {
	if (form === "ground") return "none";
	if (form === "cover" || form === "sheet") return "var(--shadow-cover)";
	if (form === "tail-above" || form === "tail-below") {
		return lift > 0.5
			? "var(--shadow-card-lift)"
			: "var(--shadow-card-tail)";
	}
	if (lift <= 0) return "var(--shadow-card-rest)";
	if (lift >= 1) return "var(--shadow-card-lift)";
	const t = Math.max(0, Math.min(1, lift));
	return [
		`inset 0 1px 0 oklch(1 0 0 / ${lerp(0.06, 0.09, t)})`,
		`0 ${lerp(10, 16, t)}px ${lerp(28, 38, t)}px ${lerp(-6, -8, t)}px oklch(0 0 0 / ${lerp(0.55, 0.62, t)})`,
		`0 ${lerp(24, 32, t)}px ${lerp(52, 68, t)}px ${lerp(-14, -16, t)}px oklch(0 0 0 / ${lerp(0.45, 0.52, t)})`,
	].join(", ");
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
