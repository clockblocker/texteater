import { createContext, type ReactNode, useContext } from "react";

import type {
	NotePresentationContext,
	WorkspaceTarget,
} from "./sheet-workspace";

export type WorkspaceCardTarget = {
	readonly key: string;
	readonly target: WorkspaceTarget;
	readonly presentationContext?: NotePresentationContext;
};

type PresentCardsOptions = {
	/** The clicked Segment: the Sheet it is in is dealt the Cards. */
	readonly anchor?: Element | null;
	/** The selection the Cards were dealt for, such as the clicked Segment's key. */
	readonly selection?: string;
};

/**
 * What a view may ask of the workspace it is drawn in. `follow` pushes a
 * Link's destination as a Cover; `presentCards` deals a clicked Segment's
 * Cards to the Sheet it was clicked in, or, with no anchor, brings the Deck
 * holding this Presentation up to date by key as a Resolution progresses.
 */
export type WorkspaceInteraction = {
	readonly follow: (
		target: WorkspaceTarget,
		presentationContext?: NotePresentationContext,
	) => void;
	readonly presentCards: (
		cards: readonly WorkspaceCardTarget[],
		options?: PresentCardsOptions,
	) => void;
};

/** Workspace-wide commands for the application's settings. */
type WorkspaceController = {
	readonly canCloseAllSheets: boolean;
	/** Start over: one Rooted Pane at the Library. */
	readonly closeAllSheets: () => void;
};

const WorkspaceControllerContext = createContext<WorkspaceController | null>(
	null,
);
const WorkspaceInteractionContext = createContext<WorkspaceInteraction | null>(
	null,
);
/** The selection the drawing Sheet's Deck was dealt for; see `useDealtSelection`. */
const DealtSelectionContext = createContext<string | null>(null);

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
	dealtSelection = null,
	children,
}: {
	readonly interaction: WorkspaceInteraction;
	readonly dealtSelection?: string | null;
	readonly children: ReactNode;
}) {
	return (
		<WorkspaceInteractionContext.Provider value={interaction}>
			<DealtSelectionContext.Provider value={dealtSelection}>
				{children}
			</DealtSelectionContext.Provider>
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

/**
 * The selection this Sheet's live Deck was dealt for, to light in its
 * Segments; `null` once the Deck is swept or while the Sheet is covered.
 */
export function useDealtSelection(): string | null {
	return useContext(DealtSelectionContext);
}

export function useWorkspaceController(): WorkspaceController {
	const controller = useContext(WorkspaceControllerContext);
	if (!controller) {
		throw new Error(
			"useWorkspaceController must be used inside an ApplicationWorkspace.",
		);
	}
	return controller;
}
