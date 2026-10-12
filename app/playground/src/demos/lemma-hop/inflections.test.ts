import { describe, expect, test } from "bun:test";
import {
	type Grid,
	gridOf,
	type InflectionTable,
	inflectionsOf,
	rarityOf,
	tableRem,
} from "./inflections";
import { lookUp } from "./words";

const table = (lemma: string): InflectionTable => {
	const found = inflectionsOf(lemma);
	if (!found) throw new Error(`no ${lemma} table`);
	return found;
};

/** Each marked form as row, column (a footer counts as row -1). */
const marked = (grid: Grid) => [
	...grid.rows.flatMap((row, rowIndex) =>
		row.cells.flatMap((cell, column) =>
			cell.usual.marked || cell.other?.marked ? [[rowIndex, column]] : [],
		),
	),
	...grid.footers.flatMap((footer) =>
		footer.forms.some((shown) => shown.marked) ? [[-1, 0]] : [],
	),
];

describe("gridOf", () => {
	test("tags the rarer series once, in a heading that drops the repeat", () => {
		const grid = gridOf(table("melken"), "molken");
		expect(grid.columns).toEqual([
			{ heading: "Präsens", tag: undefined },
			{ heading: "Präteritum", tag: undefined },
			{ heading: undefined, tag: "older" },
		]);
		expect(marked(grid)).toEqual([
			[3, 2],
			[5, 2],
		]);
	});

	test("puts a lone rarer form under its cell's usual one", () => {
		const du = gridOf(table("melken"), "").rows[1]?.cells[0];
		expect(du?.usual.form).toBe("melkst");
		expect(du?.other).toMatchObject({ form: "milkst", rarity: "older" });
	});

	test("sets a noun's article apart, and a shared one marks with it", () => {
		const grid = gridOf(table("das Komma"), "die Kommata");
		expect(grid.rows[0]?.cells[0]?.usual).toMatchObject({
			article: "das",
			form: "Komma",
		});
		expect(grid.rows[2]?.cells[2]?.usual.article).toBeUndefined();
		expect(marked(grid)).toEqual([
			[0, 2],
			[1, 2],
		]);
	});

	test("a lemma with one series has no tags and no second lines", () => {
		const grid = gridOf(table("gehen"), "ging");
		expect(grid.columns.every((column) => !column.tag)).toBe(true);
		expect(
			grid.rows.every((row) => row.cells.every((cell) => !cell.other)),
		).toBe(true);
		expect(grid.footers[0]).toMatchObject({
			label: "Partizip II",
			aux: "ist",
		});
	});
});

describe("rarityOf", () => {
	test("finds the tag of the series, cell or footer the form stands in", () => {
		expect(rarityOf("melken", "molken")).toBe("older");
		expect(rarityOf("melken", "milkst")).toBe("older");
		expect(rarityOf("melken", "gemelkt")).toBe("also");
		expect(rarityOf("melken", "melkten")).toBeUndefined();
		expect(rarityOf("das Komma", "Kommata")).toBe("also");
	});
});

describe("tableRem", () => {
	test("the Komma and verb tables fit the Deck's 360 px Card", () => {
		// The Card's content box: 360 px less its border and padding.
		const deckRem = (360 - 2 - 32) / 16;
		for (const lemma of ["das Komma", "melken", "backen", "gehen"])
			expect(tableRem(gridOf(table(lemma), ""), false)).toBeLessThan(
				deckRem,
			);
		expect(
			tableRem(gridOf(table("detailliert"), ""), false),
		).toBeGreaterThan(deckRem);
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
