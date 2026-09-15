import { createContext, type ReactNode, useContext } from "react";

import type {
	SurfaceNotePresentationContext,
	WorkspaceTarget,
} from "./sheet-workspace";

export type WorkspaceCardTarget = {
	readonly key: string;
	readonly target: WorkspaceTarget;
	readonly presentationContext?: SurfaceNotePresentationContext;
};

export type PresentCardsOptions = {
	/** Element the deck should present below, e.g. the clicked segment. */
	readonly anchor?: Element | null;
};

export type WorkspaceInteraction = {
	readonly follow: (target: WorkspaceTarget) => void;
	readonly presentCards: (
		cards: readonly WorkspaceCardTarget[],
		options?: PresentCardsOptions,
	) => void;
	readonly reconcile: (target: WorkspaceTarget) => void;
};

type WorkspaceController = {
	readonly activeTextId: string | null;
	readonly isLibraryVisible: boolean;
	readonly revealLibrary: () => void;
};

const WorkspaceControllerContext = createContext<WorkspaceController | null>(
	null,
);
const WorkspaceInteractionContext = createContext<WorkspaceInteraction | null>(
	null,
);

/** Shares shell navigation with the workspace renderer. */
export function WorkspaceControllerProvider({
	controller,
	children,
}: {
	readonly controller: WorkspaceController;
	readonly children: ReactNode;
}) {
	return (
		<WorkspaceControllerContext.Provider value={controller}>
			{children}
		</WorkspaceControllerContext.Provider>
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
			"useWorkspaceController must be used inside an ApplicationWorkspaceProvider.",
		);
	}
	return controller;
}
