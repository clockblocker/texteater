import { describe, expect, test } from "bun:test";
import { type Grid, inflectionsOf, layOut, tableRem } from "./inflections";

const melken = inflectionsOf("melken");
if (!melken) throw new Error("no melken table");

const forms = (grid: Grid | undefined, row: number, column: number) =>
	grid?.rows[row]?.cells[column]?.map((shown) => shown.form);
const marked = (grid: Grid | undefined) =>
	grid?.rows.flatMap((row, rowIndex) =>
		row.cells.flatMap((cell, column) =>
			cell.some((shown) => shown.marked) ? [[rowIndex, column]] : [],
		),
	);

describe("layOut", () => {
	test("merged puts the usual form first and marks every cell it fills", () => {
		const [grid] = layOut(melken, "merged", "molken").grids;
		expect(forms(grid, 0, 1)).toEqual(["melkte", "molk"]);
		expect(forms(grid, 1, 0)).toEqual(["melkst", "milkst"]);
		expect(grid?.lines[0]?.cell.map((shown) => shown.form)).toEqual([
			"gemolken",
			"gemelkt",
		]);
		expect(marked(grid)).toEqual([
			[3, 1],
			[5, 1],
		]);
	});

	test("stacked puts the set holding the clicked form first", () => {
		const { grids } = layOut(melken, "stacked", "molken");
		expect(grids.map((grid) => grid.heading)).toEqual(["Older", "Current"]);
		expect(layOut(melken, "stacked", "ging").grids[0]?.heading).toBe(
			"Current",
		);
	});

	test("footnote keeps the usual forms and groups the rest by rarity", () => {
		const { grids, also } = layOut(melken, "footnote", "molken");
		expect(forms(grids[0], 3, 1)).toEqual(["melkten"]);
		expect(also.map((group) => group.rarity)).toEqual(["older", "also"]);
		expect(also[0]?.forms.map((shown) => shown.form)).toEqual([
			"milkst",
			"milkt",
			"molk",
			"molkst",
			"molken",
			"molkt",
		]);
		expect(
			also[0]?.forms.find((shown) => shown.form === "molken")?.marked,
		).toBe(true);
	});

	test("a lemma with one set lays out the same three ways", () => {
		const gehen = inflectionsOf("gehen");
		if (!gehen) throw new Error("no gehen table");
		for (const layout of ["merged", "stacked", "footnote"] as const) {
			const { grids, also } = layOut(gehen, layout, "ging");
			expect(grids).toHaveLength(1);
			expect(grids[0]?.heading).toBeUndefined();
			expect(also).toEqual([]);
		}
	});
});

describe("tableRem", () => {
	test("a merged cell needs more room than either set's", () => {
		const [merged] = layOut(melken, "merged", "").grids;
		const [single] = layOut(melken, "stacked", "").grids;
		if (!merged || !single) throw new Error("no grids");
		expect(tableRem(merged, false)).toBeGreaterThan(
			tableRem(single, false),
		);
		expect(tableRem(merged, true)).toBeLessThan(tableRem(merged, false));
	});
});
