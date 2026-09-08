import type {
	WorkspaceLayout,
	WorkspacePresentation,
	WorkspaceState,
} from "react-resizable-panels/workspace";
import {
	type ApplicationWorkspaceSession,
	type ApplicationWorkspaceSubject,
	createApplicationWorkspaceSession,
} from "./application-workspace-state";
import { isWorkspaceSubject, type WorkspaceSubject } from "./sheet-workspace";

const V2_STORAGE_KEY = "tf-demo.workspace.v2";
const V1_STORAGE_KEY = "tf-demo.workspace.v1";

export type ApplicationWorkspaceStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Restores durable Sheets and enough Card Layer membership for an expanded
 * Sheet to collapse. Resting Cards and active gestures are intentionally
 * transient.
 */
export function loadApplicationWorkspace(
	fallback = createApplicationWorkspaceSession(),
	storage: ApplicationWorkspaceStorage | null = browserStorage(),
): ApplicationWorkspaceSession {
	if (!storage) return fallback;
	try {
		const v2 = storage.getItem(V2_STORAGE_KEY);
		if (v2) {
			const restored = parseV2(JSON.parse(v2));
			if (restored) return restored;
		}
		const v1 = storage.getItem(V1_STORAGE_KEY);
		return v1
			? (migrateV1(JSON.parse(v1), fallback) ?? fallback)
			: fallback;
	} catch {
		return fallback;
	}
}

export function saveApplicationWorkspace(
	session: ApplicationWorkspaceSession,
	storage: ApplicationWorkspaceStorage | null = browserStorage(),
): void {
	if (!storage) return;
	try {
		storage.setItem(V2_STORAGE_KEY, JSON.stringify(persistedV2(session)));
	} catch {
		// Browser storage can be unavailable while the in-memory workspace remains valid.
	}
}

function persistedV2(session: ApplicationWorkspaceSession) {
	const workspace =
		session.workspace.gesture?.checkpoint ?? session.workspace;
	const presentations = Object.values(workspace.presentations).flatMap(
		(presentation) =>
			presentation.form === "Sheet"
				? [
						{
							id: presentation.id,
							subject: presentation.subject,
							locked: presentation.locked,
							...(presentation.layerId
								? { layerId: presentation.layerId }
								: {}),
						},
					]
				: [],
	);
	const retainedLayerIds = new Set(
		presentations.flatMap((presentation) =>
			presentation.layerId ? [presentation.layerId] : [],
		),
	);
	const persistedPresentationIds = new Set(
		presentations.map((presentation) => presentation.id),
	);
	const layers = Object.fromEntries(
		Object.entries(workspace.layers).flatMap(([layerId, layer]) =>
			retainedLayerIds.has(layerId)
				? [
						[
							layerId,
							{
								id: layerId,
								originPresentationId:
									layer.originPresentationId,
								memberIds: layer.memberIds.filter(
									(id) =>
										persistedPresentationIds.has(id) &&
										workspace.presentations[id]?.layerId ===
											layerId,
								),
							},
						],
					]
				: [],
		),
	);
	const candidateKeyByPresentationId = Object.fromEntries(
		Object.entries(session.candidateKeyByPresentationId).filter(
			([presentationId, key]) =>
				typeof key === "string" &&
				persistedPresentationIds.has(presentationId) &&
				Object.values(layers).some((layer) =>
					layer.memberIds.includes(presentationId),
				),
		),
	);
	return {
		version: 2,
		layout: workspace.layout,
		panes: Object.fromEntries(
			Object.entries(workspace.panes).map(([id, pane]) => [
				id,
				{
					id,
					presentationIds: pane.presentationIds.filter(
						(presentationId) =>
							presentations.some(
								({ id }) => id === presentationId,
							),
					),
				},
			]),
		),
		presentations,
		layers,
		candidateKeyByPresentationId,
		activePaneId: workspace.activePaneId,
		nextId: workspace.nextId,
	};
}

function parseV2(value: unknown): ApplicationWorkspaceSession | null {
	if (!isRecord(value) || value.version !== 2) return null;
	if (
		!isLayout(value.layout) ||
		!isRecord(value.panes) ||
		!Array.isArray(value.presentations) ||
		!isRecord(value.layers) ||
		typeof value.activePaneId !== "string" ||
		!isPositiveInteger(value.nextId)
	)
		return null;
	if (
		value.candidateKeyByPresentationId !== undefined &&
		!isRecord(value.candidateKeyByPresentationId)
	)
		return null;
	const presentations: Record<
		string,
		WorkspacePresentation<ApplicationWorkspaceSubject>
	> = {};
	for (const persistedPresentation of value.presentations) {
		if (
			!isRecord(persistedPresentation) ||
			typeof persistedPresentation.id !== "string" ||
			typeof persistedPresentation.locked !== "boolean" ||
			!isApplicationSubject(persistedPresentation.subject) ||
			(persistedPresentation.layerId !== undefined &&
				typeof persistedPresentation.layerId !== "string")
		)
			return null;
		presentations[persistedPresentation.id] = {
			id: persistedPresentation.id,
			subject: persistedPresentation.subject,
			locked: persistedPresentation.locked,
			form: "Sheet",
			...(typeof persistedPresentation.layerId === "string"
				? { layerId: persistedPresentation.layerId }
				: {}),
		};
	}
	const panes: WorkspaceState<ApplicationWorkspaceSubject>["panes"] = {};
	for (const [id, persistedPane] of Object.entries(value.panes)) {
		if (
			!isRecord(persistedPane) ||
			persistedPane.id !== id ||
			!isStringArray(persistedPane.presentationIds) ||
			persistedPane.presentationIds.some(
				(presentationId) => !presentations[presentationId],
			)
		)
			return null;
		panes[id] = { id, presentationIds: [...persistedPane.presentationIds] };
	}
	const layers: WorkspaceState<ApplicationWorkspaceSubject>["layers"] = {};
	for (const [id, persistedLayer] of Object.entries(value.layers)) {
		if (
			!isRecord(persistedLayer) ||
			persistedLayer.id !== id ||
			typeof persistedLayer.originPresentationId !== "string" ||
			!isStringArray(persistedLayer.memberIds) ||
			!presentations[persistedLayer.originPresentationId] ||
			persistedLayer.memberIds.some(
				(presentationId) =>
					!presentations[presentationId] ||
					presentations[presentationId]?.layerId !== id,
			)
		)
			return null;
		layers[id] = {
			id,
			originPresentationId: persistedLayer.originPresentationId,
			memberIds: [...persistedLayer.memberIds],
		};
	}
	if (
		Object.values(presentations).some(
			(presentation) =>
				presentation.layerId !== undefined &&
				!layers[presentation.layerId]?.memberIds.includes(
					presentation.id,
				),
		)
	)
		return null;
	if (
		!panes[value.activePaneId] ||
		!layoutMatchesPanes(value.layout, panes) ||
		!allPresentationsPlacedExactlyOnce(panes, presentations) ||
		value.nextId <=
			largestGeneratedId(value.layout, panes, presentations, layers)
	)
		return null;
	const candidateKeyByPresentationId: Record<string, string> = {};
	for (const [presentationId, key] of Object.entries(
		value.candidateKeyByPresentationId ?? {},
	)) {
		if (
			typeof key !== "string" ||
			!Object.values(layers).some((layer) =>
				layer.memberIds.includes(presentationId),
			)
		)
			return null;
		candidateKeyByPresentationId[presentationId] = key;
	}
	return {
		workspace: {
			layout: value.layout,
			panes,
			presentations,
			layers,
			activePaneId: value.activePaneId,
			nextId: value.nextId,
		},
		candidateKeyByPresentationId,
	};
}

function largestGeneratedId(
	layout: WorkspaceLayout,
	panes: WorkspaceState<ApplicationWorkspaceSubject>["panes"],
	presentations: Record<
		string,
		WorkspacePresentation<ApplicationWorkspaceSubject>
	>,
	layers: WorkspaceState<ApplicationWorkspaceSubject>["layers"],
): number {
	const identifiers = [
		...layoutIdentifiers(layout),
		...Object.keys(panes),
		...Object.keys(presentations),
		...Object.keys(layers),
	];
	return Math.max(
		0,
		...identifiers.flatMap((identifier) => {
			const match = /^(?:pane|presentation|layer|split)-(\d+)$/.exec(
				identifier,
			);
			return match ? [Number(match[1])] : [];
		}),
	);
}

function layoutIdentifiers(layout: WorkspaceLayout): string[] {
	return layout.kind === "Pane"
		? [layout.id]
		: [
				layout.id,
				...layoutIdentifiers(layout.children[0]),
				...layoutIdentifiers(layout.children[1]),
			];
}

function migrateV1(
	value: unknown,
	fallback: ApplicationWorkspaceSession,
): ApplicationWorkspaceSession | null {
	if (!isValidV1(value)) return null;
	const retained = value.panes.filter((pane) => pane.sheets.length > 0);
	if (retained.length === 0) return fallback;
	const libraryPaneIndex = Math.max(
		0,
		retained.findIndex((pane) => pane.id === value.centralPaneId),
	);
	let nextId = 2;
	const presentations: Record<
		string,
		WorkspacePresentation<ApplicationWorkspaceSubject>
	> = {
		"presentation-1": {
			id: "presentation-1",
			subject: { kind: "Library" },
			form: "Sheet",
			locked: true,
		},
	};
	const panes: WorkspaceState<ApplicationWorkspaceSubject>["panes"] = {};
	const paneByV1Id = new Map<string, string>();
	for (const [index, oldPane] of retained.entries()) {
		const paneId = `pane-${nextId++}`;
		paneByV1Id.set(oldPane.id, paneId);
		const presentationIds =
			index === libraryPaneIndex ? ["presentation-1"] : [];
		for (const sheet of oldPane.sheets) {
			const presentationId = `presentation-${nextId++}`;
			presentationIds.push(presentationId);
			presentations[presentationId] = {
				id: presentationId,
				subject: sheet.subject,
				form: "Sheet",
				locked: sheet.locked,
			};
		}
		panes[paneId] = { id: paneId, presentationIds };
	}
	let layout: WorkspaceLayout = { kind: "Pane", id: `pane-2` };
	for (let index = 1; index < retained.length; index += 1) {
		const paneId = paneByV1Id.get(retained[index]?.id ?? "");
		if (!paneId) return null;
		layout = {
			kind: "Split",
			id: `split-${nextId++}`,
			axis: "horizontal",
			children: [layout, { kind: "Pane", id: paneId }],
		};
	}
	const activePaneId =
		paneByV1Id.get(value.activePaneId) ??
		paneByV1Id.get(value.centralPaneId) ??
		paneByV1Id.get(retained[0]?.id ?? "");
	if (!activePaneId) return null;
	return {
		workspace: {
			layout,
			panes,
			presentations,
			layers: {},
			activePaneId,
			nextId,
		},
		candidateKeyByPresentationId: {},
	};
}

function isValidV1(value: unknown): value is {
	readonly centralPaneId: string;
	readonly activePaneId: string;
	readonly panes: readonly {
		readonly id: string;
		readonly sheets: readonly {
			readonly instanceId: string;
			readonly locked: boolean;
			readonly subject: WorkspaceSubject;
		}[];
	}[];
} {
	if (
		!isRecord(value) ||
		typeof value.centralPaneId !== "string" ||
		typeof value.activePaneId !== "string" ||
		!Array.isArray(value.panes) ||
		value.panes.length === 0
	)
		return false;
	const paneIds = new Set<string>();
	const sheetIds = new Set<string>();
	for (const pane of value.panes) {
		if (
			!isRecord(pane) ||
			typeof pane.id !== "string" ||
			!Array.isArray(pane.sheets) ||
			paneIds.has(pane.id)
		)
			return false;
		paneIds.add(pane.id);
		let lockedCount = 0;
		for (const sheet of pane.sheets) {
			if (
				!isRecord(sheet) ||
				typeof sheet.instanceId !== "string" ||
				typeof sheet.locked !== "boolean" ||
				!isWorkspaceSubject(sheet.subject) ||
				sheetIds.has(sheet.instanceId)
			)
				return false;
			sheetIds.add(sheet.instanceId);
			if (sheet.locked) lockedCount += 1;
		}
		if (lockedCount > 1) return false;
	}
	return paneIds.has(value.centralPaneId) && paneIds.has(value.activePaneId);
}

function browserStorage(): ApplicationWorkspaceStorage | null {
	try {
		return typeof window === "undefined" ? null : window.localStorage;
	} catch {
		return null;
	}
}

function isApplicationSubject(
	value: unknown,
): value is ApplicationWorkspaceSubject {
	return isRecord(value) && value.kind === "Library"
		? true
		: isWorkspaceSubject(value as WorkspaceSubject);
}

function isLayout(value: unknown): value is WorkspaceLayout {
	if (!isRecord(value) || typeof value.id !== "string") return false;
	return value.kind === "Pane"
		? true
		: value.kind === "Split" &&
				(value.axis === "horizontal" || value.axis === "vertical") &&
				Array.isArray(value.children) &&
				value.children.length === 2 &&
				isLayout(value.children[0]) &&
				isLayout(value.children[1]);
}

function layoutMatchesPanes(
	layout: WorkspaceLayout,
	panes: WorkspaceState<ApplicationWorkspaceSubject>["panes"],
): boolean {
	const ids = layoutPaneIds(layout);
	return (
		ids.length === Object.keys(panes).length &&
		new Set(ids).size === ids.length &&
		ids.every((id) => Boolean(panes[id]))
	);
}

function layoutPaneIds(layout: WorkspaceLayout): string[] {
	return layout.kind === "Pane"
		? [layout.id]
		: [
				...layoutPaneIds(layout.children[0]),
				...layoutPaneIds(layout.children[1]),
			];
}

function allPresentationsPlacedExactlyOnce(
	panes: WorkspaceState<ApplicationWorkspaceSubject>["panes"],
	presentations: Record<
		string,
		WorkspacePresentation<ApplicationWorkspaceSubject>
	>,
): boolean {
	const ids = Object.values(panes).flatMap((pane) => pane.presentationIds);
	return (
		ids.length === Object.keys(presentations).length &&
		new Set(ids).size === ids.length
	);
}

function isStringArray(value: unknown): value is string[] {
	return (
		Array.isArray(value) && value.every((item) => typeof item === "string")
	);
}
function isPositiveInteger(value: unknown): value is number {
	return (
		typeof value === "number" && Number.isSafeInteger(value) && value > 0
	);
}
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
