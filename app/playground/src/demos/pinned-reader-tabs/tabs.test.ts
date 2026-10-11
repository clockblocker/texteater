import { describe, expect, test } from "bun:test";
import {
	activeTab,
	close,
	emptyWorkspace,
	hotkey,
	move,
	type OpenSettings,
	openFrom,
	openHowOf,
	reopen,
	tabsOf,
	titleOf,
	type Workspace,
} from "./tabs";

const settings: OpenSettings = {
	alwaysFocusNewTabs: true,
	pinnedOpens: "visible",
	modifiers: true,
	phone: false,
};
const click = { button: 0, metaKey: false, ctrlKey: false, altKey: false };
const titles = (workspace: Workspace) => tabsOf(workspace).map(titleOf);

describe("openHowOf", () => {
	test("maps modifiers as Obsidian's Keymap.isModEvent does", () => {
		const how = (patch: object) =>
			openHowOf({ ...click, shiftKey: false, ...patch }, true);
		expect(how({})).toBe("here");
		expect(how({ metaKey: true })).toBe("tab");
		expect(how({ button: 1 })).toBe("tab");
		expect(how({ metaKey: true, altKey: true })).toBe("split");
		expect(how({ metaKey: true, altKey: true, shiftKey: true })).toBe(
			"window",
		);
		expect(how({ ctrlKey: true })).toBe("here");
		expect(
			openHowOf({ ...click, shiftKey: false, ctrlKey: true }, false),
		).toBe("tab");
	});
});

describe("openFrom", () => {
	test("a plain click in the pinned reader opens a focused new tab", () => {
		const next = openFrom(emptyWorkspace, "reader", "gehen", "here", {
			...settings,
			alwaysFocusNewTabs: false,
		});
		expect(titles(next)).toEqual(["Reader", "gehen"]);
		expect(titleOf(activeTab(next))).toBe("gehen");
	});

	test("⌘ opens after the source, in the background without the setting", () => {
		const one = openFrom(emptyWorkspace, "reader", "a", "here", settings);
		const two = openFrom(one, "reader", "b", "tab", {
			...settings,
			alwaysFocusNewTabs: false,
		});
		expect(titles(two)).toEqual(["Reader", "b", "a"]);
		expect(titleOf(activeTab(two))).toBe("a");
	});

	test("a plain click in a Sheet navigates in place", () => {
		const one = openFrom(emptyWorkspace, "reader", "a", "here", settings);
		const sheet = activeTab(one);
		const two = openFrom(one, sheet.id, "b", "here", settings);
		const after = activeTab(two);
		expect(titles(two)).toEqual(["Reader", "b"]);
		expect(
			after.kind === "sheet" && after.trail.map((e) => e.word),
		).toEqual(["a", "b"]);
	});

	test("⌘⌥ splits; the reader then reuses the split's visible tab", () => {
		const split = openFrom(
			emptyWorkspace,
			"reader",
			"a",
			"split",
			settings,
		);
		expect(split.groups).toHaveLength(2);
		const reused = openFrom(split, "reader", "b", "here", settings);
		expect(reused.groups[1]?.tabs).toHaveLength(1);
		expect(titleOf(activeTab(reused))).toBe("b");
		const fresh = openFrom(split, "reader", "b", "here", {
			...settings,
			pinnedOpens: "new",
		});
		expect(titles(fresh)).toEqual(["Reader", "b", "a"]);
	});

	test("a phone opens splits as tabs", () => {
		const next = openFrom(emptyWorkspace, "reader", "a", "split", {
			...settings,
			phone: true,
		});
		expect(next.groups).toHaveLength(1);
	});
});

describe("close, reopen and move", () => {
	const three = ["a", "b", "c"].reduce(
		(workspace, word) =>
			openFrom(workspace, activeTab(workspace).id, word, "tab", settings),
		emptyWorkspace,
	);

	test("the reader can't be closed; a closed tab shows its right neighbour", () => {
		expect(close(three, "reader")).toBe(three);
		const middle = tabsOf(three)[2];
		const focused = middle ? close(three, middle.id) : three;
		expect(titles(three)).toEqual(["Reader", "a", "b", "c"]);
		expect(titleOf(activeTab(close(focused, activeTab(focused).id)))).toBe(
			"a",
		);
	});

	test("a reopened tab comes back without its history", () => {
		const sheet = activeTab(three);
		const walked = openFrom(three, sheet.id, "d", "here", settings);
		const back = reopen(close(walked, sheet.id));
		const reopened = activeTab(back);
		expect(reopened.kind === "sheet" && reopened.trail).toHaveLength(1);
		expect(titleOf(reopened)).toBe("d");
	});

	test("the reader stays first", () => {
		const last = tabsOf(three).at(-1);
		const moved = last ? move(three, last.id, 0) : three;
		expect(titles(moved)).toEqual(["Reader", "c", "a", "b"]);
		expect(move(three, "reader", 3)).toBe(three);
	});

	test("hotkeys close, reopen and cycle", () => {
		const key = (code: string, patch: object = {}) => ({
			key: "",
			code,
			metaKey: false,
			ctrlKey: false,
			altKey: false,
			shiftKey: false,
			...patch,
		});
		const closed = hotkey(three, key("KeyW", { altKey: true }), true);
		expect(closed && titles(closed)).toEqual(["Reader", "a", "b"]);
		const back =
			closed &&
			hotkey(
				closed,
				key("KeyT", { metaKey: true, shiftKey: true }),
				true,
			);
		expect(back && titles(back)).toEqual(titles(three));
		const first = hotkey(three, key("Digit1", { metaKey: true }), true);
		expect(first && titleOf(activeTab(first))).toBe("Reader");
		expect(hotkey(three, key("KeyQ"), true)).toBeNull();
	});
});
