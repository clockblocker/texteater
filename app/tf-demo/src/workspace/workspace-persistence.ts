import {
	assertValidSheetWorkspace,
	isWorkspaceSubject,
	type SheetWorkspace,
} from "./sheet-workspace";

const WORKSPACE_STORAGE_KEY = "tf-demo.workspace.v1";

export type WorkspaceStorage = Pick<Storage, "getItem" | "setItem">;

export function loadSheetWorkspace(
	fallback: SheetWorkspace,
	storage: WorkspaceStorage | null = browserStorage(),
): SheetWorkspace {
	if (!storage) return fallback;
	try {
		const serialized = storage.getItem(WORKSPACE_STORAGE_KEY);
		if (!serialized) return fallback;
		const value: unknown = JSON.parse(serialized);
		if (!isPersistedSheetWorkspace(value)) return fallback;
		assertValidSheetWorkspace(value);
		return value;
	} catch {
		return fallback;
	}
}

export function saveSheetWorkspace(
	workspace: SheetWorkspace,
	storage: WorkspaceStorage | null = browserStorage(),
): void {
	if (!storage) return;
	try {
		storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
	} catch {
		// Browser storage can be disabled or unavailable; the live session remains valid.
	}
}

function browserStorage(): WorkspaceStorage | null {
	try {
		return typeof window === "undefined" ? null : window.localStorage;
	} catch {
		return null;
	}
}

function isPersistedSheetWorkspace(value: unknown): value is SheetWorkspace {
	if (!isRecord(value)) return false;
	if (
		typeof value.centralPaneId !== "string" ||
		typeof value.activePaneId !== "string" ||
		!Array.isArray(value.panes)
	) {
		return false;
	}
	return value.panes.every(
		(pane) =>
			isRecord(pane) &&
			typeof pane.id === "string" &&
			Array.isArray(pane.sheets) &&
			pane.sheets.every(
				(sheet) =>
					isRecord(sheet) &&
					typeof sheet.instanceId === "string" &&
					typeof sheet.locked === "boolean" &&
					isWorkspaceSubject(sheet.subject),
			),
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
