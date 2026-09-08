import { describe, expect, test } from "vitest";
import {
	createWorkspace,
	getWorkspaceStateLabel,
	selectCardLayersForPane,
	selectLiftedPresentation,
	selectPanes,
	selectVisibleCards,
	selectVisibleSheets,
	WORKSPACE_TRANSITIONS,
	type WorkspaceState,
	workspaceReducer,
} from "./model";

type Subject = { name: string };

const source = { name: "source" };
const note = { name: "note" };
const anotherNote = { name: "another note" };

function reduce(
	state: WorkspaceState<Subject>,
	...commands: Parameters<typeof workspaceReducer<Subject>>[1][]
) {
	return commands.reduce(workspaceReducer<Subject>, state);
}

describe("workspace algebra", () => {
	test("exposes the Card Layer opening transition from the underlying Sheet", () => {
		expect(getWorkspaceStateLabel(createWorkspace(source))).toBe(
			"UnderlyingSheet",
		);
		expect(
			WORKSPACE_TRANSITIONS.find(
				(transition) => transition.command === "OpenLayer",
			),
		).toMatchObject({ from: "UnderlyingSheet", to: "CardLayerOpen" });
	});
	test("returns an expanded Presentation to its original Card Layer and order", () => {
		const opened = reduce(createWorkspace(source), {
			type: "OpenLayer",
			originPresentationId: "presentation-1",
			subjects: [note, anotherNote],
		});
		const layerId = "layer-2";
		const [firstCard, secondCard] = opened.layers[layerId].memberIds;

		const lifted = reduce(opened, {
			type: "Lift",
			presentationId: firstCard,
		});
		expect(
			selectVisibleCards(lifted, layerId).map((card) => card.id),
		).toEqual([secondCard]);
		expect(selectLiftedPresentation(lifted)?.presentation.id).toBe(
			firstCard,
		);

		const expanded = reduce(lifted, { type: "Expand", paneId: "pane-1" });
		expect(
			selectVisibleSheets(expanded, "pane-1").map((sheet) => sheet.id),
		).toEqual(["presentation-1", firstCard]);
		expect(selectCardLayersForPane(expanded, "pane-1")).toEqual([]);

		const returned = reduce(
			expanded,
			{ type: "Lift", presentationId: firstCard },
			{ type: "ReturnToLayer" },
		);
		expect(
			selectVisibleSheets(returned, "pane-1").map((sheet) => sheet.id),
		).toEqual(["presentation-1"]);
		expect(
			selectVisibleCards(returned, layerId).map((card) => card.id),
		).toEqual([firstCard, secondCard]);
	});

	test("Escape restores the exact checkpoint from both Card and Sheet lifts", () => {
		const opened = reduce(createWorkspace(source), {
			type: "OpenLayer",
			originPresentationId: "presentation-1",
			subjects: [note],
		});
		const cardId = opened.layers["layer-2"].memberIds[0];
		const cardLift = reduce(opened, {
			type: "Lift",
			presentationId: cardId,
		});
		expect(reduce(cardLift, { type: "CancelGesture" })).toEqual(opened);

		const expanded = reduce(cardLift, { type: "Expand", paneId: "pane-1" });
		const sheetLift = reduce(expanded, {
			type: "Lift",
			presentationId: cardId,
		});
		expect(
			selectVisibleSheets(sheetLift, "pane-1").map((sheet) => sheet.id),
		).toEqual(["presentation-1"]);
		expect(selectLiftedPresentation(sheetLift)?.presentation.form).toBe(
			"Card",
		);
		expect(reduce(sheetLift, { type: "CancelGesture" })).toEqual(expanded);
	});

	test("keeps a locked Sheet from collapsing or returning to a Card Layer", () => {
		const initial = createWorkspace(source);
		expect(
			reduce(initial, {
				type: "Collapse",
				presentationId: "presentation-1",
			}),
		).toBe(initial);
		const lifted = reduce(initial, {
			type: "Lift",
			presentationId: "presentation-1",
		});
		expect(reduce(lifted, { type: "ReturnToLayer" })).toEqual(initial);
	});

	test("only lifts or collapses the top Sheet of a Pane", () => {
		const stacked = reduce(createWorkspace(source), {
			type: "OpenSheet",
			paneId: "pane-1",
			subject: note,
		});
		expect(
			reduce(stacked, { type: "Lift", presentationId: "presentation-1" }),
		).toBe(stacked);
		expect(
			reduce(stacked, {
				type: "Collapse",
				presentationId: "presentation-2",
			}),
		).toBe(stacked);
	});

	test("treats two openings of the same Subject as distinct Presentations", () => {
		const state = reduce(createWorkspace(source), {
			type: "OpenLayer",
			originPresentationId: "presentation-1",
			subjects: [note, note],
		});
		const [first, second] = state.layers["layer-2"].memberIds;
		expect(first).not.toBe(second);
		expect(state.presentations[first].subject).toBe(
			state.presentations[second].subject,
		);
	});

	test("creates nested splits and prunes an emptied Pane", () => {
		const opened = reduce(createWorkspace(source), {
			type: "OpenLayer",
			originPresentationId: "presentation-1",
			subjects: [note],
		});
		const cardId = opened.layers["layer-2"].memberIds[0];
		const split = reduce(
			opened,
			{ type: "Lift", presentationId: cardId },
			{ type: "Expand", paneId: "pane-1", edge: "right" },
		);
		expect(selectPanes(split).map((pane) => pane.id)).toEqual([
			"pane-1",
			"pane-4",
		]);
		expect(split.layout.kind).toBe("Split");

		const pruned = reduce(
			split,
			{ type: "Lift", presentationId: cardId },
			{ type: "ReturnToLayer" },
		);
		expect(selectPanes(pruned).map((pane) => pane.id)).toEqual(["pane-1"]);
		expect(pruned.layout).toEqual({ kind: "Pane", id: "pane-1" });
	});

	test("cancels an edge drop of a Pane's last Sheet without losing it", () => {
		const direct = reduce(createWorkspace(source), {
			type: "OpenSheet",
			paneId: "pane-1",
			subject: note,
		});
		const withSplit = reduce(
			direct,
			{ type: "Lift", presentationId: "presentation-2" },
			{
				type: "Expand",
				paneId: "pane-1",
				edge: "right",
			},
		);
		const before = withSplit;
		const after = reduce(
			withSplit,
			{ type: "Lift", presentationId: "presentation-2" },
			{
				type: "Expand",
				paneId: "pane-3",
				edge: "left",
			},
		);
		expect(after).toEqual(before);
		expect(
			selectVisibleSheets(after, "pane-3").map((sheet) => sheet.id),
		).toEqual(["presentation-2"]);
	});

	test("keeps every remaining Sheet represented while nested panes are cleaned up", () => {
		const opened = reduce(createWorkspace(source), {
			type: "OpenLayer",
			originPresentationId: "presentation-1",
			subjects: [note, anotherNote],
		});
		const [right, bottom] = opened.layers["layer-2"].memberIds;
		const nested = reduce(
			opened,
			{ type: "Lift", presentationId: right },
			{ type: "Expand", paneId: "pane-1", edge: "right" },
			{ type: "Lift", presentationId: bottom },
			{ type: "Expand", paneId: "pane-1", edge: "bottom" },
		);
		const remaining = reduce(
			nested,
			{ type: "Lift", presentationId: right },
			{ type: "ReturnToLayer" },
		);
		const placed = selectPanes(remaining).flatMap((pane) =>
			selectVisibleSheets(remaining, pane.id),
		);
		expect(placed.map((sheet) => sheet.id).sort()).toEqual(
			["presentation-1", bottom].sort(),
		);
		expect(selectPanes(remaining).length).toBe(2);
	});

	test("cancels an invalid drop instead of losing the lifted Presentation", () => {
		const opened = reduce(createWorkspace(source), {
			type: "OpenLayer",
			originPresentationId: "presentation-1",
			subjects: [note],
		});
		const cardId = opened.layers["layer-2"].memberIds[0];
		const lifted = reduce(opened, { type: "Lift", presentationId: cardId });
		expect(reduce(lifted, { type: "Expand", paneId: "missing" })).toEqual(
			opened,
		);
	});

	test("closing a Card Layer preserves an expanded member as a Sheet", () => {
		const opened = reduce(createWorkspace(source), {
			type: "OpenLayer",
			originPresentationId: "presentation-1",
			subjects: [note, anotherNote],
		});
		const [expandedId, cardId] = opened.layers["layer-2"].memberIds;
		const expanded = reduce(
			opened,
			{ type: "Lift", presentationId: expandedId },
			{ type: "Expand", paneId: "pane-1" },
		);
		const closed = reduce(expanded, {
			type: "CloseLayer",
			layerId: "layer-2",
		});
		expect(closed.layers["layer-2"]).toBeUndefined();
		expect(closed.presentations[expandedId].form).toBe("Sheet");
		expect(closed.presentations[expandedId].layerId).toBeUndefined();
		expect(closed.presentations[cardId]).toBeUndefined();
	});

	test("closing an origin also removes its Card Layer without leaving dangling members", () => {
		const state = reduce(
			createWorkspace(source),
			{ type: "OpenSheet", paneId: "pane-1", subject: note },
			{
				type: "OpenLayer",
				originPresentationId: "presentation-2",
				subjects: [anotherNote],
			},
		);
		const memberId = state.layers["layer-3"].memberIds[0];
		const closed = reduce(state, {
			type: "ClosePresentation",
			presentationId: "presentation-2",
		});
		expect(closed.layers["layer-3"]).toBeUndefined();
		expect(closed.presentations[memberId]).toBeUndefined();
	});
});
