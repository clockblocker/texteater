import { describe, expect, test } from "bun:test";
import { BAR_REM, HEADER_REM } from "compass";
import {
	cardForm,
	coverHeadingRem,
	foldedAt,
	formLayout,
	headingRowRem,
	type PresentationForm,
} from "./form";
import { boxClass, paperShadow, restingBorder, sheetColumn } from "./skin";

const FORMS: readonly PresentationForm[] = [
	"card",
	"tail-above",
	"tail-below",
	"cover",
	"ground",
	"sheet",
];

describe("a Presentation's forms", () => {
	test("a Card's form follows its place in its Deck", () => {
		expect(cardForm("open")).toBe("card");
		expect(cardForm("above")).toBe("tail-above");
		expect(cardForm("below")).toBe("tail-below");
	});

	test("a Card shows its title row, a Cover its bar, and a Ground or a bare Sheet folds the row shut", () => {
		expect(FORMS.map((form) => formLayout(form).face)).toEqual([
			"card",
			"card",
			"card",
			"cover",
			null,
			null,
		]);
	});

	test("only a Card folded below the open one carries its Heading at its foot", () => {
		expect(FORMS.filter((form) => formLayout(form).headingAtFoot)).toEqual([
			"tail-below",
		]);
	});

	test("the open Card and every Sheet scroll; a Card Tail is clipped", () => {
		expect(FORMS.filter((form) => formLayout(form).scrolls)).toEqual([
			"card",
			"cover",
			"ground",
			"sheet",
		]);
	});

	test("a Card's Body fades out at its box's edge; a Sheet lifts the fade", () => {
		expect(FORMS.filter((form) => formLayout(form).fades)).toEqual([
			"card",
			"tail-above",
		]);
	});

	test("a Card's controls rest until it is a Sheet", () => {
		for (const form of FORMS)
			expect(formLayout(form).resting).toBe(!formLayout(form).sheet);
	});
});

describe("the Heading row", () => {
	test("is one Heading row tall on a Card, in every place", () => {
		for (const form of ["card", "tail-above", "tail-below"] as const)
			expect(headingRowRem(form)).toBe(HEADER_REM);
	});

	test("is a Cover's bar: tall at rest, the Pane bar's height once folded", () => {
		expect(headingRowRem("cover")).toBe(coverHeadingRem(false));
		expect(headingRowRem("cover", true)).toBe(BAR_REM);
		expect(coverHeadingRem(false)).toBeGreaterThan(BAR_REM);
	});

	test("folds shut on a Ground and on a bare Sheet", () => {
		expect(headingRowRem("ground")).toBe(0);
		expect(headingRowRem("sheet", true)).toBe(0);
	});

	test("folds past a little scroll and unfolds only back at the top", () => {
		expect(foldedAt(false, 10)).toBe(false);
		expect(foldedAt(false, 30)).toBe(true);
		expect(foldedAt(true, 10)).toBe(true);
		expect(foldedAt(true, 0)).toBe(false);
	});
});

describe("the paper skin", () => {
	test("every form but the Ground has the paper's corners and resting border", () => {
		for (const form of FORMS) {
			const ground = form === "ground";
			expect(boxClass(form).includes("rounded-")).toBe(!ground);
			expect(boxClass(form).includes("border-line-strong")).toBe(!ground);
			expect(restingBorder(form)).toBe(
				ground ? "transparent" : "var(--line-strong)",
			);
		}
	});

	test("a Card is all handle and selects nothing; a Sheet's text selects", () => {
		for (const form of FORMS)
			expect(boxClass(form).includes("select-none")).toBe(
				!formLayout(form).sheet,
			);
	});

	test("a Card says it can be picked up only where a hand can", () => {
		expect(boxClass("card")).toContain("cursor-grab");
		expect(boxClass("card", false)).not.toContain("cursor-grab");
		expect(boxClass("card", false)).not.toContain("touch-none");
		expect(boxClass("card", false)).toContain("select-none");
		expect(boxClass("cover")).not.toContain("cursor-grab");
	});

	test("the shadow grows with the lift, and a Ground casts none", () => {
		expect(paperShadow("card", 0)).toBe(
			"0 0.25rem 0.75rem rgb(0 0 0 / 0.20)",
		);
		expect(paperShadow("card", 1)).toBe(
			"0 1.50rem 3.00rem rgb(0 0 0 / 0.45)",
		);
		expect(paperShadow("cover")).toBe(paperShadow("card"));
		expect(paperShadow("ground", 1)).toBe(
			"0 0.00rem 0.00rem rgb(0 0 0 / 0.00)",
		);
	});

	test("a Sheet's column widens by its gutters, so the text keeps its measure", () => {
		expect(sheetColumn(50, false)).toEqual({
			body: "26rem",
			gutterRem: 1,
			column: "26rem",
		});
		expect(sheetColumn(50, true)).toEqual({
			body: "53rem",
			gutterRem: 2.5,
			column: "50rem",
		});
	});
});
