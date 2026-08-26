import { describe, expect, test } from "bun:test";
import {
	createSheetWorkspaceFixture,
	FIXTURE_TEXT_SUBJECT,
} from "../src/playground/sheet-workspace/sheet-workspace-fixtures";
import type {
	PaneId,
	WorkspaceSubject,
} from "../src/workspace/sheet-workspace";
import {
	type PaneDragProjection,
	projectWorkspaceDrag,
	type WorkspaceDragSession,
	type WorkspaceDragSource,
} from "../src/workspace/workspace-drag";

const note: WorkspaceSubject = {
	kind: "Note",
	noteId: "workspace-note:reading:1:6",
};

const sheetSource: WorkspaceDragSource = {
	kind: "Sheet",
	id: "sheet-central-text",
	paneId: "central",
	subject: FIXTURE_TEXT_SUBJECT,
	edge: "top",
};

function project(session: WorkspaceDragSession | null) {
	return projectWorkspaceDrag(createSheetWorkspaceFixture(), session);
}

function pane(
	panes: readonly PaneDragProjection[],
	paneId: PaneId,
): PaneDragProjection {
	const result = panes.find((candidate) => candidate.paneId === paneId);
	if (!result) throw new Error(`Missing ${paneId} Pane projection.`);
	return result;
}

describe("workspace drag projection", () => {
	test.each(["central", "east"] as const)(
		"previews and moves a Sheet over the %s Pane, including its source Pane",
		(destinationPaneId) => {
			const projection = project({
				source: sheetSource,
				target: { kind: "Pane", paneId: destinationPaneId },
			});

			expect(pane(projection.panes, destinationPaneId)).toMatchObject({
				isPaneDropTarget: true,
				sheetPlacementPreview: {
					sourceId: sheetSource.id,
					subject: FIXTURE_TEXT_SUBJECT,
				},
			});
			expect(projection.dropEffect).toEqual({
				kind: "MoveSheet",
				sourcePaneId: "central",
				destinationPaneId,
				sheetId: sheetSource.id,
			});
		},
	);

	test.each([
		["Note", note],
		["Text", FIXTURE_TEXT_SUBJECT],
	] as const)(
		"previews and places a %s Card as a Sheet",
		(_kind, subject) => {
			const source: WorkspaceDragSource = {
				kind: "LayerCard",
				id: `card-${subject.kind.toLowerCase()}`,
				paneId: "central",
				subject,
			};
			const projection = project({
				source,
				target: { kind: "Pane", paneId: "east" },
			});

			expect(
				pane(projection.panes, "east").sheetPlacementPreview,
			).toEqual({
				sourceId: source.id,
				subject,
			});
			expect(projection.dropEffect).toEqual({
				kind: "PlaceCard",
				sourcePaneId: "central",
				destinationPaneId: "east",
				cardId: source.id,
			});
		},
	);

	test("returns a Card to its own Card Layer without a Sheet preview", () => {
		const source: WorkspaceDragSource = {
			kind: "LayerCard",
			id: "reading-card",
			paneId: "central",
			subject: note,
		};
		const projection = project({
			source,
			target: { kind: "CardLayer", paneId: "central" },
		});

		expect(
			projection.panes.every(
				(candidate) => candidate.sheetPlacementPreview === null,
			),
		).toBe(true);
		expect(pane(projection.panes, "central").isCardLayerDropTarget).toBe(
			true,
		);
		expect(projection.dropEffect).toEqual({
			kind: "ReturnCard",
			paneId: "central",
			cardId: source.id,
		});
	});

	test("removes a Sheet without a Sheet preview", () => {
		const projection = project({
			source: sheetSource,
			target: { kind: "SheetRemoval", paneId: "central" },
		});

		expect(
			projection.panes.every(
				(candidate) => candidate.sheetPlacementPreview === null,
			),
		).toBe(true);
		expect(pane(projection.panes, "central").sheetRemoval).toEqual({
			visible: true,
			isDropTarget: true,
		});
		expect(projection.dropEffect).toEqual({
			kind: "RemoveSheet",
			sheetId: sheetSource.id,
		});
	});

	test.each([
		null,
		{ kind: "CardLayer", paneId: "east" } as const,
		{ kind: "SheetRemoval", paneId: "missing" } as const,
	])("projects no preview or effect for target %p", (target) => {
		const projection = project({ source: sheetSource, target });
		expect(
			projection.panes.every(
				(candidate) => candidate.sheetPlacementPreview === null,
			),
		).toBe(true);
		expect(
			projection.panes.every(
				(candidate) =>
					!candidate.isPaneDropTarget &&
					!candidate.isCardLayerDropTarget &&
					!candidate.sheetRemoval.isDropTarget,
			),
		).toBe(true);
		expect(projection.dropEffect).toEqual({ kind: "None" });
	});

	test("projects Card overlay geometry and reveals the Sheet source", () => {
		const projection = project({ source: sheetSource, target: null });

		expect(projection.cardOverlay).toEqual({
			sourceId: sheetSource.id,
			subject: sheetSource.subject,
			geometry: { kind: "SheetMove", edge: "top" },
		});
		expect(pane(projection.panes, "central").sourceReveal).toEqual({
			kind: "Base",
		});
		expect(pane(projection.panes, "east").sourceReveal).toBeNull();
	});

	test("reveals the next Sheet beneath a moving source Sheet", () => {
		const workspace = createSheetWorkspaceFixture();
		const stackedWorkspace = {
			...workspace,
			panes: workspace.panes.map((candidate) =>
				candidate.id === "central"
					? {
							...candidate,
							sheets: [
								...candidate.sheets,
								{
									instanceId: "note-sheet",
									subject: note,
									locked: false,
								},
							],
						}
					: candidate,
			),
		};
		const projection = projectWorkspaceDrag(stackedWorkspace, {
			source: {
				kind: "Sheet",
				id: "note-sheet",
				paneId: "central",
				subject: note,
				edge: "bottom",
			},
			target: null,
		});

		expect(pane(projection.panes, "central").sourceReveal).toEqual({
			kind: "Sheet",
			sheetId: "sheet-central-text",
		});
	});

	test("has no transient presentation or effect without a session", () => {
		const projection = project(null);
		expect(projection.cardOverlay).toBeNull();
		expect(projection.dropEffect).toEqual({ kind: "None" });
		expect(
			projection.panes.every(
				(candidate) =>
					candidate.sourceReveal === null &&
					candidate.sheetPlacementPreview === null &&
					!candidate.sheetRemoval.visible,
			),
		).toBe(true);
	});
});
