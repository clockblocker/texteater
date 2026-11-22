import { describe, expect, test } from "bun:test";
import { BAR_REM, HEADER_REM } from "compass";
import {
	cardForm,
	coverFoldRem,
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

	test("stays tall where the Body would fit once it folded", () => {
		/* the fold would hand the Body all it scrolls by, send it back to
		   its top and unfold: a flicker on every scroll */
		expect(foldedAt(false, 30, 0)).toBe(false);
		expect(foldedAt(false, 30, -12)).toBe(false);
		expect(foldedAt(false, 30, 1)).toBe(true);
		expect(coverFoldRem()).toBe(coverHeadingRem(false) - BAR_REM);
	});
});

describe("the paper skin", () => {
	test("every form uses tokenized corners, elevation planes, and a single resting hairline border", () => {
		for (const form of FORMS) {
			const ground = form === "ground";
			const classes = boxClass(form);
			expect(classes.includes("rounded-")).toBe(!ground);
			expect(classes).toContain("bg-clip-padding");
			expect(classes).not.toContain("border-line-strong");
		}
		expect(boxClass("ground")).toContain("border-transparent");
		expect(restingBorder("ground")).toBe("transparent");
		expect(boxClass("card")).toContain("rounded-xl");
		expect(boxClass("card")).toContain("border-[var(--border-card-rest)]");
		expect(restingBorder("card")).toBe("var(--border-card-rest)");
		expect(boxClass("card")).toContain("bg-paper-elevated");
		expect(boxClass("card")).toContain("shadow-card-rest");
		expect(boxClass("card")).toContain("[--note-bg:var(--paper-elevated)]");
		for (const tail of ["tail-above", "tail-below"] as const) {
			expect(boxClass(tail)).toContain("rounded-xl");
			expect(boxClass(tail)).toContain(
				"border-[var(--border-card-tail)]",
			);
			expect(restingBorder(tail)).toBe("var(--border-card-tail)");
			expect(boxClass(tail)).toContain("bg-paper");
			expect(boxClass(tail)).not.toContain("bg-paper-elevated");
			expect(boxClass(tail)).toContain("shadow-card-tail");
		}
		expect(boxClass("cover")).toContain("rounded-t-2xl");
		expect(boxClass("cover")).toContain("rounded-b-none");
		expect(boxClass("cover")).toContain("border-[var(--border-cover)]");
		expect(restingBorder("cover")).toBe("var(--border-cover)");
		expect(boxClass("cover")).toContain("bg-paper");
		expect(boxClass("cover")).toContain("shadow-cover");
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

	test("the shadow follows the elevation tokens and lift, and a Ground casts none", () => {
		expect(paperShadow("card", 0)).toBe("var(--shadow-card-rest)");
		expect(paperShadow("card", 1)).toBe("var(--shadow-card-lift)");
		expect(paperShadow("card", 0.5)).toContain("oklch(");
		expect(paperShadow("tail-above", 0)).toBe("var(--shadow-card-tail)");
		expect(paperShadow("tail-below", 0)).toBe("var(--shadow-card-tail)");
		expect(paperShadow("cover")).toBe("var(--shadow-cover)");
		expect(paperShadow("ground", 1)).toBe("none");
	});

	test("a Sheet's column widens by its gutters, so the text keeps its measure", () => {
		expect(sheetColumn(50, false)).toEqual({
			body: "26rem",
			gutterRem: 1,
			column: "26rem",
		});
		/* and stops at the Notes page's column, where the Blocks stop, so
		   a title set on it starts where they do in a wide Pane too */
		expect(sheetColumn(50, true)).toEqual({
			body: "min(53rem, var(--container-note))",
			gutterRem: 2.5,
			column: "50rem",
		});
	});
});
