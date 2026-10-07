import type { DealtCard, Place } from "compass";
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";

/**
 * The seam between the Compass renderer and the application. The renderer
 * owns placement, form, gestures and motion for opaque Subjects; the
 * application says what a Subject is called, how wide it lays out, and
 * what its Heading and its Blocks look like in each form.
 */

/** A Presentation's form: a Card resting or held, or a Sheet in a Pane. */
export type Form = "card" | "sheet";

/** Where a Card sits in its Deck; the battery places it (`deckSlotsIn`). */
export type { Place };

/**
 * The two parts of a Note the renderer places. `heading` is the Heading
 * Block's words: the title row of a Card, or the title a Cover's Heading
 * and a Floating Pane's bar set between ← and ×. `body` is every other
 * Block, which a Card clips and a Sheet scrolls.
 */
type SubjectPart = "heading" | "body";

/** What a Subject's parts are told about where they are drawn, and what they may do. */
export type SubjectView<S> = {
	readonly form: Form;
	readonly place: Place;
	/** A Ground fills its Pane; its Heading folds shut into the Pane bar. */
	readonly ground: boolean;
	/** The selection this Sheet's Deck was dealt for, to light in its Segments. */
	readonly lit: string | null;
	/**
	 * A Segment clicked in this Sheet deals it a Deck. `from` is the
	 * clicked element: the Sheet scrolls its Sentence clear of the Deck.
	 */
	readonly deal: (
		selection: string,
		cards: readonly DealtCard<S>[],
		from: HTMLElement,
	) => void;
	/** A Link clicked in this Sheet pushes its Subject as a Cover. */
	readonly follow: (subject: S) => void;
	/**
	 * A press on a Segment or a Link: dragged past the slop, it lifts a
	 * fresh Held Card of `subject`; released inside it, it is a click.
	 */
	readonly liftOnDrag: (
		event: ReactPointerEvent<HTMLElement>,
		subject: () => S,
	) => void;
	/**
	 * As a Resolution progresses, the live Deck that holds this
	 * Presentation's slot takes these Cards by key (`ReconcileDeck`): kept
	 * keys keep their slot, new ones join at the end, dropped ones leave.
	 * A Card, a Sheet and a Held Card may send it; a ghost's does nothing,
	 * and neither does one with no slot in a live Deck.
	 */
	readonly reconcile: (cards: readonly KeyedCard<S>[]) => void;
};

/** A dealt Card with the caller's stable key, which `reconcile` matches on. */
export type KeyedCard<S> = DealtCard<S> & { readonly key: string };

export type SubjectRenderer<S> = {
	/** What a Subject is called: its aria-labels and the trail. */
	readonly label: (subject: S) => string;
	/**
	 * The content column a Subject lays out in as a Sheet, in rem, a rem of
	 * air either side included: what a Pane it spawns opens to, and what
	 * its Sheet's chrome sets its title on. A Card's is `CARD_WIDTH_REM`.
	 */
	readonly columnRem: (subject: S) => number;
	readonly render: (
		subject: S,
		view: SubjectView<S>,
		part: SubjectPart,
	) => ReactNode;
};

/** One Menu Item: a rung after the Menu whose selection becomes the Ground. */
export type MenuItem = { readonly key: string; readonly label: string };

/** What a Menu Item's rung is given: its Pane, and how to put a selection on its Ground. */
export type MenuItemView<S> = {
	readonly paneId: string;
	readonly select: (subject: S) => void;
};
