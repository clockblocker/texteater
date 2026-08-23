import type { ComponentType } from "react";

import type {
	PaneId,
	Sheet,
	SheetInstanceId,
	SheetWorkspace,
} from "./sheet-workspace";

export const SHEET_WORKSPACE_VARIANTS = [
	"motion",
	"dnd-kit",
	"pragmatic",
	"react-aria",
] as const;

export type SheetWorkspaceVariant = (typeof SHEET_WORKSPACE_VARIANTS)[number];

export type SheetMoveRequest = {
	readonly sourcePaneId: PaneId;
	readonly destinationPaneId: PaneId;
	readonly sheetId: SheetInstanceId;
};

export type SheetWorkspaceAdapterProps = {
	readonly workspace: SheetWorkspace;
	readonly onMove: (request: SheetMoveRequest) => void;
	readonly onPreviewCandidate: (sheet: Sheet | null) => void;
};

export type SheetWorkspaceAdapter = ComponentType<SheetWorkspaceAdapterProps>;

export const SHEET_WORKSPACE_VARIANT_LABEL: Record<
	SheetWorkspaceVariant,
	string
> = {
	motion: "Motion",
	"dnd-kit": "dnd-kit",
	pragmatic: "Pragmatic DnD",
	"react-aria": "React Aria DnD",
};

export function isSheetWorkspaceVariant(
	value: string | undefined,
): value is SheetWorkspaceVariant {
	return SHEET_WORKSPACE_VARIANTS.some((variant) => variant === value);
}
