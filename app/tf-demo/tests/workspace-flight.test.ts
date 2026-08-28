import { describe, expect, test } from "bun:test";

import type { WorkspaceDragDropEffect } from "../src/workspace/workspace-drag";
import {
	planWorkspaceDropFlight,
	RETURN_TO_SOURCE_PLAN,
} from "../src/workspace/workspace-flight";

const PLACED_SHEET_ID = "placed-sheet-instance";

describe("workspace drop flight planning", () => {
	test("plans a landing on the freshly placed Sheet for a placed Card", () => {
		const effect: WorkspaceDragDropEffect = {
			kind: "PlaceCard",
			sourcePaneId: "central",
			destinationPaneId: "east",
			cardId: "central:origin:reading",
		};

		expect(planWorkspaceDropFlight(effect, PLACED_SHEET_ID)).toEqual({
			kind: "LandAsSheet",
			sheetId: PLACED_SHEET_ID,
		});
	});

	test("plans a landing on the moved Sheet itself for a Sheet move", () => {
		const effect: WorkspaceDragDropEffect = {
			kind: "MoveSheet",
			sourcePaneId: "central",
			destinationPaneId: "west",
			sheetId: "sheet-central-text",
		};

		expect(planWorkspaceDropFlight(effect, PLACED_SHEET_ID)).toEqual({
			kind: "LandAsSheet",
			sheetId: "sheet-central-text",
		});
	});

	test("plans a dissolution for an explicitly removed Sheet", () => {
		const effect: WorkspaceDragDropEffect = {
			kind: "RemoveSheet",
			sheetId: "sheet-central-text",
		};

		expect(planWorkspaceDropFlight(effect, PLACED_SHEET_ID)).toEqual({
			kind: "Dissolve",
		});
	});

	test.each([
		[
			"a returned Card",
			{
				kind: "ReturnCard",
				paneId: "central",
				cardId: "central:origin:reading",
			} as const,
		],
		["no effect", { kind: "None" } as const],
	])("plans a return to the source for %s", (_kind, effect) => {
		expect(planWorkspaceDropFlight(effect, PLACED_SHEET_ID)).toEqual(
			RETURN_TO_SOURCE_PLAN,
		);
	});

	test("falls back to the source when a Card placement has no Sheet", () => {
		const effect: WorkspaceDragDropEffect = {
			kind: "PlaceCard",
			sourcePaneId: "central",
			destinationPaneId: "east",
			cardId: "central:origin:reading",
		};

		expect(planWorkspaceDropFlight(effect, null)).toEqual(
			RETURN_TO_SOURCE_PLAN,
		);
	});
});
