import { createContext, useContext } from "react";

import type {
	PaneId,
	Sheet,
	SheetInstanceId,
	SheetWorkspaceCommand,
} from "./sheet-workspace";

export type SheetWorkspaceActions = {
	readonly dispatch: (command: SheetWorkspaceCommand) => void;
	readonly moveWithoutDragging: (
		sourcePaneId: PaneId,
		destinationPaneId: PaneId,
		sheetId: SheetInstanceId,
	) => void;
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
