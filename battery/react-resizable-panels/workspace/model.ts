/**
 * The workspace algebra is deliberately independent from React and from the
 * subjects it presents. A Card and a Sheet are two forms of one Presentation.
 */

export type WorkspaceAxis = "horizontal" | "vertical";
export type WorkspaceEdge = "inside" | "left" | "right" | "top" | "bottom";
export type PresentationForm = "Card" | "Sheet";

export type WorkspaceLayout =
	| { kind: "Pane"; id: string }
	| {
			kind: "Split";
			id: string;
			axis: WorkspaceAxis;
			children: [WorkspaceLayout, WorkspaceLayout];
	  };

export type WorkspacePane = {
	id: string;
	presentationIds: string[];
};

export type WorkspacePresentation<S> = {
	id: string;
	subject: S;
	form: PresentationForm;
	locked: boolean;
	layerId?: string;
};

/** Short renderer-facing name for a workspace Presentation. */
export type Presentation<S> = WorkspacePresentation<S>;

export type WorkspaceCardLayer = {
	id: string;
	originPresentationId: string;
	memberIds: string[];
};

type WorkspaceSnapshot<S> = Omit<WorkspaceState<S>, "gesture"> & {
	gesture?: undefined;
};

export type WorkspaceGesture<S> = {
	presentationId: string;
	sourceForm: PresentationForm;
	checkpoint: WorkspaceSnapshot<S>;
};

/** Immutable placement state. Subjects and content state remain caller-owned. */
export type WorkspaceState<S> = {
	layout: WorkspaceLayout;
	panes: Record<string, WorkspacePane>;
	presentations: Record<string, WorkspacePresentation<S>>;
	layers: Record<string, WorkspaceCardLayer>;
	activePaneId: string;
	gesture?: WorkspaceGesture<S>;
	nextId: number;
};

export type WorkspaceCommand<S> =
	| {
			type: "OpenLayer";
			originPresentationId: string;
			subjects: readonly S[];
	  }
	| { type: "OpenSheet"; paneId: string; subject: S; locked?: boolean }
	| { type: "Lift"; presentationId: string }
	| { type: "Expand"; paneId: string; edge?: WorkspaceEdge }
	| { type: "ReturnToLayer" }
	| { type: "Collapse"; presentationId: string }
	| { type: "CancelGesture" }
	| { type: "CloseLayer"; layerId: string }
	| { type: "ClosePresentation"; presentationId: string }
	| { type: "ActivatePane"; paneId: string };

export type WorkspaceTransition = {
	command: WorkspaceCommand<unknown>["type"];
	label: string;
	enabled: boolean;
};

export type WorkspaceStateLabel =
	| "UnderlyingSheet"
	| "CardLayerOpen"
	| "HoldingPresentation"
	| "SheetExpanded";

/** The single-layer form cycle used by inspectors; split layouts compose this cycle. */
export const WORKSPACE_TRANSITIONS = [
	{
		from: "UnderlyingSheet",
		to: "CardLayerOpen",
		command: "OpenLayer",
		label: "Open Card Layer",
	},
	{
		from: "CardLayerOpen",
		to: "HoldingPresentation",
		command: "Lift",
		label: "Lift Card",
	},
	{
		from: "HoldingPresentation",
		to: "SheetExpanded",
		command: "Expand",
		label: "Expand as Sheet",
	},
	{
		from: "SheetExpanded",
		to: "HoldingPresentation",
		command: "Lift",
		label: "Lift Sheet",
	},
	{
		from: "HoldingPresentation",
		to: "CardLayerOpen",
		command: "ReturnToLayer",
		label: "Return to Card Layer",
	},
	{
		from: "SheetExpanded",
		to: "CardLayerOpen",
		command: "Collapse",
		label: "Collapse",
	},
	{
		from: "CardLayerOpen",
		to: "UnderlyingSheet",
		command: "CloseLayer",
		label: "Close Card Layer",
	},
] as const;

export function createWorkspace<S>(subject: S): WorkspaceState<S> {
	const paneId = "pane-1";
	const presentationId = "presentation-1";
	return {
		layout: { kind: "Pane", id: paneId },
		panes: { [paneId]: { id: paneId, presentationIds: [presentationId] } },
		presentations: {
			[presentationId]: {
				id: presentationId,
				subject,
				form: "Sheet",
				locked: true,
			},
		},
		layers: {},
		activePaneId: paneId,
		nextId: 2,
	};
}

export function workspaceReducer<S>(
	state: WorkspaceState<S>,
	command: WorkspaceCommand<S>,
): WorkspaceState<S> {
	switch (command.type) {
		case "OpenLayer":
			return openLayer(state, command);
		case "OpenSheet":
			return openSheet(state, command);
		case "Lift":
			return lift(state, command.presentationId);
		case "Expand":
			return expand(state, command.paneId, command.edge ?? "inside");
		case "ReturnToLayer":
			return returnToLayer(state);
		case "Collapse":
			return collapse(state, command.presentationId);
		case "CancelGesture":
			return state.gesture ? state.gesture.checkpoint : state;
		case "CloseLayer":
			return closeLayer(state, command.layerId);
		case "ClosePresentation":
			return closePresentation(state, command.presentationId);
		case "ActivatePane":
			return state.panes[command.paneId]
				? { ...state, activePaneId: command.paneId }
				: state;
	}
}

export function selectLayout<S>(state: WorkspaceState<S>): WorkspaceLayout {
	return state.layout;
}

export function selectPanes<S>(state: WorkspaceState<S>): WorkspacePane[] {
	return panesIn(state.layout, state.panes);
}

export function selectPresentation<S>(
	state: WorkspaceState<S>,
	presentationId: string,
): WorkspacePresentation<S> | undefined {
	return state.presentations[presentationId];
}

export function selectVisibleSheets<S>(
	state: WorkspaceState<S>,
	paneId: string,
): WorkspacePresentation<S>[] {
	const pane = state.panes[paneId];
	if (!pane) return [];
	const lifted = state.gesture?.presentationId;
	return pane.presentationIds.flatMap((presentationId) => {
		if (presentationId === lifted) return [];
		const presentation = state.presentations[presentationId];
		return presentation?.form === "Sheet" ? [presentation] : [];
	});
}

export function selectCardLayersForPane<S>(
	state: WorkspaceState<S>,
	paneId: string,
): WorkspaceCardLayer[] {
	const pane = state.panes[paneId];
	if (!pane) return [];
	const topId = selectVisibleSheets(state, paneId).at(-1)?.id;
	if (!topId) return [];
	return Object.values(state.layers).filter(
		(layer) => layer.originPresentationId === topId,
	);
}

export function selectVisibleCards<S>(
	state: WorkspaceState<S>,
	layerId: string,
): WorkspacePresentation<S>[] {
	const layer = state.layers[layerId];
	if (!layer) return [];
	const lifted = state.gesture?.presentationId;
	return layer.memberIds.flatMap((presentationId) => {
		if (presentationId === lifted) return [];
		const presentation = state.presentations[presentationId];
		return presentation?.form === "Card" ? [presentation] : [];
	});
}

export function selectLiftedPresentation<S>(
	state: WorkspaceState<S>,
):
	| { presentation: WorkspacePresentation<S>; sourceForm: PresentationForm }
	| undefined {
	const gesture = state.gesture;
	if (!gesture) return undefined;
	const presentation = state.presentations[gesture.presentationId];
	return presentation
		? { presentation, sourceForm: gesture.sourceForm }
		: undefined;
}

export function selectWorkspaceTransitions<S>(
	state: WorkspaceState<S>,
): WorkspaceTransition[] {
	const lifted = selectLiftedPresentation(state);
	if (lifted) {
		return [
			{ command: "Expand", label: "Expand", enabled: true },
			{
				command: "ReturnToLayer",
				label: "Return to Card Layer",
				enabled: Boolean(lifted.presentation.layerId),
			},
			{
				command: "CancelGesture",
				label: "Cancel gesture",
				enabled: true,
			},
		];
	}
	const sheets = Object.values(state.presentations).filter(
		(presentation) => presentation.form === "Sheet",
	);
	const canLift = Object.values(state.presentations).some(
		(presentation) =>
			presentation.form === "Card" ||
			selectVisibleSheets(
				state,
				paneContaining(state, presentation.id) ?? "",
			).at(-1)?.id === presentation.id,
	);
	const canCollapse = sheets.some(
		(presentation) =>
			!presentation.locked &&
			Boolean(presentation.layerId) &&
			selectVisibleSheets(
				state,
				paneContaining(state, presentation.id) ?? "",
			).at(-1)?.id === presentation.id,
	);
	const canCloseLayer = Object.values(state.layers).some(
		(layer) => selectVisibleCards(state, layer.id).length > 0,
	);
	return [
		{ command: "Lift", label: "Lift", enabled: canLift },
		{ command: "Collapse", label: "Collapse", enabled: canCollapse },
		{
			command: "CloseLayer",
			label: "Close Card Layer",
			enabled: canCloseLayer,
		},
	];
}

export function selectWorkspaceStateLabel<S>(
	state: WorkspaceState<S>,
): WorkspaceStateLabel {
	const lifted = selectLiftedPresentation(state);
	if (lifted) return "HoldingPresentation";
	if (
		Object.values(state.presentations).some(
			(presentation) =>
				presentation.form === "Sheet" && presentation.layerId,
		)
	)
		return "SheetExpanded";
	if (
		Object.values(state.layers).some(
			(layer) => selectVisibleCards(state, layer.id).length > 0,
		)
	)
		return "CardLayerOpen";
	return "UnderlyingSheet";
}

export const getWorkspaceStateLabel = selectWorkspaceStateLabel;

/**
 * The inspector reads this instead of maintaining a parallel state machine.
 * Cancellation is dynamic because its destination is the gesture checkpoint.
 */
export function selectWorkspaceTransitionDescriptors<S>(
	state: WorkspaceState<S>,
) {
	const current = getWorkspaceStateLabel(state);
	const staticTransitions = WORKSPACE_TRANSITIONS.filter(
		(transition) => transition.from === current,
	);
	if (!state.gesture) return staticTransitions;
	return [
		...staticTransitions,
		{
			from: "HoldingPresentation",
			to: getWorkspaceStateLabel(state.gesture.checkpoint),
			command: "CancelGesture",
			label: "Cancel gesture",
		},
	];
}

function openLayer<S>(
	state: WorkspaceState<S>,
	command: Extract<WorkspaceCommand<S>, { type: "OpenLayer" }>,
): WorkspaceState<S> {
	if (!state.presentations[command.originPresentationId] || state.gesture)
		return state;
	// An origin has one current Card Layer. Opening it again replaces resting
	// cards, while expanded members survive as ordinary Sheets.
	let base = state;
	for (const layer of Object.values(state.layers)) {
		if (layer.originPresentationId === command.originPresentationId)
			base = closeLayer(base, layer.id);
	}
	let nextId = base.nextId;
	const layerId = `layer-${nextId++}`;
	const presentations = { ...base.presentations };
	const memberIds = command.subjects.map((subject) => {
		const id = `presentation-${nextId++}`;
		presentations[id] = {
			id,
			subject,
			form: "Card",
			locked: false,
			layerId,
		};
		return id;
	});
	return {
		...base,
		presentations,
		layers: {
			...base.layers,
			[layerId]: {
				id: layerId,
				originPresentationId: command.originPresentationId,
				memberIds,
			},
		},
		nextId,
	};
}

function openSheet<S>(
	state: WorkspaceState<S>,
	command: Extract<WorkspaceCommand<S>, { type: "OpenSheet" }>,
): WorkspaceState<S> {
	const pane = state.panes[command.paneId];
	if (!pane || state.gesture) return state;
	const id = `presentation-${state.nextId}`;
	return {
		...state,
		panes: {
			...state.panes,
			[pane.id]: {
				...pane,
				presentationIds: [...pane.presentationIds, id],
			},
		},
		presentations: {
			...state.presentations,
			[id]: {
				id,
				subject: command.subject,
				form: "Sheet",
				locked: command.locked ?? false,
			},
		},
		nextId: state.nextId + 1,
	};
}

function lift<S>(
	state: WorkspaceState<S>,
	presentationId: string,
): WorkspaceState<S> {
	if (state.gesture || !state.presentations[presentationId]) return state;
	const presentation = state.presentations[presentationId];
	if (presentation.form === "Sheet" && !paneContaining(state, presentationId))
		return state;
	if (
		presentation.form === "Sheet" &&
		selectVisibleSheets(
			state,
			paneContaining(state, presentationId) ?? "",
		).at(-1)?.id !== presentationId
	)
		return state;
	if (presentation.form === "Card" && !presentation.layerId) return state;
	return {
		...state,
		presentations:
			presentation.form === "Sheet"
				? {
						...state.presentations,
						[presentationId]: { ...presentation, form: "Card" },
					}
				: state.presentations,
		gesture: {
			presentationId,
			sourceForm: presentation.form,
			checkpoint: checkpoint(state),
		},
	};
}

function expand<S>(
	state: WorkspaceState<S>,
	paneId: string,
	edge: WorkspaceEdge,
): WorkspaceState<S> {
	const gesture = state.gesture;
	if (!gesture) return state;
	if (!state.panes[paneId]) return gesture.checkpoint;
	const presentation = state.presentations[gesture.presentationId];
	if (!presentation) return gesture.checkpoint;
	const sourcePaneId = paneContaining(state, presentation.id);
	if (
		gesture.sourceForm === "Sheet" &&
		sourcePaneId === paneId &&
		(edge === "inside" ||
			state.panes[sourcePaneId]?.presentationIds.length === 1)
	)
		return gesture.checkpoint;
	let next: WorkspaceState<S> = { ...state, gesture: undefined };
	if (gesture.sourceForm === "Sheet")
		next = removeSheet(next, presentation.id);
	next = {
		...next,
		presentations: {
			...next.presentations,
			[presentation.id]: { ...presentation, form: "Sheet" },
		},
	};
	return placeSheet(next, paneId, presentation.id, edge);
}

function returnToLayer<S>(state: WorkspaceState<S>): WorkspaceState<S> {
	const gesture = state.gesture;
	if (!gesture) return state;
	const presentation = state.presentations[gesture.presentationId];
	if (
		!presentation?.layerId ||
		presentation.locked ||
		!state.layers[presentation.layerId]
	)
		return gesture.checkpoint;
	const withoutSheet = removeSheet(
		{ ...state, gesture: undefined },
		presentation.id,
	);
	const layer = withoutSheet.layers[presentation.layerId];
	const originPane = paneContaining(withoutSheet, layer.originPresentationId);
	return {
		...withoutSheet,
		presentations: {
			...withoutSheet.presentations,
			[presentation.id]: { ...presentation, form: "Card" },
		},
		activePaneId: originPane ?? withoutSheet.activePaneId,
	};
}

function collapse<S>(
	state: WorkspaceState<S>,
	presentationId: string,
): WorkspaceState<S> {
	const presentation = state.presentations[presentationId];
	if (
		state.gesture ||
		!presentation ||
		presentation.form !== "Sheet" ||
		presentation.locked ||
		!presentation.layerId ||
		!state.layers[presentation.layerId]
	)
		return state;
	if (
		selectVisibleSheets(
			state,
			paneContaining(state, presentationId) ?? "",
		).at(-1)?.id !== presentationId
	)
		return state;
	return returnToLayer(lift(state, presentationId));
}

function closeLayer<S>(
	state: WorkspaceState<S>,
	layerId: string,
): WorkspaceState<S> {
	const layer = state.layers[layerId];
	if (!layer || state.gesture) return state;
	let next = state;
	for (const presentationId of layer.memberIds) {
		const presentation = next.presentations[presentationId];
		if (presentation?.form === "Card")
			next = closePresentation(next, presentationId);
		else if (presentation) {
			next = {
				...next,
				presentations: {
					...next.presentations,
					[presentation.id]: { ...presentation, layerId: undefined },
				},
			};
		}
	}
	const { [layerId]: _removed, ...layers } = next.layers;
	return { ...next, layers };
}

function closePresentation<S>(
	state: WorkspaceState<S>,
	presentationId: string,
): WorkspaceState<S> {
	const presentation = state.presentations[presentationId];
	if (!presentation || presentation.locked || state.gesture) return state;
	const withoutSheet = removeSheet(state, presentationId);
	let detached = withoutSheet;
	for (const layer of Object.values(withoutSheet.layers)) {
		if (layer.originPresentationId === presentationId)
			detached = closeLayer(detached, layer.id);
	}
	const { [presentationId]: _removed, ...presentations } =
		detached.presentations;
	const layers = Object.fromEntries(
		Object.entries(detached.layers).map(([layerId, layer]) => [
			layerId,
			{
				...layer,
				memberIds: layer.memberIds.filter(
					(id) => id !== presentationId,
				),
			},
		]),
	) as Record<string, WorkspaceCardLayer>;
	return { ...detached, presentations, layers };
}

function placeSheet<S>(
	state: WorkspaceState<S>,
	paneId: string,
	presentationId: string,
	edge: WorkspaceEdge,
): WorkspaceState<S> {
	const target = state.panes[paneId];
	if (!target) return state;
	if (edge === "inside") {
		return {
			...state,
			panes: {
				...state.panes,
				[paneId]: {
					...target,
					presentationIds: [
						...target.presentationIds,
						presentationId,
					],
				},
			},
			activePaneId: paneId,
		};
	}
	const newPaneId = `pane-${state.nextId}`;
	const splitId = `split-${state.nextId + 1}`;
	const added: WorkspacePane = {
		id: newPaneId,
		presentationIds: [presentationId],
	};
	const axis: WorkspaceAxis =
		edge === "left" || edge === "right" ? "horizontal" : "vertical";
	const addedFirst = edge === "left" || edge === "top";
	const replacement: WorkspaceLayout = {
		kind: "Split",
		id: splitId,
		axis,
		children: addedFirst
			? [
					{ kind: "Pane", id: newPaneId },
					{ kind: "Pane", id: paneId },
				]
			: [
					{ kind: "Pane", id: paneId },
					{ kind: "Pane", id: newPaneId },
				],
	};
	return {
		...state,
		layout: replacePaneInLayout(state.layout, paneId, replacement),
		panes: { ...state.panes, [newPaneId]: added },
		activePaneId: newPaneId,
		nextId: state.nextId + 2,
	};
}

function removeSheet<S>(
	state: WorkspaceState<S>,
	presentationId: string,
): WorkspaceState<S> {
	const paneId = paneContaining(state, presentationId);
	if (!paneId) return state;
	const pane = state.panes[paneId];
	const panes = {
		...state.panes,
		[paneId]: {
			...pane,
			presentationIds: pane.presentationIds.filter(
				(id) => id !== presentationId,
			),
		},
	};
	const layout = pruneLayout(state.layout, panes);
	const livePaneIds = new Set(
		panesIn(layout, panes).map((entry) => entry.id),
	);
	const prunedPanes = Object.fromEntries(
		Object.entries(panes).filter(([id]) => livePaneIds.has(id)),
	) as Record<string, WorkspacePane>;
	const fallbackPaneId =
		panesIn(layout, prunedPanes)[0]?.id ?? state.activePaneId;
	return {
		...state,
		panes: prunedPanes,
		layout,
		activePaneId: fallbackPaneId,
	};
}

function checkpoint<S>(state: WorkspaceState<S>): WorkspaceSnapshot<S> {
	const { gesture: _gesture, ...snapshot } = state;
	return snapshot;
}

function paneContaining<S>(
	state: WorkspaceState<S>,
	presentationId: string,
): string | undefined {
	return Object.values(state.panes).find((pane) =>
		pane.presentationIds.includes(presentationId),
	)?.id;
}

function panesIn(
	layout: WorkspaceLayout,
	panes: Record<string, WorkspacePane>,
): WorkspacePane[] {
	if (layout.kind === "Pane")
		return panes[layout.id] ? [panes[layout.id]] : [];
	return [
		...panesIn(layout.children[0], panes),
		...panesIn(layout.children[1], panes),
	];
}

function replacePaneInLayout(
	layout: WorkspaceLayout,
	paneId: string,
	replacement: WorkspaceLayout,
): WorkspaceLayout {
	if (layout.kind === "Pane")
		return layout.id === paneId ? replacement : layout;
	return {
		...layout,
		children: [
			replacePaneInLayout(layout.children[0], paneId, replacement),
			replacePaneInLayout(layout.children[1], paneId, replacement),
		],
	};
}

function pruneLayout(
	layout: WorkspaceLayout,
	panes: Record<string, WorkspacePane>,
): WorkspaceLayout {
	if (layout.kind === "Pane") return layout;
	const left = pruneLayout(layout.children[0], panes);
	const right = pruneLayout(layout.children[1], panes);
	const leftEmpty = isEmptyPane(left, panes);
	const rightEmpty = isEmptyPane(right, panes);
	if (leftEmpty && !rightEmpty) return right;
	if (rightEmpty && !leftEmpty) return left;
	return { ...layout, children: [left, right] };
}

function isEmptyPane(
	layout: WorkspaceLayout,
	panes: Record<string, WorkspacePane>,
): boolean {
	return (
		layout.kind === "Pane" &&
		(panes[layout.id]?.presentationIds.length ?? 0) === 0
	);
}
