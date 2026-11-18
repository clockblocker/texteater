import { BAR_REM, HEADER_REM, type Place } from "compass";

/**
 * The forms one Presentation is drawn in (tf-demo ADR 0006). It is one
 * element in all of them; the form says how its box is skinned and where
 * its Heading row and its Body sit.
 *
 * - `card`: the open Card, in front of its Deck or in the hand: the
 *   Heading row over the Body, which the box clips.
 * - `tail-above`: a Card folded above the open one, showing only its
 *   Heading row, as a Card Tail. A click's Deck is dealt this way (ADR
 *   0011).
 * - `tail-below`: a Card folded below the open one, its Heading row at its
 *   lower edge.
 * - `cover`: a Sheet above its Pane's Ground. Its Heading is its bar.
 * - `ground`: a Pane's bottom Sheet. Its Heading folds shut, because the
 *   Pane bar carries the label.
 * - `sheet`: a Sheet nothing draws a bar for, such as the ghost of the
 *   Sheet a drop would make.
 */
export type PresentationForm =
	| "card"
	| "tail-above"
	| "tail-below"
	| "cover"
	| "ground"
	| "sheet";

/** The form of a Card at `place` in its Deck. */
export function cardForm(place: Place): PresentationForm {
	return place === "open"
		? "card"
		: place === "above"
			? "tail-above"
			: "tail-below";
}

/** The words a Heading row shows: a Card's title row, or a Cover's bar. */
export type HeadingFace = "card" | "cover";

/** What a form asks of the box and of the content inside it. */
export type FormLayout = {
	/** A Sheet in a Pane, rather than a Card. */
	readonly sheet: boolean;
	/** The Heading row's face, or `null` where the row folds shut. */
	readonly face: HeadingFace | null;
	/** The Heading row sits at the lower edge, under the Body. */
	readonly headingAtFoot: boolean;
	/** The Body scrolls; otherwise the box clips it. */
	readonly scrolls: boolean;
	/** The Body fades out at the box's lower edge. */
	readonly fades: boolean;
	/**
	 * Its controls rest (#485): a Card's Links, Segments and buttons take no
	 * focus and no press.
	 */
	readonly resting: boolean;
};

export function formLayout(form: PresentationForm): FormLayout {
	const sheet = form === "cover" || form === "ground" || form === "sheet";
	return {
		sheet,
		face: sheet ? (form === "cover" ? "cover" : null) : "card",
		headingAtFoot: form === "tail-below",
		/* the open Card reads through its Body as a Sheet does; the folded
		   ones show only their Headings */
		scrolls: sheet || form === "card",
		fades: !sheet && form !== "tail-below",
		resting: !sheet,
	};
}

/**
 * A Cover's Heading while its Body rests at its top: the Note's title set
 * large, as the page's headword, with air above it.
 */
const COVER_HEADING_REM = 5.5;
/** A Cover's Heading folds this far into its Body, and unfolds only at its top. */
const FOLD_AT_PX = 24;

/** A Cover's Heading row, in rem: tall, or folded to the Pane bar's height. */
export function coverHeadingRem(folded: boolean): number {
	return folded ? BAR_REM : COVER_HEADING_REM;
}

/**
 * Whether a Heading is folded: its Sheet's Body has scrolled past
 * `FOLD_AT_PX`. It unfolds only back at the top, so the height the fold
 * gives the Body cannot scroll it back under the line and flicker.
 *
 * `roomOnceFolded` is how far the Body could still scroll after the fold,
 * in px: its scroll range less the height the Heading gives up
 * (`coverFoldRem`). A Body with none would fit once folded, scroll back
 * to its top and unfold again on every scroll, so its Heading stays
 * tall.
 */
export function foldedAt(
	was: boolean,
	scrollTop: number,
	roomOnceFolded = Number.POSITIVE_INFINITY,
): boolean {
	return was ? scrollTop > 0 : scrollTop > FOLD_AT_PX && roomOnceFolded > 0;
}

/** The height a Cover's Heading gives its Body when it folds, in rem. */
export function coverFoldRem(): number {
	return COVER_HEADING_REM - BAR_REM;
}

/** The Heading row's height in `form`, in rem; nothing where it folds shut. */
export function headingRowRem(form: PresentationForm, folded = false): number {
	const { face } = formLayout(form);
	return face === "card"
		? HEADER_REM
		: face === "cover"
			? coverHeadingRem(folded)
			: 0;
}
