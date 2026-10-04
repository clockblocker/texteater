import { describe, expect, test } from "bun:test";
import { sortByElementOffset } from "./sortByElementOffset";

function item(id: string, left: number, width: number, top = 0, height = 0) {
	return {
		id,
		element: {
			offsetHeight: height,
			offsetLeft: left,
			offsetTop: top,
			offsetWidth: width,
		} as HTMLElement,
	};
}

const ids = (items: { id: string }[]) => items.map(({ id }) => id);

describe("sortByElementOffset", () => {
	test("orders a horizontal Split left to right", () => {
		const items = [
			item("c", 600, 400),
			item("a", 0, 500),
			item("b", 500, 100),
		];
		expect(ids(sortByElementOffset("horizontal", items, false))).toEqual([
			"a",
			"b",
			"c",
		]);
	});

	test("orders a right-to-left Split from its right edge", () => {
		const items = [
			item("c", 0, 400),
			item("a", 500, 500),
			item("b", 400, 100),
		];
		expect(ids(sortByElementOffset("horizontal", items, true))).toEqual([
			"a",
			"b",
			"c",
		]);
	});

	test("puts the narrower of two items at one inline-start edge first", () => {
		const ltr = [item("wide", 100, 50), item("collapsed", 100, 0)];
		expect(ids(sortByElementOffset("horizontal", ltr, false))).toEqual([
			"collapsed",
			"wide",
		]);
		const rtl = [item("wide", 100, 50), item("collapsed", 150, 0)];
		expect(ids(sortByElementOffset("horizontal", rtl, true))).toEqual([
			"collapsed",
			"wide",
		]);
	});

	test("orders a vertical Split top to bottom whatever the direction", () => {
		const items = [item("b", 0, 0, 300, 300), item("a", 0, 0, 0, 300)];
		expect(ids(sortByElementOffset("vertical", items, true))).toEqual([
			"a",
			"b",
		]);
	});
});
