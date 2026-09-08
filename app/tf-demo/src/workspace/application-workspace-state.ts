import {
	createWorkspace,
	selectVisibleSheets,
	type WorkspaceCommand,
	type WorkspaceState,
	workspaceReducer,
} from "react-resizable-panels/workspace";

import {
	type WorkspaceSubject,
	type WorkspaceTarget,
	workspaceSubjectFor,
	workspaceSubjectsEqual,
} from "./sheet-workspace";

/** The Library is a workspace subject so the battery can keep it as the base Sheet. */
export type ApplicationWorkspaceSubject =
	| { readonly kind: "Library" }
	| WorkspaceSubject;

export type ApplicationCardCandidate = {
	readonly key: string;
	readonly target: WorkspaceTarget;
};

export type ApplicationWorkspaceSession = {
	readonly workspace: WorkspaceState<ApplicationWorkspaceSubject>;
	/** Stable caller keys let a live Card retain its Presentation across refreshes. */
	readonly candidateKeyByPresentationId: Readonly<Record<string, string>>;
};

export type ApplicationWorkspaceAction =
	| {
			readonly type: "Command";
			readonly command: WorkspaceCommand<ApplicationWorkspaceSubject>;
	  }
	| {
			readonly type: "Follow";
			readonly target: WorkspaceTarget;
			readonly originPresentationId?: string;
	  }
	| {
			readonly type: "RevealLibrary";
			readonly originPresentationId?: string;
	  }
	| {
			readonly type: "ReconcileCardLayer";
			readonly originPresentationId: string;
			readonly candidates: readonly ApplicationCardCandidate[];
	  }
	| {
			readonly type: "ReconcilePresentation";
			readonly presentationId: string;
			readonly target: WorkspaceTarget;
	  };

export function createApplicationWorkspaceSession(): ApplicationWorkspaceSession {
	return {
		workspace: createWorkspace<ApplicationWorkspaceSubject>({
			kind: "Library",
		}),
		candidateKeyByPresentationId: {},
	};
}

export function reduceApplicationWorkspaceSession(
	session: ApplicationWorkspaceSession,
	action: ApplicationWorkspaceAction,
): ApplicationWorkspaceSession {
	switch (action.type) {
		case "Command":
			return withWorkspace(
				session,
				workspaceReducer(session.workspace, action.command),
			);
		case "Follow":
			return follow(session, action.target, action.originPresentationId);
		case "RevealLibrary":
			return revealLibrary(session, action.originPresentationId);
		case "ReconcileCardLayer":
			return reconcileCardLayer(session, action);
		case "ReconcilePresentation":
			return reconcilePresentation(session, action);
	}
}

function follow(
	session: ApplicationWorkspaceSession,
	target: WorkspaceTarget,
	originPresentationId: string | undefined,
): ApplicationWorkspaceSession {
	const paneId = originPresentationId
		? activePaneForPresentation(session.workspace, originPresentationId)
		: session.workspace.activePaneId;
	if (!paneId) return session;
	return withWorkspace(
		session,
		workspaceReducer(session.workspace, {
			type: "OpenSheet",
			paneId,
			subject: workspaceSubjectFor(target),
			locked: target.kind === "Text",
		}),
	);
}

function revealLibrary(
	session: ApplicationWorkspaceSession,
	originPresentationId: string | undefined,
): ApplicationWorkspaceSession {
	const paneId = originPresentationId
		? activePaneForPresentation(session.workspace, originPresentationId)
		: session.workspace.activePaneId;
	if (!paneId) return session;
	const exposedLibrary = selectVisibleSheets(session.workspace, paneId).at(
		-1,
	);
	if (exposedLibrary?.subject.kind === "Library") {
		return withWorkspace(
			session,
			workspaceReducer(session.workspace, {
				type: "ActivatePane",
				paneId,
			}),
		);
	}
	return withWorkspace(
		session,
		workspaceReducer(session.workspace, {
			type: "OpenSheet",
			paneId,
			subject: { kind: "Library" },
			locked: false,
		}),
	);
}

function reconcilePresentation(
	session: ApplicationWorkspaceSession,
	action: Extract<
		ApplicationWorkspaceAction,
		{ readonly type: "ReconcilePresentation" }
	>,
): ApplicationWorkspaceSession {
	if (session.workspace.gesture) return session;
	const presentation = session.workspace.presentations[action.presentationId];
	const subject = workspaceSubjectFor(action.target);
	if (!presentation || subjectsEqual(presentation.subject, subject))
		return session;
	return withWorkspace(session, {
		...session.workspace,
		presentations: {
			...session.workspace.presentations,
			[action.presentationId]: { ...presentation, subject },
		},
	});
}

function reconcileCardLayer(
	session: ApplicationWorkspaceSession,
	action: Extract<
		ApplicationWorkspaceAction,
		{ readonly type: "ReconcileCardLayer" }
	>,
): ApplicationWorkspaceSession {
	const workspace = session.workspace;
	const originPresentationId = cardLayerOriginFor(
		workspace,
		action.originPresentationId,
	);
	if (!originPresentationId || workspace.gesture) {
		return session;
	}
	const layer = Object.values(workspace.layers).find(
		(candidate) => candidate.originPresentationId === originPresentationId,
	);
	const duplicateKeys = new Set<string>();
	if (
		action.candidates.some(
			({ key }) => duplicateKeys.has(key) || !duplicateKeys.add(key),
		)
	) {
		return session;
	}
	if (!layer && action.candidates.length === 0) return session;

	const candidatesByKey = new Map(
		action.candidates.map((candidate) => [candidate.key, candidate]),
	);
	const currentIdsByKey = new Map(
		(layer?.memberIds ?? []).flatMap((presentationId) => {
			const key = session.candidateKeyByPresentationId[presentationId];
			return key ? [[key, presentationId] as const] : [];
		}),
	);
	let presentations = workspace.presentations;
	let candidateKeyByPresentationId = session.candidateKeyByPresentationId;
	let changed = false;

	for (const presentationId of layer?.memberIds ?? []) {
		const presentation = presentations[presentationId];
		const key = candidateKeyByPresentationId[presentationId];
		if (!presentation || !key || candidatesByKey.has(key)) continue;
		changed = true;
		candidateKeyByPresentationId = omit(
			candidateKeyByPresentationId,
			presentationId,
		);
		if (presentation.form === "Card") {
			presentations = omit(presentations, presentationId);
		} else {
			presentations = {
				...presentations,
				[presentationId]: { ...presentation, layerId: undefined },
			};
		}
	}

	let nextId = workspace.nextId;
	const layerId = layer?.id ?? `layer-${nextId++}`;
	const memberIds: string[] = [];
	for (const candidate of action.candidates) {
		const currentId = currentIdsByKey.get(candidate.key);
		const subject = workspaceSubjectFor(candidate.target);
		if (currentId && presentations[currentId]) {
			const presentation = presentations[currentId];
			memberIds.push(currentId);
			if (!subjectsEqual(presentation.subject, subject)) {
				changed = true;
				presentations = {
					...presentations,
					[currentId]: { ...presentation, subject },
				};
			}
			continue;
		}
		changed = true;
		const presentationId = `presentation-${nextId++}`;
		memberIds.push(presentationId);
		presentations = {
			...presentations,
			[presentationId]: {
				id: presentationId,
				subject,
				form: "Card",
				locked: false,
				layerId,
			},
		};
		candidateKeyByPresentationId = {
			...candidateKeyByPresentationId,
			[presentationId]: candidate.key,
		};
	}

	const layers = layer
		? { ...workspace.layers, [layerId]: { ...layer, memberIds } }
		: {
				...workspace.layers,
				[layerId]: {
					id: layerId,
					originPresentationId,
					memberIds,
				},
			};
	const membershipChanged =
		!layer ||
		layer.memberIds.length !== memberIds.length ||
		layer.memberIds.some((id, index) => id !== memberIds[index]);
	if (!changed && !membershipChanged) return session;
	return {
		workspace: { ...workspace, presentations, layers, nextId },
		candidateKeyByPresentationId,
	};
}

function cardLayerOriginFor(
	workspace: WorkspaceState<ApplicationWorkspaceSubject>,
	presentationId: string,
): string | null {
	if (!workspace.presentations[presentationId]) return null;
	const layer =
		Object.values(workspace.layers).find(
			(candidate) => candidate.originPresentationId === presentationId,
		) ??
		Object.values(workspace.layers).find((candidate) =>
			candidate.memberIds.includes(presentationId),
		);
	const originPresentationId = layer?.originPresentationId ?? presentationId;
	if (layer) return originPresentationId;
	return activePaneForPresentation(workspace, originPresentationId)
		? originPresentationId
		: null;
}

/** A background Sheet or Card cannot start a navigation side effect. */
function activePaneForPresentation(
	workspace: WorkspaceState<ApplicationWorkspaceSubject>,
	presentationId: string,
): string | null {
	for (const [paneId, pane] of Object.entries(workspace.panes)) {
		if (!pane.presentationIds.includes(presentationId)) continue;
		return selectVisibleSheets(workspace, paneId).at(-1)?.id ===
			presentationId
			? paneId
			: null;
	}
	const layer = Object.values(workspace.layers).find((candidate) =>
		candidate.memberIds.includes(presentationId),
	);
	if (!layer) return null;
	return activePaneForPresentation(workspace, layer.originPresentationId);
}

function withWorkspace(
	session: ApplicationWorkspaceSession,
	workspace: WorkspaceState<ApplicationWorkspaceSubject>,
): ApplicationWorkspaceSession {
	if (workspace === session.workspace) return session;
	const candidateKeyByPresentationId = Object.fromEntries(
		Object.entries(session.candidateKeyByPresentationId).filter(
			([presentationId]) =>
				Boolean(workspace.presentations[presentationId]?.layerId),
		),
	);
	return { workspace, candidateKeyByPresentationId };
}

function subjectsEqual(
	left: ApplicationWorkspaceSubject,
	right: ApplicationWorkspaceSubject,
): boolean {
	if (left.kind === "Library" || right.kind === "Library") {
		return left.kind === right.kind;
	}
	return workspaceSubjectsEqual(left, right);
}

function omit<T>(
	record: Readonly<Record<string, T>>,
	key: string,
): Record<string, T> {
	const { [key]: _omitted, ...rest } = record;
	return rest;
}
