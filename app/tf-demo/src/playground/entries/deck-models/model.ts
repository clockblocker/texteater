import type { MotionValue } from "motion/react";
import * as Panes from "react-resizable-panels/workspace";
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

/**
 * The Compass model's own types: its dummy Subjects and its gestures. The
 * Pane algebra is the battery's workspace reducer, bound here to them.
 */

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

/* The battery's Pane algebra, over the playground's dummy Subjects. */

export type Presentation = Panes.Presentation<Subject>;

export type Deck = Panes.Deck<Subject>;

export type Rung = Panes.Rung<Subject>;

export type PaneNode = Panes.PaneNode<Subject>;

export type LayoutNode = Panes.LayoutNode<Subject>;

export type Workspace = Panes.WorkspaceState<Subject>;

export type WorkspaceCommand = Panes.WorkspaceCommand<Subject>;

export type Edge = Panes.Edge;

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
type Phase = "pressed" | "swiping" | "held";

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
export type SheetRef = Panes.SheetRef<Subject> & {
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
	readonly deckSheet: string | null;
	/**
	 * Where a release with nothing under it sends the Note: back to its
	 * slot on the Deck, back to the Sheet it was lifted out of, closed (a
	 * Cover whose Card is on no live Deck), or away — a Card lifted from a
	 * Link or a Segment came from nowhere.
	 */
	readonly home: Panes.HeldHome;
	phase: Phase;
	/** Lifted out of a Sheet or from nowhere, rather than picked off a Deck. */
	readonly lifted: boolean;
	v: { vx: number; vy: number };
	last: { x: number; y: number; t: number };
	/** Where the hand was when `v` last took a reading. */
	sampled: { x: number; y: number; t: number };
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

export const ROOT_PANE = "root";

/**
 * The ghost Pane a Held Card would spawn if dropped on an edge, inserted
 * while it hovers so the other Panes make room. Minted ids never take it.
 */
export const PREVIEW_PANE = "preview";

/** The Sheet id every ghost wears, Cover or Ground; never a real Sheet's. */
export const PREVIEW_SHEET = "preview";

/** Every Sheet in a Pane, bottom first, with its ghosts marked. */
export function sheetsOf(pane: PaneNode): readonly SheetRef[] {
	return Panes.sheetsOf(pane).map((sheet) => ({
		...sheet,
		preview: sheet.sheetId === PREVIEW_SHEET,
	}));
}

export function topSheetOf(pane: PaneNode): SheetRef {
	return sheetsOf(pane).at(-1) as SheetRef;
}

export function findSheet(node: LayoutNode, sheetId: string): SheetRef | null {
	const sheet = Panes.findSheet(node, sheetId);
	return sheet ? { ...sheet, preview: sheetId === PREVIEW_SHEET } : null;
}

export function deckHolding(
	node: LayoutNode,
	presentationId: string,
): SheetRef | null {
	const sheet = Panes.deckHolding(node, presentationId);
	return sheet ? { ...sheet, preview: false } : null;
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
	return rung.kind === "Sheet"
		? subjectLabel(rung.presentation.subject)
		: rung.kind === "MenuItem"
			? rung.item
			: rung.kind;
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
export function initialWorkspace(scene: "empty" | "deck" | "sheet"): Workspace {
	const reduce = (state: Workspace, ...commands: WorkspaceCommand[]) =>
		commands.reduce(Panes.workspaceReducer<Subject>, state);
	const atText = reduce(
		Panes.createWorkspace<Subject>({ paneId: ROOT_PANE }),
		{
			type: "StepUp",
			paneId: ROOT_PANE,
			to: { kind: "MenuItem", item: "Library" },
		},
		{
			type: "StepUp",
			paneId: ROOT_PANE,
			to: {
				kind: "Sheet",
				subject: { kind: "Text", text: FIRST_TEXT, focus: null },
			},
		},
	);
	if (scene === "empty") return atText;
	const ground = Panes.groundOf(rootOf(atText)).id;
	const dealt = reduce(atText, {
		type: "Deal",
		sheetId: ground,
		selection: "noch",
		cards: deckFor("noch").map((note) => ({
			subject: { kind: "Note", note },
		})),
	});
	const first = Panes.groundOf(rootOf(dealt)).deck?.cards[0];
	if (scene === "deck" || !first) return dealt;
	return reduce(
		dealt,
		{ type: "LiftCard", sheetId: ground, presentationId: first.id },
		{ type: "Expand", paneId: ROOT_PANE },
	);
}

function rootOf(state: Workspace): PaneNode {
	const pane = Panes.findPane(state.layout, ROOT_PANE);
	if (!pane) throw new Error("The root Pane is missing");
	return pane;
}
