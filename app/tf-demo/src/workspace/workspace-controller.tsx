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
	readonly follow: (
		target: WorkspaceTarget,
		presentationContext?: SurfaceNotePresentationContext,
	) => void;
	readonly presentCards: (
		cards: readonly WorkspaceCardTarget[],
		options?: PresentCardsOptions,
	) => void;
	readonly reconcile: (target: WorkspaceTarget) => void;
};

/** A pending arrival gesture for the current Presentation, acknowledged once consumed. */
export type OccurrenceRevealHandle = {
	readonly attestationId: string;
	readonly acknowledge: () => void;
};

type WorkspaceController = {
	readonly activeTextId: string | null;
	readonly isLibraryVisible: boolean;
	readonly revealLibrary: () => void;
	readonly canCloseAllSheets: boolean;
	readonly closeAllSheets: () => void;
};

const WorkspaceControllerContext = createContext<WorkspaceController | null>(
	null,
);
const WorkspaceInteractionContext = createContext<WorkspaceInteraction | null>(
	null,
);
const OccurrenceRevealContext = createContext<OccurrenceRevealHandle | null>(
	null,
);

export function OccurrenceRevealProvider({
	reveal,
	children,
}: {
	readonly reveal: OccurrenceRevealHandle | null;
	readonly children: ReactNode;
}) {
	return (
		<OccurrenceRevealContext.Provider value={reveal}>
			{children}
		</OccurrenceRevealContext.Provider>
	);
}

/** Null when nothing is pending, or outside a workspace Presentation. */
export function useOccurrenceReveal(): OccurrenceRevealHandle | null {
	return useContext(OccurrenceRevealContext);
}

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
