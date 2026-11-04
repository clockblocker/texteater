import type { WorkspaceState } from "compass";
import * as Atom from "effect/reactivity/Atom";
import { initialWorkspace, MENU_ITEMS } from "./application-menu";
import {
	loadApplicationWorkspace,
	saveApplicationWorkspace,
} from "./application-workspace-persistence";
import type { WorkspaceSubject } from "./workspace-subject";

/**
 * tf-demo's workspace, kept by Workspace Persistence (tf-demo ADR 0003). Its
 * first read loads the saved workspace, or the start when nothing valid is
 * saved, and writes it straight back; every write saves. The Compass sends
 * commands through `useCompassWorkspace`, which reduces and sets it.
 *
 * It is not keepAlive: once the workspace unmounts, the registry drops it,
 * and the next mount loads the saved workspace again, as a fresh
 * `useState` would. A Held Card never survives that, since a gesture is
 * never saved.
 */
export const applicationWorkspaceAtom = Atom.writable(
	(): WorkspaceState<WorkspaceSubject> => {
		const loaded = loadApplicationWorkspace(initialWorkspace, MENU_ITEMS);
		saveApplicationWorkspace(loaded);
		return loaded;
	},
	(ctx, next: WorkspaceState<WorkspaceSubject>) => {
		ctx.setSelf(next);
		saveApplicationWorkspace(next);
	},
);
