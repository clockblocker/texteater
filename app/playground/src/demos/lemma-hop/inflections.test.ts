import { describe, expect, test } from "bun:test";
import { type Grid, inflectionsOf, mergedGrid, tableRem } from "./inflections";
import { lookUp } from "./words";

const melken = inflectionsOf("melken");
if (!melken) throw new Error("no melken table");

const forms = (grid: Grid, row: number, column: number) =>
	grid.rows[row]?.cells[column]?.map((shown) => shown.form);
const marked = (grid: Grid) =>
	grid.rows.flatMap((row, rowIndex) =>
		row.cells.flatMap((cell, column) =>
			cell.some((shown) => shown.marked) ? [[rowIndex, column]] : [],
		),
	);

describe("mergedGrid", () => {
	test("puts the usual form first and marks every cell the clicked one fills", () => {
		const grid = mergedGrid(melken, "molken");
		expect(forms(grid, 0, 1)).toEqual(["melkte", "molk"]);
		expect(forms(grid, 1, 0)).toEqual(["melkst", "milkst"]);
		expect(grid.lines[0]?.cell.map((shown) => shown.form)).toEqual([
			"gemolken",
			"gemelkt",
		]);
		expect(marked(grid)).toEqual([
			[3, 1],
			[5, 1],
		]);
	});

	test("a lemma with one set has one form per cell", () => {
		const gehen = inflectionsOf("gehen");
		if (!gehen) throw new Error("no gehen table");
		const grid = mergedGrid(gehen, "ging");
		expect(
			grid.rows.every((row) =>
				row.cells.every((cell) => cell.length === 1),
			),
		).toBe(true);
	});
});

describe("tableRem", () => {
	test("a merged cell needs more room than a lone form's", () => {
		const gehen = inflectionsOf("gehen");
		if (!gehen) throw new Error("no gehen table");
		const merged = mergedGrid(melken, "");
		expect(tableRem(merged, false)).toBeGreaterThan(
			tableRem(mergedGrid(gehen, ""), false),
		);
		expect(tableRem(merged, true)).toBeLessThan(tableRem(merged, false));
	});
});

describe("the Surface caption", () => {
	const caption = (word: string) =>
		lookUp(word).cards.find((card) => card.kind === "Surface")?.caption;

	test("names a rarer form before its relation", () => {
		expect(caption("molken")).toBe("molken · older past of");
		expect(caption("buk")).toBe("buk · older past of");
		expect(caption("Kommata")).toBe("Kommata · less common plural of");
	});
});
