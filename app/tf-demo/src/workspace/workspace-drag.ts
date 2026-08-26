import type {
	PaneId,
	SheetWorkspace,
	WorkspaceSubject,
} from "./sheet-workspace";

export type WorkspaceDragSource =
	| {
			readonly kind: "Sheet";
			readonly id: string;
			readonly paneId: PaneId;
			readonly subject: WorkspaceSubject;
			readonly edge: "top" | "bottom";
	  }
	| {
			readonly kind: "LayerCard";
			readonly id: string;
			readonly paneId: PaneId;
			readonly subject: WorkspaceSubject;
	  };

export type WorkspaceDragTarget =
	| { readonly kind: "Pane"; readonly paneId: PaneId }
	| { readonly kind: "CardLayer"; readonly paneId: PaneId }
	| { readonly kind: "SheetRemoval"; readonly paneId: PaneId };

export type WorkspaceDragSession = {
	readonly source: WorkspaceDragSource;
	readonly target: WorkspaceDragTarget | null;
};

export type SheetPlacementPreview = {
	readonly sourceId: string;
	readonly subject: WorkspaceSubject;
};

export type CardOverlayProjection = {
	readonly sourceId: string;
	readonly subject: WorkspaceSubject;
	readonly geometry:
		| { readonly kind: "LayerCard" }
		| {
				readonly kind: "SheetMove";
				readonly edge: "top" | "bottom";
		  };
};

export type SourceRevealProjection =
	| { readonly kind: "Base" }
	| { readonly kind: "Sheet"; readonly sheetId: string };

export type PaneDragProjection = {
	readonly paneId: PaneId;
	readonly acceptsSheetPlacement: boolean;
	readonly isPaneDropTarget: boolean;
	readonly isCardLayerDropTarget: boolean;
	readonly sourceReveal: SourceRevealProjection | null;
	readonly sheetPlacementPreview: SheetPlacementPreview | null;
	readonly sheetRemoval: {
		readonly visible: boolean;
		readonly isDropTarget: boolean;
	};
};

export type WorkspaceDragDropEffect =
	| {
			readonly kind: "MoveSheet";
			readonly sourcePaneId: PaneId;
			readonly destinationPaneId: PaneId;
			readonly sheetId: string;
	  }
	| {
			readonly kind: "PlaceCard";
			readonly sourcePaneId: PaneId;
			readonly destinationPaneId: PaneId;
			readonly cardId: string;
	  }
	| {
			readonly kind: "ReturnCard";
			readonly paneId: PaneId;
			readonly cardId: string;
	  }
	| { readonly kind: "RemoveSheet"; readonly sheetId: string }
	| { readonly kind: "None" };

export type WorkspaceDragProjection = {
	readonly cardOverlay: CardOverlayProjection | null;
	readonly panes: readonly PaneDragProjection[];
	readonly dropEffect: WorkspaceDragDropEffect;
};

const NO_DROP_EFFECT = { kind: "None" } as const;

/**
 * Projects every transient presentation and the prospective semantic effect
 * from the same normalized drag session.
 */
export function projectWorkspaceDrag(
	workspace: SheetWorkspace,
	session: WorkspaceDragSession | null,
): WorkspaceDragProjection {
	const validTarget = validWorkspaceTarget(
		workspace,
		session?.target ?? null,
	);
	const sourceReveal = projectSourceReveal(
		workspace,
		session?.source ?? null,
	);
	const dropEffect = session
		? projectDropEffect(session.source, validTarget)
		: NO_DROP_EFFECT;
	const sheetPlacementPreview =
		session &&
		(dropEffect.kind === "MoveSheet" || dropEffect.kind === "PlaceCard")
			? {
					sourceId: session.source.id,
					subject: session.source.subject,
				}
			: null;

	return {
		cardOverlay: session ? projectCardOverlay(session.source) : null,
		panes: workspace.panes.map((pane): PaneDragProjection => {
			const isSourcePane = sourceReveal?.paneId === pane.id;
			return {
				paneId: pane.id,
				acceptsSheetPlacement: session !== null,
				isPaneDropTarget:
					(dropEffect.kind === "MoveSheet" ||
						dropEffect.kind === "PlaceCard") &&
					dropEffect.destinationPaneId === pane.id,
				isCardLayerDropTarget:
					dropEffect.kind === "ReturnCard" &&
					dropEffect.paneId === pane.id,
				sourceReveal: isSourcePane ? sourceReveal.reveal : null,
				sheetPlacementPreview:
					(dropEffect.kind === "MoveSheet" ||
						dropEffect.kind === "PlaceCard") &&
					dropEffect.destinationPaneId === pane.id
						? sheetPlacementPreview
						: null,
				sheetRemoval: {
					visible: session?.source.kind === "Sheet",
					isDropTarget:
						dropEffect.kind === "RemoveSheet" &&
						validTarget?.paneId === pane.id,
				},
			};
		}),
		dropEffect,
	};
}

function projectCardOverlay(
	source: WorkspaceDragSource,
): CardOverlayProjection {
	return {
		sourceId: source.id,
		subject: source.subject,
		geometry:
			source.kind === "Sheet"
				? { kind: "SheetMove", edge: source.edge }
				: { kind: "LayerCard" },
	};
}

function projectSourceReveal(
	workspace: SheetWorkspace,
	source: WorkspaceDragSource | null,
): {
	readonly paneId: PaneId;
	readonly reveal: SourceRevealProjection;
} | null {
	if (source?.kind !== "Sheet") return null;
	const pane = workspace.panes.find(
		(candidate) => candidate.id === source.paneId,
	);
	if (pane?.sheets.at(-1)?.instanceId !== source.id) return null;
	const revealedSheet = pane.sheets.at(-2);
	return {
		paneId: pane.id,
		reveal: revealedSheet
			? { kind: "Sheet", sheetId: revealedSheet.instanceId }
			: { kind: "Base" },
	};
}

function validWorkspaceTarget(
	workspace: SheetWorkspace,
	target: WorkspaceDragTarget | null,
): WorkspaceDragTarget | null {
	if (!target) return null;
	return workspace.panes.some((pane) => pane.id === target.paneId)
		? target
		: null;
}

function projectDropEffect(
	source: WorkspaceDragSource,
	target: WorkspaceDragTarget | null,
): WorkspaceDragDropEffect {
	if (!target) return NO_DROP_EFFECT;
	if (
		source.kind === "LayerCard" &&
		target.kind === "CardLayer" &&
		target.paneId === source.paneId
	) {
		return {
			kind: "ReturnCard",
			paneId: source.paneId,
			cardId: source.id,
		};
	}
	if (source.kind === "Sheet" && target.kind === "SheetRemoval") {
		return { kind: "RemoveSheet", sheetId: source.id };
	}
	if (target.kind !== "Pane") return NO_DROP_EFFECT;
	return source.kind === "Sheet"
		? {
				kind: "MoveSheet",
				sourcePaneId: source.paneId,
				destinationPaneId: target.paneId,
				sheetId: source.id,
			}
		: {
				kind: "PlaceCard",
				sourcePaneId: source.paneId,
				destinationPaneId: target.paneId,
				cardId: source.id,
			};
}
