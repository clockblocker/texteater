import { describe, expect, test } from "bun:test";

import type { SheetWorkspace } from "../src/workspace/sheet-workspace";
import {
	loadSheetWorkspace,
	saveSheetWorkspace,
} from "../src/workspace/workspace-persistence";
import {
	createWorkspaceSession,
	reduceWorkspaceSession,
} from "../src/workspace/workspace-session";

const emptyWorkspace = (): SheetWorkspace => ({
	centralPaneId: "central",
	activePaneId: "central",
	panes: [
		{ id: "west", sheets: [] },
		{ id: "central", sheets: [] },
		{ id: "east", sheets: [] },
	],
});

describe("live workspace session", () => {
	test("Library opens a Text as a Sheet and Library reveal respects its lock", () => {
		let session = createWorkspaceSession(emptyWorkspace());
		session = reduceWorkspaceSession(session, {
			type: "Command",
			command: {
				type: "OpenSheet",
				sheet: {
					instanceId: "text-sheet",
					subject: {
						kind: "Text",
						target: { kind: "Text", textId: "text-1" },
					},
				},
				origin: { kind: "NavigationAnchor" },
			},
		});

		expect(session.workspace.panes[1]?.sheets).toMatchObject([
			{ instanceId: "text-sheet", locked: true },
		]);
		session = reduceWorkspaceSession(session, {
			type: "RevealNavigationAnchor",
		});
		expect(session.workspace.panes[1]?.sheets).toHaveLength(1);
		expect(session.announcement).toContain("Locked Sheet");
	});

	test("a completed Resolution replaces its Sheet subject without changing identity", () => {
		const workspace: SheetWorkspace = {
			...emptyWorkspace(),
			panes: [
				{ id: "west", sheets: [] },
				{
					id: "central",
					sheets: [
						{
							instanceId: "resolution-sheet",
							locked: true,
							subject: {
								kind: "Note",
								target: {
									kind: "Resolution",
									requestId: "request-1",
								},
							},
						},
					],
				},
				{ id: "east", sheets: [] },
			],
		};
		const session = reduceWorkspaceSession(
			createWorkspaceSession(workspace),
			{
				type: "ReplaceSubject",
				location: { kind: "Sheet", sheetId: "resolution-sheet" },
				subject: {
					kind: "Note",
					target: {
						kind: "RouteNote",
						routeKind: "Attestation",
						id: "attestation-1",
					},
				},
			},
		);

		expect(session.workspace.panes[1]?.sheets[0]).toMatchObject({
			instanceId: "resolution-sheet",
			locked: true,
			subject: {
				kind: "Note",
				target: { kind: "RouteNote", id: "attestation-1" },
			},
		});
	});

	test("a completed Resolution reconciles in place inside its Card layer", () => {
		const workspace: SheetWorkspace = {
			...emptyWorkspace(),
			panes: [
				{ id: "west", sheets: [] },
				{
					id: "central",
					sheets: [
						{
							instanceId: "text-sheet",
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
		};
		let session = reduceWorkspaceSession(
			createWorkspaceSession(workspace),
			{
				type: "OpenCardLayer",
				paneId: "central",
				originSheetId: "text-sheet",
				cards: [
					{
						key: "request-1",
						subject: {
							kind: "Note",
							target: {
								kind: "Resolution",
								requestId: "request-1",
							},
						},
					},
				],
			},
		);
		const card = session.cardLayers[0]?.cards[0];
		if (!card) throw new Error("Expected the Resolution Card.");
		session = reduceWorkspaceSession(session, {
			type: "ReplaceSubject",
			location: {
				kind: "Card",
				paneId: "central",
				cardId: card.id,
			},
			subject: {
				kind: "Note",
				target: { kind: "UnitReadingNote", readingId: "reading-1" },
			},
		});

		expect(session.cardLayers[0]?.cards[0]).toMatchObject({
			id: card.id,
			key: card.key,
			subject: {
				kind: "Note",
				target: { kind: "UnitReadingNote", readingId: "reading-1" },
			},
		});
	});

	test("persists only valid placed workspace state and falls back safely", () => {
		let serialized: string | null = null;
		const storage = {
			getItem: () => serialized,
			setItem: (_key: string, value: string) => {
				serialized = value;
			},
		};
		const workspace = emptyWorkspace();
		saveSheetWorkspace(workspace, storage);
		expect(
			loadSheetWorkspace({ ...workspace, activePaneId: "west" }, storage),
		).toEqual(workspace);

		serialized = JSON.stringify({ activePaneId: "missing", panes: [] });
		const fallback = { ...workspace, activePaneId: "east" };
		expect(loadSheetWorkspace(fallback, storage)).toEqual(fallback);
	});
});
