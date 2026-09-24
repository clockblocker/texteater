import type { MotionValue } from "motion/react";
import {
	type DummyNote,
	type DummyText,
	deckFor,
	FIRST_TEXT,
	type NoteLink,
	noteById,
	type TextFocus,
	textById,
} from "./dummy";
import type { HeadingControl } from "./heading-design";

/** The Compass model: its types, and the pure Pane algebra over them. */

export type Subject =
	| { readonly kind: "Note"; readonly note: DummyNote }
	| {
			readonly kind: "Text";
			readonly text: DummyText;
			readonly focus: TextFocus | null;
	  };

/**
 * A Cover's ←: Collapse to its Card, or Close, and whether it is live. Its
 * × is the same shape: every Cover in the Pane leaves, back to the Ground.
 */
export type CoverBack = HeadingControl;

/** One workspace instance of a Subject; a fresh one for every open (issue 483). */
export type Presentation = { readonly id: number; readonly subject: Subject };

export type Deck = {
	readonly word: string;
	/**
	 * Every Note dealt, in Deck rank. A Note keeps its rank in whatever form
	 * it takes: opening as a Cover does not move it, and collapsing brings it
	 * back to the same slot. Only a Sweep, or a new deal, changes this list.
	 */
	readonly cards: readonly Presentation[];
	readonly expandedId: number | null;
};

export type Rung = { readonly id: number; readonly deck: Deck | null } & (
	| { readonly kind: "Menu" }
	| { readonly kind: "Library" }
	| { readonly kind: "Sheet"; readonly card: Presentation }
);

export type Cover = {
	readonly id: number;
	readonly card: Presentation;
	readonly deck: Deck | null;
	/** The Cover a Held Card would push if dropped here: a ghost, gone when it leaves. */
	readonly preview?: true;
};

export type PaneNode = {
	readonly kind: "Pane";
	readonly id: string;
	/** The Ground line, bottom rung first. Rooted when it starts at the Menu. */
	readonly line: readonly Rung[];
	readonly covers: readonly Cover[];
	/**
	 * The Pane a Held Card would spawn if dropped here: inserted while the
	 * Card hovers an edge so the other Panes make room, and gone when it
	 * leaves. Its Ground is drawn as a ghost Sheet of the Card.
	 */
	readonly preview?: true;
};

export type SplitNode = {
	readonly kind: "Split";
	readonly id: string;
	readonly axis: "horizontal" | "vertical";
	readonly children: readonly [LayoutNode, LayoutNode];
	/** The child this split was made for, and the size it opened at. */
	readonly freshId?: string;
	readonly freshSize?: number | string;
};

export type LayoutNode = PaneNode | SplitNode;

export type Edge = "left" | "right";

export type Destination =
	| { readonly kind: "return" }
	/** The Pane the Card was lifted out of: a drop here is a release in place. */
	| { readonly kind: "home"; readonly paneId: string }
	| { readonly kind: "sheet"; readonly paneId: string }
	| { readonly kind: "pane"; readonly paneId: string; readonly edge: Edge };

/**
 * Where a gesture on a Note is. `pressed`: down, not yet past the slop,
 * so letting go is a tap. `swiping`: it started leftward on a Card on a
 * Deck and moves the whole Deck until the finger lifts or pulls the Card
 * loose. `held`: the Card is in hand and goes where the pointer says.
 * Nothing changes phase on a timer.
 */
export type Phase = "pressed" | "swiping" | "held";

/**
 * What letting go now does to the Card in hand, shown on the Card before
 * it is done: it opens somewhere, it goes back to rest, or it leaves.
 */
export type Fate = "open" | "rest" | "leave";

export type Box = {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
};

/** A Note's own motion values: its box, and the drag transforms on top. */
export type NoteHandle = {
	readonly left: MotionValue<number>;
	readonly top: MotionValue<number>;
	readonly width: MotionValue<number>;
	readonly height: MotionValue<number>;
	readonly x: MotionValue<number>;
	readonly y: MotionValue<number>;
	readonly rotate: MotionValue<number>;
	readonly opacity: MotionValue<number>;
};

/** A Sheet a Deck can belong to: a Ground rung or a Cover, found by id. */
export type SheetRef = {
	readonly paneId: string;
	readonly sheetId: number;
	readonly card: Presentation | null;
	readonly deck: Deck | null;
	readonly ground: boolean;
	/** A ghost: what a drop would make, not something the reader can touch. */
	readonly preview: boolean;
};

export type Drag = {
	readonly card: Presentation;
	readonly h: NoteHandle;
	readonly pointerId: number;
	readonly start: { x: number; y: number; t: number };
	/** The box the Note holds while in hand; its drag offset is on top. */
	readonly origin: Box;
	/** The Pane the gesture started in. */
	readonly paneId: string;
	/** The Deck the Note rests in, if it rests in one: its slot, and what a swipe sweeps. */
	readonly deckSheet: number | null;
	/**
	 * Where a release with nothing under it sends the Note: back to its
	 * slot on the Deck, back to the Sheet it was lifted out of, closed (a
	 * Cover whose Card is on no live Deck), or away — a Card lifted from a
	 * Link or a Segment came from nowhere.
	 */
	readonly home: "slot" | "restore" | "close" | "vanish";
	phase: Phase;
	/** Lifted out of a Sheet or from nowhere, rather than picked off a Deck. */
	readonly lifted: boolean;
	v: { vx: number; vy: number };
	last: { x: number; y: number; t: number };
	/**
	 * A Card torn off a swipe sits this far from the finger, where the
	 * rubber band held it, and the gap closes on its own spring. `stop`
	 * ends the catch-up.
	 */
	gap: {
		readonly x: MotionValue<number>;
		readonly y: MotionValue<number>;
		readonly stop: () => void;
	} | null;
};

export type NoteForm = "card" | "sheet";

export type Place = "above" | "open" | "below";

export type Lift = {
	readonly pointerId: number;
	readonly x: number;
	readonly y: number;
};

/** A Segment or a Link under a pointer that has not moved yet. */
export type PendingLift = {
	readonly pointerId: number;
	readonly x: number;
	readonly y: number;
	readonly paneId: string;
	readonly make: () => Subject;
};

export type Checkpoint = {
	readonly layout: LayoutNode;
};

export const ROOT_PANE = "root";

export const PREVIEW_PANE = "preview";

/** The Sheet id every ghost wears; never a real Sheet's. */
export const PREVIEW_SHEET = -1;

export function panesOf(node: LayoutNode): readonly PaneNode[] {
	return node.kind === "Pane"
		? [node]
		: node.children.flatMap((child) => panesOf(child));
}

export function findPane(node: LayoutNode, id: string): PaneNode | null {
	return panesOf(node).find((pane) => pane.id === id) ?? null;
}

/** Replaces a pane by id; `null` removes it and lets its sibling take over. */
export function replacePane(
	node: LayoutNode,
	id: string,
	next: LayoutNode | null,
): LayoutNode | null {
	if (node.kind === "Pane") return node.id === id ? next : node;
	const [a, b] = node.children;
	const nextA = replacePane(a, id, next);
	const nextB = replacePane(b, id, next);
	if (nextA === null) return nextB;
	if (nextB === null) return nextA;
	if (nextA === a && nextB === b) return node;
	return { ...node, children: [nextA, nextB] };
}

/** Puts `fresh` beside the pane `id`, on the side the edge names, at `size`. */
export function splitBeside(
	node: LayoutNode,
	id: string,
	edge: Edge,
	fresh: PaneNode,
	size: number | string,
): LayoutNode {
	const pane = findPane(node, id);
	if (!pane) return node;
	const split: SplitNode = {
		kind: "Split",
		id: `split-${fresh.id}`,
		axis: "horizontal",
		children: edge === "left" ? [fresh, pane] : [pane, fresh],
		freshId: fresh.id,
		freshSize: size,
	};
	return replacePane(node, id, split) ?? node;
}

export function updatePane(
	node: LayoutNode,
	id: string,
	update: (pane: PaneNode) => PaneNode,
): LayoutNode {
	const pane = findPane(node, id);
	if (!pane) return node;
	return replacePane(node, id, update(pane)) ?? node;
}

export function isRooted(pane: PaneNode): boolean {
	return pane.line[0]?.kind === "Menu";
}

export function groundOf(pane: PaneNode): Rung {
	const rung = pane.line.at(-1);
	if (!rung) throw new Error(`Pane ${pane.id} has no Ground`);
	return rung;
}

/** Every Sheet in a Pane, bottom first: the Ground, then its Covers. */
export function sheetsOf(pane: PaneNode): readonly SheetRef[] {
	const ground = groundOf(pane);
	return [
		{
			paneId: pane.id,
			sheetId: ground.id,
			card: ground.kind === "Sheet" ? ground.card : null,
			deck: ground.deck,
			ground: true,
			preview: pane.preview === true,
		},
		...pane.covers.map((cover) => ({
			paneId: pane.id,
			sheetId: cover.id,
			card: cover.card,
			deck: cover.deck,
			ground: false,
			preview: cover.preview === true,
		})),
	];
}

export function topSheetOf(pane: PaneNode): SheetRef {
	const sheets = sheetsOf(pane);
	return sheets[sheets.length - 1] as SheetRef;
}

export function findSheet(node: LayoutNode, sheetId: number): SheetRef | null {
	for (const pane of panesOf(node))
		for (const sheet of sheetsOf(pane))
			if (sheet.sheetId === sheetId) return sheet;
	return null;
}

/** Rewrites one Sheet's Deck, wherever that Sheet is. */
export function updateDeck(
	node: LayoutNode,
	sheetId: number,
	update: (deck: Deck | null) => Deck | null,
): LayoutNode {
	const sheet = findSheet(node, sheetId);
	if (!sheet) return node;
	return updatePane(node, sheet.paneId, (pane) => ({
		...pane,
		line: pane.line.map((rung) =>
			rung.id === sheetId ? { ...rung, deck: update(rung.deck) } : rung,
		),
		covers: pane.covers.map((cover) =>
			cover.id === sheetId
				? { ...cover, deck: update(cover.deck) }
				: cover,
		),
	}));
}

/** Every Presentation that is open as a Sheet somewhere, so its Card is not on a Deck. */
export function openIds(node: LayoutNode): ReadonlySet<number> {
	const ids = new Set<number>();
	for (const pane of panesOf(node))
		for (const sheet of sheetsOf(pane))
			if (sheet.card) ids.add(sheet.card.id);
	return ids;
}

/**
 * The live Deck a Card still has a slot in, if any: the Sheet that dealt it
 * is still in its stack and the Deck has not been swept or replaced since.
 */
export function deckHolding(node: LayoutNode, cardId: number): SheetRef | null {
	for (const pane of panesOf(node))
		for (const sheet of sheetsOf(pane))
			if (sheet.deck?.cards.some((card) => card.id === cardId))
				return sheet;
	return null;
}

export function subjectLabel(subject: Subject): string {
	return subject.kind === "Text"
		? subject.text.title
		: `${subject.note.kind} · ${subject.note.title}`;
}

/** A Note's gloss, shown after its label in a bar; a Text has none. */
export function subjectGloss(subject: Subject): string | null {
	return subject.kind === "Text" ? null : subject.note.tail.gloss;
}

export function rungLabel(rung: Rung): string {
	return rung.kind === "Sheet" ? subjectLabel(rung.card.subject) : rung.kind;
}

export function subjectOfLink(link: NoteLink): Subject {
	return link.kind === "Text"
		? { kind: "Text", text: textById(link.textId), focus: link.focus }
		: { kind: "Note", note: noteById(link.noteId) };
}

/**
 * The opening scene. Every scene starts a Rooted Pane at the end of its
 * line, Menu › Library › Text, so ← has rungs to step down; a seeded scene
 * deals a Deck for "noch", and the Sheet scene opens its first Card.
 */
export function initialLayout(
	scene: "empty" | "deck" | "sheet",
	nextId: { current: number },
	nextSheet: { current: number },
): LayoutNode {
	const text: Presentation = {
		id: nextId.current++,
		subject: { kind: "Text", text: FIRST_TEXT, focus: null },
	};
	const cards =
		scene === "empty"
			? []
			: deckFor("noch").map((note) => ({
					id: nextId.current++,
					subject: { kind: "Note" as const, note },
				}));
	const deck: Deck | null = cards.length
		? {
				word: "noch",
				cards,
				expandedId: null,
			}
		: null;
	const first = cards[0];
	return {
		kind: "Pane",
		id: ROOT_PANE,
		line: [
			{ id: nextSheet.current++, kind: "Menu", deck: null },
			{ id: nextSheet.current++, kind: "Library", deck: null },
			{ id: nextSheet.current++, kind: "Sheet", card: text, deck },
		],
		covers:
			scene === "sheet" && first
				? [{ id: nextSheet.current++, card: first, deck: null }]
				: [],
	};
}
