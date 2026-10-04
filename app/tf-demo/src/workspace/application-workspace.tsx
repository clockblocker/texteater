import {
	BAR_REM,
	createWorkspace,
	groundOf,
	panesOf,
	type WorkspaceState,
	workspaceReducer,
} from "compass";
import {
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { LibraryView } from "@/views/library-view";
import { SettingsView } from "@/views/settings-view";
import { Compass } from "@/workspace/compass/compass";
import type { MenuItem, MenuItemView } from "@/workspace/compass/subject";
import { useCompassWorkspace } from "@/workspace/compass/use-compass-workspace";
import { applicationRenderer } from "./application-renderer";
import {
	loadApplicationWorkspace,
	saveApplicationWorkspace,
} from "./application-workspace-persistence";
import {
	WorkspaceControllerProvider,
	type WorkspaceInteraction,
	WorkspaceInteractionProvider,
} from "./workspace-controller";
import {
	type WorkspaceSubject,
	workspaceSubjectFor,
} from "./workspace-subject";

/**
 * tf-demo's workspace: the Compass over the application's Subjects, with
 * one URL (tf-demo ADR 0003). Every Pane's Ground walks its line; a Rooted
 * Pane's runs Menu › Library › Text, and Settings is the Menu Item beside the
 * Library (tf-demo ADR 0008). The workspace survives a reload through
 * Workspace Persistence.
 */

const LIBRARY = "library";
const SETTINGS = "settings";

const MENU: readonly MenuItem[] = [
	{ key: LIBRARY, label: "Library" },
	{ key: SETTINGS, label: "Settings" },
];
const MENU_ITEMS: ReadonlySet<string> = new Set(MENU.map(({ key }) => key));

/** Where the workspace starts: one Rooted Pane, at the Library. */
function initialWorkspace(): WorkspaceState<WorkspaceSubject> {
	const fresh = createWorkspace<WorkspaceSubject>();
	return workspaceReducer(fresh, {
		type: "StepUp",
		paneId: fresh.activePaneId,
		to: { kind: "MenuItem", item: LIBRARY },
	});
}

/** Whether the workspace is still where it starts. */
function atStart(state: WorkspaceState<WorkspaceSubject>): boolean {
	const panes = panesOf(state.layout);
	const pane = panes[0];
	if (panes.length !== 1 || !pane || pane.covers.length) return false;
	const ground = groundOf(pane);
	return (
		pane.line.length === 2 &&
		ground.kind === "MenuItem" &&
		ground.item === LIBRARY &&
		ground.deck === null
	);
}

export function ApplicationWorkspace() {
	const workspace = useCompassWorkspace(() =>
		loadApplicationWorkspace(initialWorkspace, MENU_ITEMS),
	);
	/** A fresh Compass after starting over, so no gesture outlives its workspace. */
	const [run, setRun] = useState(0);
	const { state } = workspace;
	useEffect(() => saveApplicationWorkspace(state), [state]);
	const controller = {
		canCloseAllSheets: !atStart(state),
		closeAllSheets: () => {
			workspace.reset(initialWorkspace());
			setRun((value) => value + 1);
		},
	};
	return (
		<WorkspaceControllerProvider controller={controller}>
			<Compass
				key={run}
				workspace={workspace}
				renderer={applicationRenderer}
				menu={MENU}
				renderMenuItem={renderMenuItem}
			/>
		</WorkspaceControllerProvider>
	);
}

function renderMenuItem(item: string, view: MenuItemView<WorkspaceSubject>) {
	return (
		<MenuItemRung>
			{item === SETTINGS ? <SettingsView /> : <LibraryRung view={view} />}
		</MenuItemRung>
	);
}

/** A Menu Item's rung fills its Pane under the Pane bar and scrolls. */
function MenuItemRung({ children }: { children: ReactNode }) {
	return (
		<div
			className="flex h-full min-h-0 flex-col"
			style={{ paddingTop: `${BAR_REM.toString()}rem` }}
		>
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
				{children}
			</div>
		</div>
	);
}

/** The Library's selection is the Ground's: a Text picked or added there is its content. */
function LibraryRung({ view }: { view: MenuItemView<WorkspaceSubject> }) {
	const latest = useRef(view);
	useLayoutEffect(() => {
		latest.current = view;
	});
	const interaction = useMemo<WorkspaceInteraction>(
		() => ({
			follow: (target) => {
				if (target.kind === "Text")
					latest.current.select(workspaceSubjectFor(target));
			},
			presentCards: () => {},
		}),
		[],
	);
	return (
		<WorkspaceInteractionProvider interaction={interaction}>
			<LibraryView />
		</WorkspaceInteractionProvider>
	);
}
