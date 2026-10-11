import { describe, expect, test } from "bun:test";
import {
	clickAt,
	hide,
	kept,
	obsidian,
	open,
	type Preview,
	placePreview,
} from "./rules";

const view = { width: 1000, height: 800 };
const link = (start: number, top: number) => ({
	start,
	top,
	width: 60,
	height: 20,
});

describe("placePreview", () => {
	test("goes 10 px below the link, its start on the link's", () => {
		const box = placePreview(link(100, 100), 200, view);
		expect(box).toMatchObject({
			side: "below",
			start: 100,
			top: 130,
			width: 450,
		});
	});

	test("flips above when it fits only there", () => {
		const box = placePreview(link(100, 700), 200, view);
		expect(box.side).toBe("above");
		expect(box.top).toBe(700 - 10 - 200);
	});

	test("takes the roomier side and clamps when it fits neither", () => {
		const box = placePreview(link(100, 300), 600, {
			width: 1000,
			height: 600,
		});
		expect(box.side).toBe("above");
		expect(box.maxHeight).toBe(300 - 10 - 10);
		expect(box.top).toBe(10);
	});

	test("caps at 400 px and 80% of a narrow frame, inside its edge", () => {
		const box = placePreview(link(300, 50), 900, {
			width: 390,
			height: 800,
		});
		expect(box.maxHeight).toBe(obsidian.maxHeight);
		expect(box.width).toBe(312);
		expect(box.start).toBe(390 - 10 - 312);
	});
});

const preview = (
	id: string,
	parentId: string | null,
	extra: Partial<Preview> = {},
): Preview => ({
	id,
	word: id,
	parentId,
	host: "sheet",
	path: [id],
	anchor: link(0, 0),
	pinned: false,
	engaged: false,
	dragged: null,
	...extra,
});

const ids = (previews: readonly Preview[]) => previews.map((p) => p.id);

describe("the chain", () => {
	const chain = [preview("a", null), preview("b", "a"), preview("c", "b")];

	test("a new child replaces its unpinned sibling and what hung below it", () => {
		expect(ids(open(chain, preview("d", "a")))).toEqual(["a", "d"]);
	});

	test("a pinned sibling stays", () => {
		const pinned = [
			preview("a", null),
			preview("b", "a", { pinned: true }),
		];
		expect(ids(open(pinned, preview("d", "a")))).toEqual(["a", "b", "d"]);
	});

	test("hiding a parent hides its unpinned descendants", () => {
		const withPin = [...chain, preview("e", "c", { pinned: true })];
		expect(ids(hide(withPin, ["b"]))).toEqual(["a", "e"]);
	});

	test("the pointer in a child keeps its ancestors", () => {
		expect(
			[...kept(chain, { inPreview: "c", onLinkOf: null })].sort(),
		).toEqual(["a", "b", "c"]);
		expect(
			[...kept(chain, { inPreview: "a", onLinkOf: "b" })].sort(),
		).toEqual(["a", "b"]);
	});

	test("an engaged child keeps its ancestors", () => {
		const engaged = [
			preview("a", null),
			preview("b", "a", { engaged: true }),
		];
		expect(
			[...kept(engaged, { inPreview: null, onLinkOf: null })].sort(),
		).toEqual(["a", "b"]);
	});

	test("a click closes every unpinned preview it is not inside", () => {
		expect(ids(clickAt(chain, "b"))).toEqual(["a", "b"]);
		const withPin = [preview("p", null, { pinned: true }), ...chain];
		expect(ids(clickAt(withPin, null))).toEqual(["p"]);
	});
});
