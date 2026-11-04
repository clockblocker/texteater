import {
	createWorkspace,
	type WorkspaceState,
	workspaceReducer,
} from "compass";
import type { MenuItem } from "./compass/subject";
import type { WorkspaceSubject } from "./workspace-subject";

/**
 * The Menu's items: the Library and Settings beside it (tf-demo ADR 0008),
 * and where the workspace starts.
 */
export const LIBRARY = "library";
export const SETTINGS = "settings";

export const MENU: readonly MenuItem[] = [
	{ key: LIBRARY, label: "Library" },
	{ key: SETTINGS, label: "Settings" },
];
export const MENU_ITEMS: ReadonlySet<string> = new Set(
	MENU.map(({ key }) => key),
);

/** Where the workspace starts: one Rooted Pane, at the Library. */
export function initialWorkspace(): WorkspaceState<WorkspaceSubject> {
	const fresh = createWorkspace<WorkspaceSubject>();
	return workspaceReducer(fresh, {
		type: "StepUp",
		paneId: fresh.activePaneId,
		to: { kind: "MenuItem", item: LIBRARY },
	});
}
