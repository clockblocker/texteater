import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
} from "react";

import type { CardCandidate } from "./card-layers";
import {
	findPane,
	type SheetWorkspace,
	type WorkspaceTarget,
	workspaceSubjectFor,
} from "./sheet-workspace";
import {
	loadSheetWorkspace,
	saveSheetWorkspace,
	type WorkspaceStorage,
} from "./workspace-persistence";
import {
	createWorkspaceSession,
	reduceWorkspaceSession,
	type WorkspaceSession,
	type WorkspaceSessionAction,
} from "./workspace-session";

export type WorkspaceCardTarget = {
	readonly key: string;
	readonly target: WorkspaceTarget;
};

export type WorkspaceInteraction = {
	readonly follow: (target: WorkspaceTarget) => void;
	readonly presentCards: (cards: readonly WorkspaceCardTarget[]) => void;
	readonly reconcile: (target: WorkspaceTarget) => void;
};

type WorkspaceRuntime = {
	readonly session: WorkspaceSession;
	readonly dispatch: React.Dispatch<WorkspaceSessionAction>;
};

type WorkspaceController = {
	readonly activeTextId: string | null;
	readonly isLibraryVisible: boolean;
	readonly revealLibrary: () => void;
};

const WorkspaceRuntimeContext = createContext<WorkspaceRuntime | null>(null);
const WorkspaceControllerContext = createContext<WorkspaceController | null>(
	null,
);
const WorkspaceInteractionContext = createContext<WorkspaceInteraction | null>(
	null,
);

export const PASSIVE_WORKSPACE_INTERACTION: WorkspaceInteraction = {
	follow: () => {},
	presentCards: () => {},
	reconcile: () => {},
};

export function WorkspaceProvider({
	initialWorkspace,
	storage,
	children,
}: {
	readonly initialWorkspace: SheetWorkspace;
	readonly storage?: WorkspaceStorage | null;
	readonly children: ReactNode;
}) {
	const [session, dispatch] = useReducer(
		reduceWorkspaceSession,
		{ initialWorkspace, storage },
		({ initialWorkspace: fallback, storage: configuredStorage }) =>
			createWorkspaceSession(
				loadSheetWorkspace(fallback, configuredStorage),
			),
	);
	useEffect(() => {
		saveSheetWorkspace(session.workspace, storage);
	}, [session.workspace, storage]);

	const revealLibrary = useCallback(() => {
		dispatch({ type: "RevealNavigationAnchor" });
	}, []);
	const activePane = findPane(
		session.workspace,
		session.workspace.activePaneId,
	);
	const activeTarget = activePane?.sheets.at(-1)?.subject.target;
	const centralPane = findPane(
		session.workspace,
		session.workspace.centralPaneId,
	);
	const controller = useMemo<WorkspaceController>(
		() => ({
			activeTextId:
				activeTarget?.kind === "Text" ? activeTarget.textId : null,
			isLibraryVisible:
				session.workspace.activePaneId ===
					session.workspace.centralPaneId &&
				centralPane?.sheets.length === 0,
			revealLibrary,
		}),
		[
			activeTarget,
			centralPane?.sheets.length,
			revealLibrary,
			session.workspace.activePaneId,
			session.workspace.centralPaneId,
		],
	);
	const runtime = useMemo(() => ({ session, dispatch }), [session]);

	return (
		<WorkspaceRuntimeContext.Provider value={runtime}>
			<WorkspaceControllerContext.Provider value={controller}>
				{children}
			</WorkspaceControllerContext.Provider>
		</WorkspaceRuntimeContext.Provider>
	);
}

export function WorkspaceInteractionProvider({
	interaction,
	children,
}: {
	readonly interaction: WorkspaceInteraction;
	readonly children: ReactNode;
}) {
	return (
		<WorkspaceInteractionContext.Provider value={interaction}>
			{children}
		</WorkspaceInteractionContext.Provider>
	);
}

export function useWorkspaceInteraction(): WorkspaceInteraction {
	const interaction = useContext(WorkspaceInteractionContext);
	if (!interaction) {
		throw new Error(
			"useWorkspaceInteraction must be used inside a workspace presentation.",
		);
	}
	return interaction;
}

export function useWorkspaceController(): WorkspaceController {
	const controller = useContext(WorkspaceControllerContext);
	if (!controller) {
		throw new Error(
			"useWorkspaceController must be used inside a WorkspaceProvider.",
		);
	}
	return controller;
}

export function useWorkspaceRuntime(): WorkspaceRuntime {
	const runtime = useContext(WorkspaceRuntimeContext);
	if (!runtime) {
		throw new Error(
			"useWorkspaceRuntime must be used inside a WorkspaceProvider.",
		);
	}
	return runtime;
}

export function cardCandidatesFor(
	cards: readonly WorkspaceCardTarget[],
): readonly CardCandidate[] {
	return cards.map((card) => ({
		key: card.key,
		subject: workspaceSubjectFor(card.target),
	}));
}
