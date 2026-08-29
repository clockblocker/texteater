import { describe, expect, test } from "bun:test";

import {
	createSheetWorkspaceFixture,
	FIXTURE_TEXT_SUBJECT,
} from "../src/playground/sheet-workspace/sheet-workspace-fixtures";
import type { WorkspaceSubject } from "../src/workspace/sheet-workspace";
import {
	finishWorkspacePresentationDrag,
	type WorkspaceDragSource,
} from "../src/workspace/workspace-presentation-interaction";
import {
	createWorkspaceSession,
	reduceWorkspaceSession,
} from "../src/workspace/workspace-session";

const note: WorkspaceSubject = {
	kind: "Note",
	target: {
		kind: "UnitReadingNote",
		readingId: "workspace-note:reading:1:6",
	},
};

const sheetSource: WorkspaceDragSource = {
	kind: "Sheet",
	id: "sheet-central-text",
	paneId: "central",
	subject: FIXTURE_TEXT_SUBJECT,
	edge: "top",
};

describe("Workspace Presentation interaction", () => {
	test("one completion moves a Sheet, projects its landing, and focuses the landed Sheet", () => {
		const completion = finishWorkspacePresentationDrag(
			createWorkspaceSession(createSheetWorkspaceFixture()),
			{
				source: sheetSource,
				target: { kind: "Pane", paneId: "east" },
			},
			null,
		);

		expect(completion.flight).toEqual({
			kind: "LandAsSheet",
			sheetId: sheetSource.id,
		});
		expect(completion.landing).toEqual({
			settlingSheetId: sheetSource.id,
			focusSheetId: sheetSource.id,
		});
		expect(
			completion.projection.panes.find(({ paneId }) => paneId === "east"),
		).toMatchObject({
			isPaneDropTarget: true,
			sheetPlacementPreview: {
				sourceId: sheetSource.id,
				subject: FIXTURE_TEXT_SUBJECT,
			},
		});
		expect(
			completion.session.workspace.panes.find(
				({ id }) => id === "central",
			)?.sheets,
		).toEqual([]);
		expect(
			completion.session.workspace.panes.find(({ id }) => id === "east")
				?.sheets,
		).toEqual([expect.objectContaining({ instanceId: sheetSource.id })]);
		expect(completion.session.announcement).toBe(
			"Moved Sheet sheet-central-text to east Pane.",
		);
	});

	test("one completion places a Card, removes it from its layer, and lands on the new Sheet", () => {
		const state = reduceWorkspaceSession(
			createWorkspaceSession(createSheetWorkspaceFixture()),
			{
				type: "OpenCardLayer",
				paneId: "central",
				originSheetId: "sheet-central-text",
				cards: [{ key: "reading", subject: note }],
			},
		);
		const card = state.cardLayers[0]?.cards[0];
		if (!card) throw new Error("Expected a Card Layer fixture.");
		const placedSheetId = "sheet-east-reading";

		const completion = finishWorkspacePresentationDrag(
			state,
			{
				source: {
					kind: "LayerCard",
					id: card.id,
					paneId: "central",
					subject: card.subject,
				},
				target: { kind: "Pane", paneId: "east" },
			},
			placedSheetId,
		);

		expect(completion.flight).toEqual({
			kind: "LandAsSheet",
			sheetId: placedSheetId,
		});
		expect(completion.landing).toEqual({
			settlingSheetId: placedSheetId,
			focusSheetId: null,
		});
		expect(completion.session.cardLayers).toEqual([]);
		expect(
			completion.session.workspace.panes.find(({ id }) => id === "east")
				?.sheets,
		).toEqual([
			expect.objectContaining({
				instanceId: placedSheetId,
				subject: note,
			}),
		]);
		expect(completion.session.announcement).toBe(
			"Placed Note Card in east Pane as a Sheet.",
		);
	});

	test("Explicit Sheet Removal dissolves the visual and applies the semantic removal", () => {
		const completion = finishWorkspacePresentationDrag(
			createWorkspaceSession(createSheetWorkspaceFixture()),
			{
				source: sheetSource,
				target: { kind: "SheetRemoval", paneId: "central" },
			},
			null,
		);

		expect(completion.flight).toEqual({ kind: "Dissolve" });
		expect(completion.landing).toEqual({
			settlingSheetId: null,
			focusSheetId: null,
		});
		expect(
			completion.session.workspace.panes.find(
				({ id }) => id === "central",
			)?.sheets,
		).toEqual([]);
		expect(completion.session.announcement).toBe(
			"Removed Sheet sheet-central-text.",
		);
	});

	test("returning a Card keeps the layer and plans a return to its source", () => {
		const state = reduceWorkspaceSession(
			createWorkspaceSession(createSheetWorkspaceFixture()),
			{
				type: "OpenCardLayer",
				paneId: "central",
				originSheetId: "sheet-central-text",
				cards: [{ key: "reading", subject: note }],
			},
		);
		const card = state.cardLayers[0]?.cards[0];
		if (!card) throw new Error("Expected a Card Layer fixture.");

		const completion = finishWorkspacePresentationDrag(
			state,
			{
				source: {
					kind: "LayerCard",
					id: card.id,
					paneId: "central",
					subject: card.subject,
				},
				target: { kind: "CardLayer", paneId: "central" },
			},
			null,
		);

		expect(completion.flight).toEqual({ kind: "ReturnToSource" });
		expect(completion.session.cardLayers).toEqual(state.cardLayers);
		expect(completion.session.announcement).toBe(
			"Returned Note Card to its Card Layer.",
		);
		expect(
			completion.projection.panes.find(
				({ paneId }) => paneId === "central",
			),
		).toMatchObject({
			isCardLayerDropTarget: true,
			sheetPlacementPreview: null,
		});
	});

	test.each([
		["no target", null],
		["a Card Layer in another Pane", { kind: "CardLayer", paneId: "east" }],
		["an unknown Pane", { kind: "SheetRemoval", paneId: "missing" }],
	] as const)("%s produces no semantic change", (_label, target) => {
		const state = createWorkspaceSession(createSheetWorkspaceFixture());
		const completion = finishWorkspacePresentationDrag(
			state,
			{ source: sheetSource, target },
			null,
		);

		expect(completion.flight).toEqual({ kind: "ReturnToSource" });
		expect(completion.session).toBe(state);
		expect(
			completion.projection.panes.every(
				(pane) => pane.sheetPlacementPreview === null,
			),
		).toBe(true);
	});

	test("moving the top Sheet reveals the Sheet underneath in the same completion", () => {
		const workspace = createSheetWorkspaceFixture();
		const central = workspace.panes.find(({ id }) => id === "central");
		if (!central) throw new Error("Expected the central Pane fixture.");
		const topSubject: WorkspaceSubject = {
			kind: "Text",
			target: { kind: "Text", textId: "workspace-text-top" },
		};
		const stackedWorkspace = {
			...workspace,
			panes: workspace.panes.map((pane) =>
				pane.id === "central"
					? {
							...pane,
							sheets: [
								...pane.sheets,
								{
									instanceId: "sheet-central-top",
									subject: topSubject,
									locked: false,
								},
							],
						}
					: pane,
			),
		};
		const completion = finishWorkspacePresentationDrag(
			createWorkspaceSession(stackedWorkspace),
			{
				source: {
					kind: "Sheet",
					id: "sheet-central-top",
					paneId: "central",
					subject: topSubject,
					edge: "bottom",
				},
				target: { kind: "Pane", paneId: "east" },
			},
			null,
		);

		expect(
			completion.projection.panes.find(
				({ paneId }) => paneId === "central",
			)?.sourceReveal,
		).toEqual({ kind: "Sheet", sheetId: "sheet-central-text" });
	});
});
