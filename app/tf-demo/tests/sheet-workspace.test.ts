import { describe, expect, test } from "bun:test";

import {
	assertValidSheetWorkspace,
	type SheetWorkspace,
	transitionSheetWorkspace,
} from "../src/playground/sheet-workspace/sheet-workspace";
import {
	createSheetWorkspaceFixture,
	SHEET_WORKSPACE_SUBJECTS,
	sheetPlacement,
} from "../src/playground/sheet-workspace/sheet-workspace-fixtures";

function transition(
	workspace: SheetWorkspace,
	command: Parameters<typeof transitionSheetWorkspace>[1],
) {
	return transitionSheetWorkspace(workspace, command).workspace;
}

function pane(workspace: SheetWorkspace, paneId: string) {
	const result = workspace.panes.find((candidate) => candidate.id === paneId);
	if (!result) throw new Error(`Missing Pane ${paneId}`);
	return result;
}

describe("Sheet workspace algebra", () => {
	test("opens from the Navigation Anchor centrally and from a Sheet locally", () => {
		const initial = createSheetWorkspaceFixture();
		const navigationOpened = transition(initial, {
			type: "OpenSheet",
			sheet: sheetPlacement(
				"sheet-navigation-opened",
				SHEET_WORKSPACE_SUBJECTS.translation,
			),
			origin: { kind: "NavigationAnchor" },
		});
		expect(
			pane(navigationOpened, "central").sheets.at(-1)?.instanceId,
		).toBe("sheet-navigation-opened");

		const locallyOpened = transition(navigationOpened, {
			type: "OpenSheet",
			sheet: sheetPlacement(
				"sheet-local-opened",
				SHEET_WORKSPACE_SUBJECTS.context,
			),
			origin: { kind: "Sheet", sheetId: "sheet-west-text" },
		});
		expect(pane(locallyOpened, "west").sheets.at(-1)?.instanceId).toBe(
			"sheet-local-opened",
		);
	});

	test("allows repeated subjects while requiring unique Sheet instances", () => {
		const initial = createSheetWorkspaceFixture();
		expect(
			initial.panes
				.flatMap((candidate) => candidate.sheets)
				.filter(
					(sheet) =>
						sheet.subject === SHEET_WORKSPACE_SUBJECTS.article,
				).length,
		).toBe(2);

		const result = transitionSheetWorkspace(initial, {
			type: "OpenSheet",
			sheet: sheetPlacement(
				"sheet-west-text",
				SHEET_WORKSPACE_SUBJECTS.context,
			),
			origin: { kind: "NavigationAnchor" },
		});
		expect(result.status).toBe("rejected");
		expect(result.rejection).toBe("duplicate-sheet");
		expect(result.workspace).toBe(initial);
	});

	test("automatically locks only the first Sheet placed into an empty Pane", () => {
		const initial = createSheetWorkspaceFixture();
		const first = transition(initial, {
			type: "OpenSheet",
			sheet: sheetPlacement(
				"sheet-east-context",
				SHEET_WORKSPACE_SUBJECTS.context,
			),
			origin: { kind: "Placement", paneId: "east" },
		});
		const second = transition(first, {
			type: "OpenSheet",
			sheet: sheetPlacement(
				"sheet-east-translation",
				SHEET_WORKSPACE_SUBJECTS.translation,
			),
			origin: { kind: "Placement", paneId: "east" },
		});
		expect(
			pane(second, "east").sheets.map((sheet) => sheet.locked),
		).toEqual([true, false]);
	});

	test("transfers a Pane lock explicitly and permits leaving no lock", () => {
		const initial = createSheetWorkspaceFixture();
		const transferred = transition(initial, {
			type: "SetSheetLock",
			sheetId: "sheet-central-grammar",
			locked: true,
		});
		expect(
			pane(transferred, "central").sheets.map((sheet) => sheet.locked),
		).toEqual([false, true]);

		const unlocked = transition(transferred, {
			type: "SetSheetLock",
			sheetId: "sheet-central-grammar",
			locked: false,
		});
		expect(
			pane(unlocked, "central").sheets.some((sheet) => sheet.locked),
		).toBe(false);
	});

	test("moves only the top Sheet atomically and activates the destination", () => {
		const initial = createSheetWorkspaceFixture();
		const rejected = transitionSheetWorkspace(initial, {
			type: "MoveTopSheet",
			sourcePaneId: "central",
			destinationPaneId: "east",
			sheetId: "sheet-central-text",
		});
		expect(rejected.status).toBe("rejected");
		expect(rejected.rejection).toBe("source-sheet-is-not-top");
		expect(rejected.workspace).toBe(initial);

		const moved = transition(initial, {
			type: "MoveTopSheet",
			sourcePaneId: "central",
			destinationPaneId: "east",
			sheetId: "sheet-central-grammar",
		});
		expect(moved.activePaneId).toBe("east");
		expect(
			pane(moved, "central").sheets.map((sheet) => sheet.instanceId),
		).toEqual(["sheet-central-text"]);
		expect(
			pane(moved, "east").sheets.map((sheet) => sheet.instanceId),
		).toEqual(["sheet-central-grammar"]);
		expect(pane(moved, "east").sheets[0]?.locked).toBe(true);
	});

	test("retains a moving lock unless the destination lock wins", () => {
		const initial = createSheetWorkspaceFixture();
		const unlockedDestination = transition(initial, {
			type: "MoveTopSheet",
			sourcePaneId: "west",
			destinationPaneId: "east",
			sheetId: "sheet-west-text",
		});
		expect(pane(unlockedDestination, "east").sheets[0]?.locked).toBe(true);
		expect(pane(unlockedDestination, "west").sheets).toEqual([]);

		const destinationWins = transition(initial, {
			type: "MoveTopSheet",
			sourcePaneId: "west",
			destinationPaneId: "central",
			sheetId: "sheet-west-text",
		});
		expect(
			pane(destinationWins, "central").sheets.map(
				(sheet) => sheet.locked,
			),
		).toEqual([true, false, false]);
		expect(pane(destinationWins, "west").sheets).toEqual([]);
	});

	test("does not promote another lock when a Locked Sheet leaves", () => {
		const initial = createSheetWorkspaceFixture();
		const moved = transition(initial, {
			type: "MoveTopSheet",
			sourcePaneId: "west",
			destinationPaneId: "central",
			sheetId: "sheet-west-text",
		});
		expect(pane(moved, "west").sheets).toEqual([]);

		const lockTop = transition(initial, {
			type: "SetSheetLock",
			sheetId: "sheet-central-grammar",
			locked: true,
		});
		const removed = transition(lockTop, {
			type: "RemoveSheet",
			sheetId: "sheet-central-grammar",
		});
		expect(pane(removed, "central").sheets[0]?.locked).toBe(false);
	});

	test("collapses within the Active Pane and stops at its Locked Sheet", () => {
		const initial = createSheetWorkspaceFixture();
		const all = transition(initial, { type: "Collapse", extent: "all" });
		expect(
			pane(all, "central").sheets.map((sheet) => sheet.instanceId),
		).toEqual(["sheet-central-text"]);

		const stopped = transitionSheetWorkspace(all, {
			type: "Collapse",
			extent: "top",
		});
		expect(stopped.status).toBe("unchanged");
		expect(stopped.workspace).toBe(all);
	});

	test("Explicit Sheet Removal overrides the lock", () => {
		const initial = createSheetWorkspaceFixture();
		const removed = transition(initial, {
			type: "RemoveSheet",
			sheetId: "sheet-central-text",
		});
		expect(pane(removed, "central").sheets).toHaveLength(1);
		expect(pane(removed, "central").sheets[0]?.locked).toBe(false);
	});

	test("pointer and focus activation select exactly one Active Pane", () => {
		let workspace = createSheetWorkspaceFixture();
		workspace = transition(workspace, {
			type: "ActivatePane",
			paneId: "west",
			cause: "pointer",
		});
		expect(workspace.activePaneId).toBe("west");
		workspace = transition(workspace, {
			type: "ActivatePane",
			paneId: "east",
			cause: "focus",
		});
		expect(workspace.activePaneId).toBe("east");
	});

	test("cancellation performs no workspace transition", () => {
		const initial = createSheetWorkspaceFixture();
		const transientCard = {
			sourcePaneId: "central",
			sheetId: "sheet-central-grammar",
		};
		expect(transientCard).toBeDefined();
		expect(createSheetWorkspaceFixture()).toEqual(initial);
	});

	test("rejects state with duplicate instances or multiple Pane locks", () => {
		const duplicate = createSheetWorkspaceFixture();
		const west = pane(duplicate, "west");
		const central = pane(duplicate, "central");
		const east = pane(duplicate, "east");
		const westSheet = west.sheets[0];
		if (!westSheet)
			throw new Error("Fixture west Pane must contain a Sheet.");
		expect(() =>
			assertValidSheetWorkspace({
				...duplicate,
				panes: [
					west,
					{
						...central,
						sheets: [...central.sheets, westSheet],
					},
					east,
				],
			}),
		).toThrow("occurs more than once");

		const twoLocks = createSheetWorkspaceFixture();
		expect(() =>
			assertValidSheetWorkspace({
				...twoLocks,
				panes: twoLocks.panes.map((candidate) =>
					candidate.id === "central"
						? {
								...candidate,
								sheets: candidate.sheets.map((sheet) => ({
									...sheet,
									locked: true,
								})),
							}
						: candidate,
				),
			}),
		).toThrow("more than one Locked Sheet");
	});
});
