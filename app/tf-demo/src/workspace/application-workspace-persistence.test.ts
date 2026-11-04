import { describe, expect, test } from "bun:test";
import {
	createWorkspace,
	isRooted,
	panesOf,
	type WorkspaceCommand,
	type WorkspaceState,
	workspaceReducer,
} from "compass";
import {
	type ApplicationWorkspaceStorage,
	loadApplicationWorkspace,
	saveApplicationWorkspace,
} from "./application-workspace-persistence";
import { SPLITS_PARKED } from "./compass/splits";
import type { WorkspaceSubject } from "./workspace-subject";

type State = WorkspaceState<WorkspaceSubject>;

const scroll = (scrollId: string): WorkspaceSubject => ({
	kind: "Scroll",
	target: { kind: "Scroll", scrollId },
});

function memoryStorage(): ApplicationWorkspaceStorage {
	const items = new Map<string, string>();
	return {
		getItem: (key) => items.get(key) ?? null,
		setItem: (key, value) => {
			items.set(key, value);
		},
	};
}

function reduce(
	state: State,
	...commands: WorkspaceCommand<WorkspaceSubject>[]
): State {
	return commands.reduce(workspaceReducer<WorkspaceSubject>, state);
}

/** A Rooted Pane at a Scroll, and a Floating Pane beside it, Active. */
function split(): State {
	const start = createWorkspace<WorkspaceSubject>();
	const rooted = start.activePaneId;
	const opened = reduce(
		start,
		{
			type: "StepUp",
			paneId: rooted,
			to: { kind: "MenuItem", item: "library" },
		},
		{
			type: "StepUp",
			paneId: rooted,
			to: { kind: "Sheet", subject: scroll("first") },
		},
		{ type: "LiftFresh", paneId: rooted, subject: scroll("second") },
		{ type: "Expand", paneId: rooted, edge: "inline-end", size: 400 },
	);
	const floating = panesOf(opened.layout).find((pane) => !isRooted(pane));
	return floating
		? reduce(opened, { type: "ActivatePane", paneId: floating.id })
		: opened;
}

describe("Workspace Persistence while splits are parked", () => {
	test.skipIf(!SPLITS_PARKED)(
		"a saved split comes back as its Rooted Pane alone",
		() => {
			const saved = split();
			const panes = panesOf(saved.layout);
			expect(panes).toHaveLength(2);
			const rooted = panes.find(isRooted);
			expect(saved.activePaneId).not.toBe(rooted?.id);

			const storage = memoryStorage();
			saveApplicationWorkspace(saved, storage);
			const loaded = loadApplicationWorkspace(
				createWorkspace,
				new Set(["library"]),
				storage,
			);
			expect(loaded.layout).toEqual(rooted as NonNullable<typeof rooted>);
			expect(loaded.activePaneId).toBe(rooted?.id ?? "");
		},
	);
});
