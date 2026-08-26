import {
	type CardCandidate,
	type CardLayer,
	dismissCardLayer,
	reconcileCardLayers,
	removeLayerCard,
	replaceCardLayer,
	replaceLayerCardSubject,
} from "./card-layers";
import {
	type PaneId,
	type SheetWorkspace,
	type SheetWorkspaceCommand,
	transitionSheetWorkspace,
	type WorkspaceSubject,
} from "./sheet-workspace";

export type WorkspaceSession = {
	readonly workspace: SheetWorkspace;
	readonly cardLayers: readonly CardLayer[];
	readonly announcement: string;
};

export type WorkspaceSubjectLocation =
	| { readonly kind: "Sheet"; readonly sheetId: string }
	| {
			readonly kind: "Card";
			readonly paneId: PaneId;
			readonly cardId: string;
	  };

export type WorkspaceSessionAction =
	| { readonly type: "Command"; readonly command: SheetWorkspaceCommand }
	| {
			readonly type: "OpenCardLayer";
			readonly paneId: PaneId;
			readonly originSheetId: string;
			readonly cards: readonly CardCandidate[];
	  }
	| { readonly type: "DismissCardLayer"; readonly paneId: PaneId }
	| { readonly type: "DismissAllCardLayers" }
	| {
			readonly type: "PlaceCard";
			readonly sourcePaneId: PaneId;
			readonly destinationPaneId: PaneId;
			readonly cardId: string;
			readonly sheetId: string;
	  }
	| {
			readonly type: "ReturnCard";
			readonly paneId: PaneId;
			readonly cardId: string;
	  }
	| {
			readonly type: "ReplaceSubject";
			readonly location: WorkspaceSubjectLocation;
			readonly subject: WorkspaceSubject;
	  }
	| { readonly type: "RevealNavigationAnchor" };

export function createWorkspaceSession(
	workspace: SheetWorkspace,
): WorkspaceSession {
	return {
		workspace,
		cardLayers: [],
		announcement: "Card and Sheet workspace ready.",
	};
}

export function reduceWorkspaceSession(
	state: WorkspaceSession,
	action: WorkspaceSessionAction,
): WorkspaceSession {
	switch (action.type) {
		case "OpenCardLayer":
			return {
				...state,
				cardLayers: replaceCardLayer(state.cardLayers, action),
				announcement: `Opened ${action.cards.length} Cards in ${action.paneId} Pane.`,
			};
		case "DismissCardLayer":
			return {
				...state,
				cardLayers: dismissCardLayer(state.cardLayers, action.paneId),
				announcement: `Dismissed Cards in ${action.paneId} Pane.`,
			};
		case "DismissAllCardLayers":
			return {
				...state,
				cardLayers: [],
				announcement: "Dismissed all Card Layers.",
			};
		case "PlaceCard": {
			const layer = state.cardLayers.find(
				(candidate) => candidate.paneId === action.sourcePaneId,
			);
			const card = layer?.cards.find(
				(candidate) => candidate.id === action.cardId,
			);
			if (!card) return state;
			const transition = transitionSheetWorkspace(state.workspace, {
				type: "OpenSheet",
				sheet: { instanceId: action.sheetId, subject: card.subject },
				origin: { kind: "Placement", paneId: action.destinationPaneId },
			});
			if (transition.status !== "committed") return state;
			const remaining = removeLayerCard(
				state.cardLayers,
				action.sourcePaneId,
				action.cardId,
			);
			return {
				workspace: transition.workspace,
				cardLayers: reconcileCardLayers(
					remaining,
					transition.workspace,
				),
				announcement: `Placed ${subjectLabel(card.subject)} Card in ${action.destinationPaneId} Pane as a Sheet.`,
			};
		}
		case "ReturnCard": {
			const card = state.cardLayers
				.find((layer) => layer.paneId === action.paneId)
				?.cards.find((candidate) => candidate.id === action.cardId);
			if (!card) return state;
			return {
				...state,
				announcement: `Returned ${subjectLabel(card.subject)} Card to its Card Layer.`,
			};
		}
		case "ReplaceSubject":
			return replaceSubject(state, action);
		case "RevealNavigationAnchor":
			return revealNavigationAnchor(state);
		case "Command":
			return applyWorkspaceCommand(state, action.command);
	}
}

function replaceSubject(
	state: WorkspaceSession,
	action: Extract<WorkspaceSessionAction, { type: "ReplaceSubject" }>,
): WorkspaceSession {
	if (action.location.kind === "Card") {
		return {
			...state,
			cardLayers: replaceLayerCardSubject(
				state.cardLayers,
				action.location.paneId,
				action.location.cardId,
				action.subject,
			),
			announcement: "Updated Card presentation.",
		};
	}
	return applyWorkspaceCommand(state, {
		type: "ReplaceSheetSubject",
		sheetId: action.location.sheetId,
		subject: action.subject,
	});
}

function revealNavigationAnchor(state: WorkspaceSession): WorkspaceSession {
	const centralPaneId = state.workspace.centralPaneId;
	const collapsed = applyWorkspaceCommand(state, {
		type: "Collapse",
		paneId: centralPaneId,
		extent: "all",
	});
	const activated = applyWorkspaceCommand(collapsed, {
		type: "ActivatePane",
		paneId: centralPaneId,
		cause: "pointer",
	});
	const centralPane = activated.workspace.panes.find(
		(pane) => pane.id === centralPaneId,
	);
	return {
		...activated,
		announcement:
			centralPane?.sheets.length === 0
				? "Revealed the Library Navigation Anchor."
				: "A Locked Sheet is covering the Library Navigation Anchor.",
	};
}

function applyWorkspaceCommand(
	state: WorkspaceSession,
	command: SheetWorkspaceCommand,
): WorkspaceSession {
	const transition = transitionSheetWorkspace(state.workspace, command);
	if (transition.status === "unchanged") return state;
	if (transition.status === "rejected") {
		return {
			...state,
			announcement: `Workspace command rejected: ${transition.rejection}.`,
		};
	}
	return {
		...state,
		workspace: transition.workspace,
		cardLayers: reconcileCardLayers(state.cardLayers, transition.workspace),
		announcement: announcementFor(command),
	};
}

function announcementFor(command: SheetWorkspaceCommand): string {
	switch (command.type) {
		case "ActivatePane":
			return `${command.paneId} Pane is Active.`;
		case "OpenSheet":
			return `Opened Sheet ${command.sheet.instanceId}.`;
		case "MoveTopSheet":
			return `Moved Sheet ${command.sheetId} to ${command.destinationPaneId} Pane.`;
		case "Collapse":
			return `Collapsed ${command.extent} in ${command.paneId} Pane.`;
		case "RemoveSheet":
			return `Removed Sheet ${command.sheetId}.`;
		case "ReplaceSheetSubject":
			return `Updated Sheet ${command.sheetId}.`;
		case "SetSheetLock":
			return `${command.locked ? "Locked" : "Unlocked"} Sheet ${command.sheetId}.`;
	}
}

function subjectLabel(subject: WorkspaceSubject): string {
	return subject.kind;
}
