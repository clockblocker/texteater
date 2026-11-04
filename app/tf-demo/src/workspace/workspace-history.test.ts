import { describe, expect, test } from "bun:test";
import {
	entriesUpTo,
	historyMove,
	historyStateOf,
	landedEntry,
	type WorkspaceEntry,
	withPresentationIds,
	workspaceEntryOf,
} from "./workspace-history";

/** The entry for `ids` with every shorter stack below it, as a walk up writes them. */
function walkedTo(...ids: readonly string[]): WorkspaceEntry {
	const entries = entriesUpTo(ids, null);
	const top = entries.at(-1);
	if (!top) throw new Error("no entries");
	return top;
}

describe("historyMove", () => {
	const scroll = walkedTo("menu", "library", "p-1", "p-2");

	test("the same Sheets at the same Address stay", () => {
		expect(
			historyMove(scroll, ["menu", "library", "p-1", "p-2"], false),
		).toEqual({ kind: "stay" });
	});

	test("the same Sheets renamed replace the entry", () => {
		expect(
			historyMove(scroll, ["menu", "library", "p-1", "p-2"], true),
		).toEqual({
			kind: "replace",
		});
	});

	test("Sheets added on top push one entry each", () => {
		const move = historyMove(
			scroll,
			["menu", "library", "p-1", "p-2", "p-3", "p-4"],
			true,
		);
		expect(move.kind).toBe("push");
		if (move.kind !== "push") return;
		expect(move.entries.map((entry) => entry.presentationIds)).toEqual([
			["menu", "library", "p-1", "p-2", "p-3"],
			["menu", "library", "p-1", "p-2", "p-3", "p-4"],
		]);
		expect(move.entries.map((entry) => entry.index)).toEqual([4, 5]);
		expect(move.entries[1]?.below.at(-1)).toEqual(
			move.entries[0]?.presentationIds,
		);
	});

	test("a stack an entry below holds goes back to it, as ←, × and Close all leave", () => {
		const covered = walkedTo("menu", "library", "p-1", "p-2", "p-3", "p-4");
		expect(
			historyMove(
				covered,
				["menu", "library", "p-1", "p-2", "p-3"],
				true,
			),
		).toEqual({
			kind: "go",
			delta: -1,
		});
		expect(
			historyMove(covered, ["menu", "library", "p-1", "p-2"], true),
		).toEqual({
			kind: "go",
			delta: -2,
		});
		expect(historyMove(covered, ["menu", "library"], true)).toEqual({
			kind: "go",
			delta: -4,
		});
	});

	test("a stack on another branch goes back to what it shares, to push the rest from there", () => {
		expect(
			historyMove(scroll, ["menu", "library", "p-1", "p-9"], true),
		).toEqual({ kind: "go", delta: -1 });
	});

	test("a stack no entry below leads to replaces the entry", () => {
		const pasted: WorkspaceEntry = {
			index: 0,
			presentationIds: ["menu", "library", "p-1"],
			below: [],
		};
		expect(historyMove(pasted, ["menu", "settings"], true)).toEqual({
			kind: "replace",
		});
	});
});

describe("the workspace's history entries", () => {
	test("an entry reads back from history.state, and anything else is none of ours", () => {
		const entry = walkedTo("menu", "library");
		expect(
			workspaceEntryOf(structuredClone(historyStateOf(entry))),
		).toEqual(entry);
		expect(workspaceEntryOf(null)).toBeNull();
		expect(
			workspaceEntryOf({
				workspace: { index: 1, presentationIds: [], below: [] },
			}),
		).toBeNull();
		expect(
			workspaceEntryOf({
				workspace: { index: 0, presentationIds: [1], below: [] },
			}),
		).toBeNull();
	});

	test("a fresh entry spells its stack bottom up, one Sheet at a time", () => {
		expect(
			entriesUpTo(["menu", "library", "p-1"], null).map(
				(entry) => entry.presentationIds,
			),
		).toEqual([["menu"], ["menu", "library"], ["menu", "library", "p-1"]]);
	});

	test("Back keeps what lies below the entry it lands on", () => {
		const left = walkedTo("menu", "library", "p-1", "p-2");
		const landed = walkedTo("menu", "library", "p-1");
		expect(landedEntry(landed, left, ["menu", "library", "p-1"])).toEqual(
			landed,
		);
	});

	test("Forward keeps the entry it left below the one it lands on", () => {
		const left = walkedTo("menu", "library");
		const stale = walkedTo("menu", "library-old", "p-1");
		const landed = landedEntry(stale, left, ["menu", "library", "p-7"]);
		expect(landed).toEqual({
			index: 2,
			presentationIds: ["menu", "library", "p-7"],
			below: [["menu"], ["menu", "library"]],
		});
	});

	test("Back and Forward name each Sheet by its Presentation id; the Menu's rungs need none", () => {
		const subject = {
			kind: "Scroll",
			target: { kind: "Scroll", scrollId: "s1" },
		} as const;
		const target = withPresentationIds(
			{
				line: [
					{ kind: "Menu" },
					{ kind: "MenuItem", item: "library" },
					{ kind: "Sheet", sheet: { subject } },
				],
				covers: [{ subject }],
			},
			["menu", "library", "p-1", "p-2"],
		);
		expect(target.line[2]).toEqual({
			kind: "Sheet",
			sheet: { subject, presentationId: "p-1" },
		});
		expect(target.covers[0]).toEqual({ subject, presentationId: "p-2" });
	});
});
