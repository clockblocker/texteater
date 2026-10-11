import * as Panes from "compass";
import {
	type DummyNote,
	type DummyScroll,
	deckFor,
	FIRST_SCROLL,
	type NoteLink,
	noteById,
	type ScrollFocus,
	scrollById,
} from "./dummy";

/**
 * The Compass playground's dummy Subjects, and its opening scenes. The
 * Pane algebra is the battery's workspace reducer, and the renderer is
 * tf-demo's Compass; both are bound here to these Subjects.
 */

export type Subject =
	| { readonly kind: "Note"; readonly note: DummyNote }
	| {
			readonly kind: "Scroll";
			readonly scroll: DummyScroll;
			readonly focus: ScrollFocus | null;
	  };

type Workspace = Panes.WorkspaceState<Subject>;

export const ROOT_PANE = "root";

/** The Menu Item listing the Scrolls. */
export const LIBRARY = "library";

export function subjectLabel(subject: Subject): string {
	return subject.kind === "Scroll"
		? subject.scroll.title
		: `${subject.note.kind} · ${subject.note.title}`;
}

/** A Note's gloss, shown after its title; a Scroll has none. */
export function subjectGloss(subject: Subject): string | null {
	return subject.kind === "Scroll" ? null : subject.note.tail.gloss;
}

export function subjectOfLink(link: NoteLink): Subject {
	return link.kind === "Scroll"
		? {
				kind: "Scroll",
				scroll: scrollById(link.scrollId),
				focus: link.focus,
			}
		: { kind: "Note", note: noteById(link.noteId) };
}

/**
 * The opening scene. Every scene starts a Rooted Pane at the end of its
 * line, Menu › Library › Scroll, so ← has rungs to step down; a seeded scene
 * deals a Deck for "noch", and the Sheet scene opens its first Card.
 */
export function initialWorkspace(scene: "empty" | "deck" | "sheet"): Workspace {
	const reduce = (
		state: Workspace,
		...commands: Panes.WorkspaceCommand<Subject>[]
	) => commands.reduce(Panes.workspaceReducer<Subject>, state);
	const atScroll = reduce(
		Panes.createWorkspace<Subject>({ paneId: ROOT_PANE }),
		{
			type: "StepUp",
			paneId: ROOT_PANE,
			to: { kind: "MenuItem", item: LIBRARY },
		},
		{
			type: "StepUp",
			paneId: ROOT_PANE,
			to: {
				kind: "Sheet",
				subject: { kind: "Scroll", scroll: FIRST_SCROLL, focus: null },
			},
		},
	);
	if (scene === "empty") return atScroll;
	const ground = Panes.groundOf(rootOf(atScroll)).id;
	const dealt = reduce(atScroll, {
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

function rootOf(state: Workspace): Panes.PaneNode<Subject> {
	const pane = Panes.findPane(state.layout, ROOT_PANE);
	if (!pane) throw new Error("The root Pane is missing");
	return pane;
}
