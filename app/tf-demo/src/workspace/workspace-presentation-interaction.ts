import type {
	DragEndEvent,
	DragOverEvent,
	DragStartEvent,
} from "@dnd-kit/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isWorkspaceSubject, type PaneId } from "./sheet-workspace";
import {
	type CardOverlayProjection,
	type PaneDragProjection,
	projectWorkspaceDrag,
	type SheetPlacementPreview,
	type WorkspaceDragProjection,
	type WorkspaceDragSession,
	type WorkspaceDragSource,
	type WorkspaceDragTarget,
} from "./workspace-drag";
import {
	planWorkspaceDropFlight,
	RETURN_TO_SOURCE_PLAN,
	runWorkspaceDropFlight,
	type WorkspaceDropFlightPlan,
} from "./workspace-flight";
import {
	reduceWorkspaceSession,
	type WorkspaceSession,
	type WorkspaceSessionAction,
} from "./workspace-session";

export type {
	PaneDragProjection,
	SheetPlacementPreview,
	WorkspaceDragSource,
	WorkspaceDragTarget,
	WorkspaceSessionAction,
};

export function createWorkspaceSheetId(): string {
	return (
		globalThis.crypto?.randomUUID?.() ??
		`sheet-${Date.now()}-${Math.random().toString(36).slice(2)}`
	);
}

export function acceptsSheetRemoval(sourceData: unknown): boolean {
	return normalizeDragSource(sourceData)?.kind === "Sheet";
}

export function acceptsCardLayerReturn(
	sourceData: unknown,
	paneId: PaneId,
): boolean {
	const source = normalizeDragSource(sourceData);
	return source?.kind === "LayerCard" && source.paneId === paneId;
}

const MINIMUM_DRAG_DISTANCE = 4;
const NO_LANDING = {
	settlingSheetId: null,
	focusSheetId: null,
} as const satisfies WorkspaceLanding;

type WorkspaceLanding = {
	/** Sheet held back until its drop flight lands on it. */
	readonly settlingSheetId: string | null;
	/** Sheet to focus once its drop flight has landed. */
	readonly focusSheetId: string | null;
};

export type WorkspacePresentationDrop = {
	readonly session: WorkspaceSession;
	readonly projection: WorkspaceDragProjection;
	readonly flight: WorkspaceDropFlightPlan;
	readonly landing: WorkspaceLanding;
};

/**
 * Completes a drag across the Workspace Presentation seam. Projection,
 * semantic state, flight, landing visibility, and focus all derive from the
 * same normalized interaction so callers cannot reorder or disagree on them.
 */
export function finishWorkspacePresentationDrag(
	state: WorkspaceSession,
	drag: WorkspaceDragSession,
	placedSheetId: string | null,
): WorkspacePresentationDrop {
	const projection = projectWorkspaceDrag(state.workspace, drag);
	const flight = planWorkspaceDropFlight(
		projection.dropEffect,
		placedSheetId,
	);
	return {
		session: reduceWorkspaceSession(state, {
			type: "FinishPresentationDrag",
			dropEffect: projection.dropEffect,
			placedSheetId,
		}),
		projection,
		flight,
		landing: {
			settlingSheetId:
				flight.kind === "LandAsSheet" ? flight.sheetId : null,
			focusSheetId:
				projection.dropEffect.kind === "MoveSheet"
					? projection.dropEffect.sheetId
					: null,
		},
	};
}

type DropAnimationContext = {
	readonly element: Element;
	readonly feedbackElement: Element;
};

export type WorkspacePresentationInteraction = {
	readonly projection: WorkspaceDragProjection;
	readonly settlingSheetId: string | null;
	readonly dragEvents: {
		readonly onDragStart: (event: DragStartEvent) => void;
		readonly onDragOver: (event: DragOverEvent) => void;
		readonly onDragEnd: (event: DragEndEvent) => void;
	};
	readonly dropAnimation: (context: DropAnimationContext) => Promise<void>;
	readonly overlayFor: (sourceData: unknown) => CardOverlayProjection | null;
};

/** React adapter for the in-process Workspace Presentation interaction. */
export function useWorkspacePresentationInteraction(
	state: WorkspaceSession,
	dispatch: React.Dispatch<WorkspaceSessionAction>,
): WorkspacePresentationInteraction {
	const [dragSession, setDragSession] = useState<WorkspaceDragSession | null>(
		null,
	);
	const [settlingSheetId, setSettlingSheetId] = useState<string | null>(null);
	const flightPlanRef = useRef<WorkspaceDropFlightPlan>(
		RETURN_TO_SOURCE_PLAN,
	);
	const landingRef = useRef<WorkspaceLanding | null>(null);
	const projection = useMemo(
		() => projectWorkspaceDrag(state.workspace, dragSession),
		[state.workspace, dragSession],
	);

	const focusSheet = useCallback((sheetId: string) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				document
					.querySelector<HTMLElement>(
						`[data-sheet-id="${CSS.escape(sheetId)}"] [data-sheet-handle="top"]`,
					)
					?.focus();
			});
		});
	}, []);

	const landFlight = useCallback(() => {
		const landing = landingRef.current;
		landingRef.current = null;
		if (!landing) return;
		if (landing.settlingSheetId !== null) {
			setSettlingSheetId((current) =>
				current === landing.settlingSheetId ? null : current,
			);
		}
		if (landing.focusSheetId !== null) focusSheet(landing.focusSheetId);
	}, [focusSheet]);

	const dropAnimation = useCallback(
		(context: DropAnimationContext) =>
			runWorkspaceDropFlight(
				{
					sourceElement: context.element,
					overlayElement: context.feedbackElement,
				},
				flightPlanRef.current,
				{ onLanded: landFlight },
			),
		[landFlight],
	);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || dragSession) return;
			if (state.cardLayers.length === 0) return;
			event.preventDefault();
			dispatch({ type: "DismissAllCardLayers" });
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [dispatch, dragSession, state.cardLayers.length]);

	const onDragStart = useCallback(({ operation }: DragStartEvent) => {
		const source = normalizeDragSource(operation.source?.data);
		flightPlanRef.current = RETURN_TO_SOURCE_PLAN;
		landingRef.current = null;
		setDragSession(source ? { source, target: null } : null);
	}, []);

	const onDragOver = useCallback(({ operation }: DragOverEvent) => {
		const source = normalizeDragSource(operation.source?.data);
		setDragSession(
			source
				? {
						source,
						target: normalizeDragTarget(operation.target?.data),
					}
				: null,
		);
	}, []);

	const onDragEnd = useCallback(
		({ operation, canceled }: DragEndEvent) => {
			const source = normalizeDragSource(operation.source?.data);
			const target = normalizeDragTarget(operation.target?.data);
			setDragSession(null);
			const moved = Math.hypot(
				operation.transform.x,
				operation.transform.y,
			);
			if (canceled || moved < MINIMUM_DRAG_DISTANCE || !source) {
				flightPlanRef.current = RETURN_TO_SOURCE_PLAN;
				landingRef.current = NO_LANDING;
				return;
			}
			const drag = { source, target };
			const preview = projectWorkspaceDrag(state.workspace, drag);
			const placedSheetId =
				preview.dropEffect.kind === "PlaceCard"
					? createWorkspaceSheetId()
					: null;
			const completion = finishWorkspacePresentationDrag(
				state,
				drag,
				placedSheetId,
			);
			flightPlanRef.current = completion.flight;
			landingRef.current = completion.landing;
			if (completion.landing.settlingSheetId !== null) {
				setSettlingSheetId(completion.landing.settlingSheetId);
			}
			dispatch({
				type: "FinishPresentationDrag",
				dropEffect: completion.projection.dropEffect,
				placedSheetId,
			});
		},
		[dispatch, state],
	);

	const overlayFor = useCallback(
		(sourceData: unknown) => {
			const fallbackSource = normalizeDragSource(sourceData);
			return (
				projection.cardOverlay ??
				(fallbackSource
					? projectWorkspaceDrag(state.workspace, {
							source: fallbackSource,
							target: null,
						}).cardOverlay
					: null)
			);
		},
		[projection.cardOverlay, state.workspace],
	);

	return {
		projection,
		settlingSheetId,
		dragEvents: { onDragStart, onDragOver, onDragEnd },
		dropAnimation,
		overlayFor,
	};
}

function normalizeDragSource(data: unknown): WorkspaceDragSource | null {
	if (!isRecord(data) || !isWorkspaceSubject(data.subject)) return null;
	if (
		data.kind === "Sheet" &&
		typeof data.id === "string" &&
		typeof data.paneId === "string" &&
		(data.edge === "top" || data.edge === "bottom")
	) {
		return {
			kind: data.kind,
			id: data.id,
			paneId: data.paneId,
			subject: data.subject,
			edge: data.edge,
		};
	}
	if (
		data.kind === "LayerCard" &&
		typeof data.id === "string" &&
		typeof data.paneId === "string"
	) {
		return {
			kind: data.kind,
			id: data.id,
			paneId: data.paneId,
			subject: data.subject,
		};
	}
	return null;
}

function normalizeDragTarget(data: unknown): WorkspaceDragTarget | null {
	if (
		!isRecord(data) ||
		typeof data.paneId !== "string" ||
		(data.kind !== "Pane" &&
			data.kind !== "CardLayer" &&
			data.kind !== "SheetRemoval")
	) {
		return null;
	}
	return { kind: data.kind, paneId: data.paneId };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
