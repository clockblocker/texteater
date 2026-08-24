import { createContext, useContext } from "react";

import type { PaneId, Sheet, SheetWorkspaceCommand } from "./sheet-workspace";

export type SheetWorkspaceActions = {
	readonly dispatch: (command: SheetWorkspaceCommand) => void;
	readonly cardOverlayContainer: HTMLDivElement | null;
	readonly cardDropTargetPaneId: PaneId | null;
	readonly setCardDropTargetPaneId: (paneId: PaneId | null) => void;
	readonly onPreviewCandidate: (sheet: Sheet | null) => void;
};

const SheetWorkspaceActionsContext = createContext<
	SheetWorkspaceActions | undefined
>(undefined);

export const SheetWorkspaceActionsProvider =
	SheetWorkspaceActionsContext.Provider;

export function useSheetWorkspaceActions(): SheetWorkspaceActions {
	const value = useContext(SheetWorkspaceActionsContext);
	if (!value) {
		throw new Error(
			"Sheet workspace components require SheetWorkspaceActionsProvider.",
		);
	}
	return value;
}
