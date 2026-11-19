import * as Panes from "compass";
import {
	type DummyNote,
	type DummyScroll,
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
 * The opening workspace: a Rooted Pane at the end of its line, Menu ›
 * Library › Scroll, so ← has rungs to step down.
 */
export function initialWorkspace(): Workspace {
	const reduce = (
		state: Workspace,
		...commands: Panes.WorkspaceCommand<Subject>[]
	) => commands.reduce(Panes.workspaceReducer<Subject>, state);
	return reduce(
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
}
