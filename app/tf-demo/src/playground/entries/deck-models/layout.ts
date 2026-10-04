import { CARD_WIDTH_REM } from "react-resizable-panels/workspace";
import { COVER_GUTTER_REM } from "./heading-design";
import type { Subject } from "./model";

/**
 * The renderer's side of the geometry: what reads the page, and what
 * depends on what a Subject is. Where things sit is the battery's
 * workspace geometry, which takes both as arguments.
 */

/** The root font size, in px: the `rem` every geometry call takes. */
export function remPx(): number {
	return Number.parseFloat(
		getComputedStyle(document.documentElement).fontSize,
	);
}

/** The Text's content column in a Sheet; a Note's is `CARD_WIDTH_REM`. */
const TEXT_COLUMN_REM = 42;

/** The content column a Subject lays out in, in rem: what a Pane it spawns opens to. */
export function columnRemOf(subject: Subject): number {
	return subject.kind === "Text" ? TEXT_COLUMN_REM : CARD_WIDTH_REM;
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
	const column = `${(sheet ? columnRemOf(subject) : CARD_WIDTH_REM).toString()}rem`;
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
