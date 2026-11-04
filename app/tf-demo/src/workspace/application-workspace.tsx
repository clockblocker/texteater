import { RegistryContext } from "@effect/atom-react";
import { BAR_REM, groundOf, panesOf, type WorkspaceState } from "compass";
import {
	type ReactNode,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { LibraryView } from "@/views/library-view";
import { SettingsView } from "@/views/settings-view";
import { Compass } from "@/workspace/compass/compass";
import type { MenuItemView } from "@/workspace/compass/subject";
import { useCompassWorkspace } from "@/workspace/compass/use-compass-workspace";
import { initialWorkspace, LIBRARY, MENU, SETTINGS } from "./application-menu";
import { applicationRenderer } from "./application-renderer";
import { connectWorkspaceHistory } from "./connect-workspace-history";
import { applicationWorkspaceAtom } from "./workspace-atoms";
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
 * tf-demo's workspace: the Compass over the application's Subjects. Every
 * Pane's Ground walks its line; a Rooted Pane's runs Menu › Library ›
 * Section › … › Scroll, and Settings is the Menu Item beside the Library
 * (tf-demo ADR 0008). The URL is the Pane's Address, and the browser's Back
 * and Forward walk its Sheet Stack (tf-demo ADR 0015). The workspace
 * survives a reload through Workspace Persistence, which
 * `applicationWorkspaceAtom` keeps.
 */

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
	const workspace = useCompassWorkspace(applicationWorkspaceAtom);
	/**
	 * A fresh Compass after starting over, so no gesture outlives its
	 * workspace. The workspace atom lives above this key and is reset, not
	 * remounted.
	 */
	const [run, setRun] = useState(0);
	const registry = useContext(RegistryContext);
	const cancelGesture = useRef<(() => void) | null>(null);
	useEffect(
		() =>
			connectWorkspaceHistory(registry, () => cancelGesture.current?.()),
		[registry],
	);
	const { state } = workspace;
	const controller = {
		canCloseAllSheets: !atStart(state),
		closeAllSheets: () => {
			/* the counter runs on, so no new Presentation takes the id of
			   one the browser's history still names */
			const fresh = initialWorkspace();
			workspace.reset({
				...fresh,
				nextId: Math.max(fresh.nextId, workspace.current().nextId),
			});
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
				cancelGestureRef={cancelGesture}
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

/**
 * The Library's selection is the Ground's: a Section or a Scroll picked
 * there, or a Scroll added, is its content.
 */
function LibraryRung({ view }: { view: MenuItemView<WorkspaceSubject> }) {
	const latest = useRef(view);
	useLayoutEffect(() => {
		latest.current = view;
	});
	const interaction = useMemo<WorkspaceInteraction>(
		() => ({
			follow: (target) => {
				if (target.kind === "Scroll" || target.kind === "Section")
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
