import { describe, expect, test } from "bun:test";

import {
	loadApplicationWorkspace,
	saveApplicationWorkspace,
} from "../src/workspace/application-workspace-persistence";
import {
	createApplicationWorkspaceSession,
	reduceApplicationWorkspaceSession,
} from "../src/workspace/application-workspace-state";
import { isWorkspaceSubject } from "../src/workspace/sheet-workspace";

function memoryStorage(initial: Record<string, string> = {}) {
	const values = new Map(Object.entries(initial));
	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
		read: (key: string) => values.get(key),
	};
}

describe("application workspace state", () => {
	test("accepts active analysis context only on a valid Surface subject", () => {
		expect(
			isWorkspaceSubject({
				kind: "Note",
				target: {
					kind: "Surface",
					language: "de",
					normalizedSurface: "Banken",
				},
				presentationContext: { activeAnalysisKey: "surface-1" },
			}),
		).toBe(true);
		expect(
			isWorkspaceSubject({
				kind: "Note",
				target: { kind: "Reading", readingId: "reading-1" },
				presentationContext: { activeAnalysisKey: "surface-1" },
			}),
		).toBe(false);
		expect(
			isWorkspaceSubject({
				kind: "Note",
				target: {
					kind: "Surface",
					language: "de",
					normalizedSurface: "Banken",
				},
				presentationContext: { activeAnalysisKey: 1 },
			}),
		).toBe(false);
	});

	test("keeps active Surface analyses presentation-specific through reconciliation and form changes", () => {
		let session = createApplicationWorkspaceSession();
		const originPresentationId = Object.keys(
			session.workspace.presentations,
		)[0];
		if (!originPresentationId)
			throw new Error("Expected Library Presentation.");
		const surface = {
			kind: "Surface" as const,
			language: "de" as const,
			normalizedSurface: "Banken",
		};

		session = reduceApplicationWorkspaceSession(session, {
			type: "ReconcileCardLayer",
			originPresentationId,
			candidates: [
				{
					key: "request-1:Surface",
					target: surface,
					presentationContext: {
						activeAnalysisKey: "surface-bank-singular",
					},
				},
				{
					key: "request-2:Surface",
					target: surface,
					presentationContext: {
						activeAnalysisKey: "surface-bank-plural",
					},
				},
			],
		});
		const firstId = Object.entries(
			session.candidateKeyByPresentationId,
		).find(([, key]) => key === "request-1:Surface")?.[0];
		const secondId = Object.entries(
			session.candidateKeyByPresentationId,
		).find(([, key]) => key === "request-2:Surface")?.[0];
		if (!firstId || !secondId)
			throw new Error("Expected independent Surface Presentations.");

		expect(session.workspace.presentations[firstId]?.subject).toMatchObject(
			{
				target: surface,
				presentationContext: {
					activeAnalysisKey: "surface-bank-singular",
				},
			},
		);
		expect(
			session.workspace.presentations[secondId]?.subject,
		).toMatchObject({
			target: surface,
			presentationContext: {
				activeAnalysisKey: "surface-bank-plural",
			},
		});

		session = reduceApplicationWorkspaceSession(session, {
			type: "Command",
			command: { type: "Lift", presentationId: firstId },
		});
		session = reduceApplicationWorkspaceSession(session, {
			type: "Command",
			command: { type: "Expand", paneId: session.workspace.activePaneId },
		});
		expect(session.workspace.presentations[firstId]).toMatchObject({
			form: "Sheet",
			subject: {
				presentationContext: {
					activeAnalysisKey: "surface-bank-singular",
				},
			},
		});
		const storage = memoryStorage();
		saveApplicationWorkspace(session, storage);
		session = loadApplicationWorkspace(
			createApplicationWorkspaceSession(),
			storage,
		);
		expect(session.workspace.presentations[firstId]?.subject).toMatchObject(
			{
				presentationContext: {
					activeAnalysisKey: "surface-bank-singular",
				},
			},
		);
		session = reduceApplicationWorkspaceSession(session, {
			type: "Command",
			command: { type: "Collapse", presentationId: firstId },
		});
		expect(session.workspace.presentations[firstId]).toMatchObject({
			form: "Card",
			subject: {
				presentationContext: {
					activeAnalysisKey: "surface-bank-singular",
				},
			},
		});
	});

	test("updates an active Surface analysis in place and leaves independent follows unselected", () => {
		let session = createApplicationWorkspaceSession();
		const originPresentationId = Object.keys(
			session.workspace.presentations,
		)[0];
		if (!originPresentationId)
			throw new Error("Expected Library Presentation.");
		const surface = {
			kind: "Surface" as const,
			language: "de" as const,
			normalizedSurface: "Banken",
		};
		session = reduceApplicationWorkspaceSession(session, {
			type: "ReconcileCardLayer",
			originPresentationId,
			candidates: [
				{
					key: "request-1:Surface",
					target: surface,
					presentationContext: { activeAnalysisKey: "analysis-1" },
				},
			],
		});
		const presentationId = Object.keys(
			session.candidateKeyByPresentationId,
		)[0];
		if (!presentationId) throw new Error("Expected a Surface Card.");
		session = reduceApplicationWorkspaceSession(session, {
			type: "ReconcileCardLayer",
			originPresentationId,
			candidates: [
				{
					key: "request-1:Surface",
					target: surface,
					presentationContext: { activeAnalysisKey: "analysis-2" },
				},
			],
		});
		expect(
			session.workspace.presentations[presentationId]?.subject,
		).toMatchObject({
			presentationContext: { activeAnalysisKey: "analysis-2" },
		});

		session = reduceApplicationWorkspaceSession(session, {
			type: "Follow",
			originPresentationId,
			target: surface,
		});
		const followed = Object.values(session.workspace.presentations).find(
			(presentation) =>
				presentation.form === "Sheet" &&
				presentation.subject.kind === "Note" &&
				presentation.subject.target.kind === "Surface",
		);
		expect(followed?.subject).toEqual({ kind: "Note", target: surface });
	});

	test("starts with a locked Library base and locks followed Text Sheets", () => {
		let session = createApplicationWorkspaceSession();
		const libraryId = Object.keys(session.workspace.presentations)[0];
		expect(session.workspace.presentations[libraryId ?? ""]).toMatchObject({
			subject: { kind: "Library" },
			locked: true,
			form: "Sheet",
		});

		session = reduceApplicationWorkspaceSession(session, {
			type: "Follow",
			target: { kind: "Text", textId: "text-1" },
			originPresentationId: libraryId,
		});
		const text = Object.values(session.workspace.presentations).find(
			(presentation) => presentation.subject.kind === "Text",
		);
		expect(text).toMatchObject({ locked: true, form: "Sheet" });

		expect(
			reduceApplicationWorkspaceSession(session, {
				type: "Follow",
				target: { kind: "Reading", readingId: "reading-1" },
				originPresentationId: libraryId,
			}),
		).toBe(session);
	});

	test("reconciles a Resolution Card in place by candidate key", () => {
		let session = createApplicationWorkspaceSession();
		const originPresentationId = Object.keys(
			session.workspace.presentations,
		)[0];
		if (!originPresentationId)
			throw new Error("Expected Library Presentation.");
		session = reduceApplicationWorkspaceSession(session, {
			type: "ReconcileCardLayer",
			originPresentationId,
			candidates: [
				{
					key: "request-1:Reading",
					target: {
						kind: "ResolutionStep",
						requestId: "request-1",
						stepKind: "Reading",
					},
				},
			],
		});
		const cardId = Object.keys(session.candidateKeyByPresentationId)[0];
		if (!cardId) throw new Error("Expected a Card Presentation.");

		const reconciled = reduceApplicationWorkspaceSession(session, {
			type: "ReconcileCardLayer",
			originPresentationId: cardId,
			candidates: [
				{
					key: "request-1:Reading",
					target: { kind: "Reading", readingId: "reading-1" },
				},
			],
		});
		expect(reconciled.workspace.presentations[cardId]).toMatchObject({
			id: cardId,
			subject: {
				kind: "Note",
				target: { kind: "Reading", readingId: "reading-1" },
			},
		});
		expect(
			reduceApplicationWorkspaceSession(reconciled, {
				type: "ReconcileCardLayer",
				originPresentationId: cardId,
				candidates: [
					{
						key: "request-1:Reading",
						target: {
							kind: "Reading",
							readingId: "reading-1",
						},
					},
				],
			}),
		).toBe(reconciled);
	});

	test("persists Sheets and an expanded Sheet's collapse layer, never Cards or a gesture", () => {
		let session = createApplicationWorkspaceSession();
		const originPresentationId = Object.keys(
			session.workspace.presentations,
		)[0];
		if (!originPresentationId)
			throw new Error("Expected Library Presentation.");
		session = reduceApplicationWorkspaceSession(session, {
			type: "ReconcileCardLayer",
			originPresentationId,
			candidates: [
				{
					key: "reading",
					target: { kind: "Reading", readingId: "reading-1" },
				},
			],
		});
		const cardId = Object.keys(session.candidateKeyByPresentationId)[0];
		if (!cardId) throw new Error("Expected a Card Presentation.");
		session = reduceApplicationWorkspaceSession(session, {
			type: "Command",
			command: { type: "Lift", presentationId: cardId },
		});
		session = reduceApplicationWorkspaceSession(session, {
			type: "Command",
			command: { type: "Expand", paneId: session.workspace.activePaneId },
		});

		const storage = memoryStorage();
		saveApplicationWorkspace(session, storage);
		const restored = loadApplicationWorkspace(
			createApplicationWorkspaceSession(),
			storage,
		);
		expect(restored.workspace.gesture).toBeUndefined();
		expect(restored.workspace.presentations[cardId]).toMatchObject({
			form: "Sheet",
		});
		expect(Object.values(restored.workspace.layers)).toHaveLength(1);
		expect(restored.candidateKeyByPresentationId).toEqual({
			[cardId]: "reading",
		});
	});

	test("drops resting Cards but keeps an expanded member collapsible after reload", () => {
		let session = createApplicationWorkspaceSession();
		const originPresentationId = Object.keys(
			session.workspace.presentations,
		)[0];
		if (!originPresentationId)
			throw new Error("Expected Library Presentation.");
		session = reduceApplicationWorkspaceSession(session, {
			type: "ReconcileCardLayer",
			originPresentationId,
			candidates: [
				{
					key: "expanded",
					target: { kind: "Reading", readingId: "reading-1" },
				},
				{
					key: "resting",
					target: { kind: "Reading", readingId: "reading-2" },
				},
			],
		});
		const expandedId = Object.entries(
			session.candidateKeyByPresentationId,
		).find(([, key]) => key === "expanded")?.[0];
		const restingId = Object.entries(
			session.candidateKeyByPresentationId,
		).find(([, key]) => key === "resting")?.[0];
		if (!expandedId || !restingId) throw new Error("Expected two Cards.");
		session = reduceApplicationWorkspaceSession(session, {
			type: "Command",
			command: { type: "Lift", presentationId: expandedId },
		});
		session = reduceApplicationWorkspaceSession(session, {
			type: "Command",
			command: { type: "Expand", paneId: session.workspace.activePaneId },
		});

		const storage = memoryStorage();
		saveApplicationWorkspace(session, storage);
		const restored = loadApplicationWorkspace(
			createApplicationWorkspaceSession(),
			storage,
		);
		expect(restored.workspace.presentations[restingId]).toBeUndefined();
		const layer = Object.values(restored.workspace.layers)[0];
		expect(layer?.memberIds).toEqual([expandedId]);
		expect(
			layer?.memberIds.every(
				(id) => restored.workspace.presentations[id],
			),
		).toBe(true);

		let resumed = reduceApplicationWorkspaceSession(restored, {
			type: "Command",
			command: { type: "Collapse", presentationId: expandedId },
		});
		expect(resumed.workspace.presentations[expandedId]).toMatchObject({
			form: "Card",
		});
		resumed = reduceApplicationWorkspaceSession(resumed, {
			type: "Command",
			command: { type: "Lift", presentationId: expandedId },
		});
		resumed = reduceApplicationWorkspaceSession(resumed, {
			type: "Command",
			command: {
				type: "Expand",
				paneId: resumed.workspace.activePaneId,
			},
		});
		expect(resumed.workspace.presentations[expandedId]).toMatchObject({
			form: "Sheet",
		});
	});

	test("reconciles an expanded Resolution member while its layer origin is covered", () => {
		let session = createApplicationWorkspaceSession();
		const originPresentationId = Object.keys(
			session.workspace.presentations,
		)[0];
		if (!originPresentationId)
			throw new Error("Expected Library Presentation.");
		session = reduceApplicationWorkspaceSession(session, {
			type: "ReconcileCardLayer",
			originPresentationId,
			candidates: [
				{
					key: "request-1:Reading",
					target: {
						kind: "ResolutionStep",
						requestId: "request-1",
						stepKind: "Reading",
					},
				},
			],
		});
		const memberId = Object.keys(session.candidateKeyByPresentationId)[0];
		if (!memberId) throw new Error("Expected a Card Presentation.");
		session = reduceApplicationWorkspaceSession(session, {
			type: "Command",
			command: { type: "Lift", presentationId: memberId },
		});
		session = reduceApplicationWorkspaceSession(session, {
			type: "Command",
			command: { type: "Expand", paneId: session.workspace.activePaneId },
		});
		session = reduceApplicationWorkspaceSession(session, {
			type: "ReconcileCardLayer",
			originPresentationId: memberId,
			candidates: [
				{
					key: "request-1:Reading",
					target: { kind: "Reading", readingId: "reading-1" },
				},
			],
		});
		expect(session.workspace.presentations[memberId]).toMatchObject({
			id: memberId,
			subject: {
				kind: "Note",
				target: { kind: "Reading", readingId: "reading-1" },
			},
		});
	});

	test("saves a lifted Sheet from its checkpoint", () => {
		let session = createApplicationWorkspaceSession();
		const libraryId = Object.keys(session.workspace.presentations)[0];
		if (!libraryId) throw new Error("Expected Library Presentation.");
		session = reduceApplicationWorkspaceSession(session, {
			type: "Follow",
			target: { kind: "Reading", readingId: "reading-1" },
			originPresentationId: libraryId,
		});
		const sheetId = Object.keys(session.workspace.presentations).find(
			(id) => id !== libraryId,
		);
		if (!sheetId) throw new Error("Expected a followed Sheet.");
		session = reduceApplicationWorkspaceSession(session, {
			type: "Command",
			command: { type: "Lift", presentationId: sheetId },
		});
		const storage = memoryStorage();
		saveApplicationWorkspace(session, storage);
		const restored = loadApplicationWorkspace(
			createApplicationWorkspaceSession(),
			storage,
		);
		expect(restored.workspace.presentations[sheetId]).toMatchObject({
			form: "Sheet",
		});
		expect(restored.workspace.gesture).toBeUndefined();
	});

	test("migrates valid v1 Sheets into the dynamic base Pane and rejects invalid v1", () => {
		const storage = memoryStorage({
			"tf-demo.workspace.v1": JSON.stringify({
				centralPaneId: "central",
				activePaneId: "central",
				panes: [
					{ id: "west", sheets: [] },
					{
						id: "central",
						sheets: [
							{
								instanceId: "old",
								locked: true,
								subject: {
									kind: "Text",
									target: { kind: "Text", textId: "text-1" },
								},
							},
						],
					},
					{ id: "east", sheets: [] },
				],
			}),
		});
		const restored = loadApplicationWorkspace(
			createApplicationWorkspaceSession(),
			storage,
		);
		expect(Object.keys(restored.workspace.panes)).toHaveLength(1);
		expect(Object.values(restored.workspace.presentations)).toHaveLength(2);

		storage.setItem(
			"tf-demo.workspace.v1",
			JSON.stringify({
				centralPaneId: "missing",
				activePaneId: "missing",
				panes: [],
			}),
		);
		expect(
			loadApplicationWorkspace(
				createApplicationWorkspaceSession(),
				storage,
			).workspace.presentations,
		).toEqual(createApplicationWorkspaceSession().workspace.presentations);
	});

	test("migrates nonempty v1 panes into a split and preserves the active group", () => {
		const storage = memoryStorage({
			"tf-demo.workspace.v1": JSON.stringify({
				centralPaneId: "central",
				activePaneId: "west",
				panes: [
					{
						id: "west",
						sheets: [
							{
								instanceId: "west-text",
								locked: true,
								subject: {
									kind: "Text",
									target: { kind: "Text", textId: "west" },
								},
							},
						],
					},
					{
						id: "central",
						sheets: [
							{
								instanceId: "central-note",
								locked: false,
								subject: {
									kind: "Note",
									target: {
										kind: "Reading",
										readingId: "central",
									},
								},
							},
						],
					},
					{ id: "east", sheets: [] },
				],
			}),
		});
		const restored = loadApplicationWorkspace(
			createApplicationWorkspaceSession(),
			storage,
		);
		expect(restored.workspace.layout.kind).toBe("Split");
		expect(Object.keys(restored.workspace.panes)).toHaveLength(2);
		const activeSubjects = restored.workspace.panes[
			restored.workspace.activePaneId
		]?.presentationIds.map(
			(id) => restored.workspace.presentations[id]?.subject,
		);
		expect(activeSubjects).toEqual([
			{ kind: "Text", target: { kind: "Text", textId: "west" } },
		]);
		expect(
			Object.values(restored.workspace.presentations).some(
				(presentation) => presentation.subject.kind === "Library",
			),
		).toBe(true);
	});

	test("falls back for malformed v2 layer, layout, and identifier state", () => {
		const fallback = createApplicationWorkspaceSession();
		const source = memoryStorage();
		saveApplicationWorkspace(fallback, source);
		const saved = source.read("tf-demo.workspace.v2");
		if (!saved) throw new Error("Expected v2 storage.");
		const base = JSON.parse(saved) as Record<string, unknown>;
		const malformed = [
			{
				...base,
				presentations: [
					{
						...(base.presentations as object[])[0],
						layerId: "layer-2",
					},
				],
			},
			{
				...base,
				layout: {
					kind: "Split",
					id: "split-2",
					axis: "horizontal",
					children: [
						{ kind: "Pane", id: "pane-1" },
						{ kind: "Pane", id: "pane-1" },
					],
				},
			},
			{ ...base, nextId: 1 },
		];
		for (const value of malformed) {
			const storage = memoryStorage({
				"tf-demo.workspace.v2": JSON.stringify(value),
			});
			expect(loadApplicationWorkspace(fallback, storage)).toBe(fallback);
		}
	});
});
