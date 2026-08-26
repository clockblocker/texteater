export type SheetInstanceId = string;
export type PaneId = string;

export type WorkspaceSubject =
	| { readonly kind: "Text"; readonly textId: string }
	| { readonly kind: "Note"; readonly noteId: string };

export type WorkspacePresentation = "Card" | "Sheet";

export type Sheet = {
	readonly instanceId: SheetInstanceId;
	readonly subject: WorkspaceSubject;
	readonly locked: boolean;
};

export type SheetPlacement = Omit<Sheet, "locked">;

export type Pane = {
	readonly id: PaneId;
	/** Ordered from the base to the top Sheet. */
	readonly sheets: readonly Sheet[];
};

export type SheetWorkspace = {
	readonly centralPaneId: PaneId;
	readonly activePaneId: PaneId;
	readonly panes: readonly Pane[];
};

export type SheetOpeningOrigin =
	| { readonly kind: "NavigationAnchor" }
	| { readonly kind: "Sheet"; readonly sheetId: SheetInstanceId }
	| { readonly kind: "Placement"; readonly paneId: PaneId };

export type SheetWorkspaceCommand =
	| {
			readonly type: "ActivatePane";
			readonly paneId: PaneId;
			readonly cause: "pointer" | "focus";
	  }
	| {
			readonly type: "OpenSheet";
			readonly sheet: SheetPlacement;
			readonly origin: SheetOpeningOrigin;
	  }
	| {
			readonly type: "MoveTopSheet";
			readonly sourcePaneId: PaneId;
			readonly destinationPaneId: PaneId;
			readonly sheetId: SheetInstanceId;
	  }
	| {
			readonly type: "Collapse";
			readonly paneId: PaneId;
			readonly extent: "top" | "all";
	  }
	| {
			readonly type: "RemoveSheet";
			readonly sheetId: SheetInstanceId;
	  }
	| {
			readonly type: "SetSheetLock";
			readonly sheetId: SheetInstanceId;
			readonly locked: boolean;
	  };

export type SheetWorkspaceRejection =
	| "duplicate-sheet"
	| "pane-not-found"
	| "sheet-not-found"
	| "source-sheet-is-not-top";

export type SheetWorkspaceTransition = {
	readonly command: SheetWorkspaceCommand;
	readonly workspace: SheetWorkspace;
	readonly status: "committed" | "unchanged" | "rejected";
	readonly rejection?: SheetWorkspaceRejection;
};

/**
 * Pure semantic interface for placed workspace state. Card Layers and drag
 * sessions are deliberately not representable here.
 */
export function transitionSheetWorkspace(
	workspace: SheetWorkspace,
	command: SheetWorkspaceCommand,
): SheetWorkspaceTransition {
	assertValidSheetWorkspace(workspace);
	const result = transitionValidWorkspace(workspace, command);
	assertValidSheetWorkspace(result.workspace);
	return result;
}

export function assertValidSheetWorkspace(workspace: SheetWorkspace): void {
	const paneIds = new Set<PaneId>();
	const sheetIds = new Set<SheetInstanceId>();
	if (workspace.panes.length === 0) {
		throw new Error("A Sheet workspace must contain at least one Pane.");
	}
	for (const pane of workspace.panes) {
		if (paneIds.has(pane.id)) {
			throw new Error(`Pane id ${pane.id} occurs more than once.`);
		}
		paneIds.add(pane.id);
		let lockedSheets = 0;
		for (const sheet of pane.sheets) {
			if (sheetIds.has(sheet.instanceId)) {
				throw new Error(
					`Sheet instance ${sheet.instanceId} occurs more than once.`,
				);
			}
			sheetIds.add(sheet.instanceId);
			if (sheet.locked) lockedSheets += 1;
		}
		if (lockedSheets > 1) {
			throw new Error(
				`Pane ${pane.id} contains more than one Locked Sheet.`,
			);
		}
	}
	if (!paneIds.has(workspace.centralPaneId)) {
		throw new Error("The central Pane must belong to the workspace.");
	}
	if (!paneIds.has(workspace.activePaneId)) {
		throw new Error("The Active Pane must belong to the workspace.");
	}
}

function transitionValidWorkspace(
	workspace: SheetWorkspace,
	command: SheetWorkspaceCommand,
): SheetWorkspaceTransition {
	switch (command.type) {
		case "ActivatePane":
			return activatePane(workspace, command);
		case "OpenSheet":
			return openSheet(workspace, command);
		case "MoveTopSheet":
			return moveTopSheet(workspace, command);
		case "Collapse":
			return collapseSheets(workspace, command);
		case "RemoveSheet":
			return removeSheet(workspace, command);
		case "SetSheetLock":
			return setSheetLock(workspace, command);
	}
}

function activatePane(
	workspace: SheetWorkspace,
	command: Extract<SheetWorkspaceCommand, { type: "ActivatePane" }>,
): SheetWorkspaceTransition {
	if (!findPane(workspace, command.paneId)) {
		return rejected(workspace, command, "pane-not-found");
	}
	if (workspace.activePaneId === command.paneId) {
		return unchanged(workspace, command);
	}
	return committed({ ...workspace, activePaneId: command.paneId }, command);
}

function openSheet(
	workspace: SheetWorkspace,
	command: Extract<SheetWorkspaceCommand, { type: "OpenSheet" }>,
): SheetWorkspaceTransition {
	if (findSheet(workspace, command.sheet.instanceId)) {
		return rejected(workspace, command, "duplicate-sheet");
	}
	const destinationPaneId = openingPaneId(workspace, command.origin);
	if (!destinationPaneId) {
		return rejected(
			workspace,
			command,
			command.origin.kind === "Sheet"
				? "sheet-not-found"
				: "pane-not-found",
		);
	}
	const destination = findPane(workspace, destinationPaneId);
	if (!destination) {
		return rejected(workspace, command, "pane-not-found");
	}
	const sheet: Sheet = {
		...command.sheet,
		locked: destination.sheets.length === 0,
	};
	return committed(
		updatePane(workspace, destinationPaneId, (pane) => ({
			...pane,
			sheets: [...pane.sheets, sheet],
		})),
		command,
	);
}

function moveTopSheet(
	workspace: SheetWorkspace,
	command: Extract<SheetWorkspaceCommand, { type: "MoveTopSheet" }>,
): SheetWorkspaceTransition {
	const source = findPane(workspace, command.sourcePaneId);
	const destination = findPane(workspace, command.destinationPaneId);
	if (!source || !destination) {
		return rejected(workspace, command, "pane-not-found");
	}
	const sourceTop = source.sheets.at(-1);
	if (!sourceTop || sourceTop.instanceId !== command.sheetId) {
		return rejected(
			workspace,
			command,
			findSheet(workspace, command.sheetId)
				? "source-sheet-is-not-top"
				: "sheet-not-found",
		);
	}
	if (source.id === destination.id) {
		return workspace.activePaneId === destination.id
			? unchanged(workspace, command)
			: committed(
					{ ...workspace, activePaneId: destination.id },
					command,
				);
	}
	const destinationHasLock = destination.sheets.some((sheet) => sheet.locked);
	const movedSheet: Sheet = {
		...sourceTop,
		locked:
			destination.sheets.length === 0 ||
			(sourceTop.locked && !destinationHasLock),
	};
	return committed(
		{
			...workspace,
			activePaneId: destination.id,
			panes: workspace.panes.map((pane) => {
				if (pane.id === source.id) {
					return { ...pane, sheets: pane.sheets.slice(0, -1) };
				}
				if (pane.id === destination.id) {
					return { ...pane, sheets: [...pane.sheets, movedSheet] };
				}
				return pane;
			}),
		},
		command,
	);
}

function collapseSheets(
	workspace: SheetWorkspace,
	command: Extract<SheetWorkspaceCommand, { type: "Collapse" }>,
): SheetWorkspaceTransition {
	const pane = findPane(workspace, command.paneId);
	if (!pane) return rejected(workspace, command, "pane-not-found");
	let sheets = pane.sheets;
	if (command.extent === "top") {
		const top = sheets.at(-1);
		if (!top || top.locked) return unchanged(workspace, command);
		sheets = sheets.slice(0, -1);
	} else {
		const lockedIndex = sheets.findLastIndex((sheet) => sheet.locked);
		sheets = lockedIndex === -1 ? [] : sheets.slice(0, lockedIndex + 1);
		if (sheets.length === pane.sheets.length) {
			return unchanged(workspace, command);
		}
	}
	return committed(
		updatePane(workspace, pane.id, (current) => ({ ...current, sheets })),
		command,
	);
}

function removeSheet(
	workspace: SheetWorkspace,
	command: Extract<SheetWorkspaceCommand, { type: "RemoveSheet" }>,
): SheetWorkspaceTransition {
	const match = findSheet(workspace, command.sheetId);
	if (!match) return rejected(workspace, command, "sheet-not-found");
	return committed(
		updatePane(workspace, match.pane.id, (pane) => ({
			...pane,
			sheets: pane.sheets.filter(
				(sheet) => sheet.instanceId !== command.sheetId,
			),
		})),
		command,
	);
}

function setSheetLock(
	workspace: SheetWorkspace,
	command: Extract<SheetWorkspaceCommand, { type: "SetSheetLock" }>,
): SheetWorkspaceTransition {
	const match = findSheet(workspace, command.sheetId);
	if (!match) return rejected(workspace, command, "sheet-not-found");
	if (match.sheet.locked === command.locked) {
		return unchanged(workspace, command);
	}
	return committed(
		updatePane(workspace, match.pane.id, (pane) => ({
			...pane,
			sheets: pane.sheets.map((sheet) => ({
				...sheet,
				locked:
					sheet.instanceId === command.sheetId
						? command.locked
						: command.locked
							? false
							: sheet.locked,
			})),
		})),
		command,
	);
}

function openingPaneId(
	workspace: SheetWorkspace,
	origin: SheetOpeningOrigin,
): PaneId | undefined {
	switch (origin.kind) {
		case "NavigationAnchor":
			return workspace.centralPaneId;
		case "Placement":
			return origin.paneId;
		case "Sheet":
			return findSheet(workspace, origin.sheetId)?.pane.id;
	}
}

export function findPane(
	workspace: SheetWorkspace,
	paneId: PaneId,
): Pane | undefined {
	return workspace.panes.find((pane) => pane.id === paneId);
}

export function findSheet(
	workspace: SheetWorkspace,
	sheetId: SheetInstanceId,
): { readonly pane: Pane; readonly sheet: Sheet } | undefined {
	for (const pane of workspace.panes) {
		const sheet = pane.sheets.find(
			(candidate) => candidate.instanceId === sheetId,
		);
		if (sheet) return { pane, sheet };
	}
	return undefined;
}

function updatePane(
	workspace: SheetWorkspace,
	paneId: PaneId,
	update: (pane: Pane) => Pane,
): SheetWorkspace {
	return {
		...workspace,
		panes: workspace.panes.map((pane) =>
			pane.id === paneId ? update(pane) : pane,
		),
	};
}

function committed(
	workspace: SheetWorkspace,
	command: SheetWorkspaceCommand,
): SheetWorkspaceTransition {
	return { command, status: "committed", workspace };
}

function unchanged(
	workspace: SheetWorkspace,
	command: SheetWorkspaceCommand,
): SheetWorkspaceTransition {
	return { command, status: "unchanged", workspace };
}

function rejected(
	workspace: SheetWorkspace,
	command: SheetWorkspaceCommand,
	rejection: SheetWorkspaceRejection,
): SheetWorkspaceTransition {
	return { command, rejection, status: "rejected", workspace };
}
