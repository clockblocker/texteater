import { describe, expect, test } from "bun:test";
import type { Box } from "./geometry";
import {
	boxStyle,
	greatest,
	inRem,
	minus,
	type Placement,
	paneAnchor,
	paneHeight,
	paneWidth,
	placementBox,
	placementStyle,
	times,
} from "./placement";

const PANE: Box = { left: 100, top: 50, width: 1200, height: 900 };

/** Centred, 10rem wide, a bar's height down, filling the rest of the Pane. */
const placement: Placement = {
	inlineStart: times(0.5, minus(paneWidth, inRem(10))),
	top: inRem(2),
	width: inRem(10),
	height: greatest(inRem(0), minus(paneHeight, inRem(2))),
};

describe("placementBox", () => {
	test("reads a placement in px against a measured Pane", () => {
		expect(placementBox(placement, PANE, 16)).toEqual({
			left: 100 + (1200 - 160) / 2,
			top: 50 + 32,
			width: 160,
			height: 900 - 32,
		});
	});

	test("measures inline-start from the Pane's right edge in right-to-left text", () => {
		const start: Placement = { ...placement, inlineStart: inRem(1) };
		expect(placementBox(start, PANE, 16, "rtl").left).toBe(
			100 + 1200 - 16 - 160,
		);
	});
});

describe("placementStyle", () => {
	const anchor = paneAnchor("pane-1");

	test("reads the Pane through its anchor: edges in insets, its size in sizes", () => {
		expect(placementStyle(placement, anchor)).toEqual({
			insetInlineStart:
				"calc(anchor(--pane-pane-1 start) + (0.5 * ((anchor(--pane-pane-1 end) - anchor(--pane-pane-1 start)) + (-1 * 10rem))))",
			top: "calc(anchor(--pane-pane-1 top) + 2rem)",
			width: "calc(10rem)",
			height: "calc(max(0px, (anchor-size(--pane-pane-1 height) + (-1 * 2rem))))",
		});
	});

	test("refuses a length an inset cannot read", () => {
		expect(() =>
			placementStyle({ ...placement, top: paneWidth }, anchor),
		).toThrow();
	});

	test("an anchor name holds only ident characters", () => {
		expect(paneAnchor("pane 2/a")).toBe("--pane-pane_2_a");
	});
});

describe("boxStyle", () => {
	const box: Box = { left: 10, top: 20, width: 30, height: 40 };

	test("places a measured box from the inline-start edge", () => {
		expect(boxStyle(box, "ltr")).toEqual({
			insetInlineStart: "10px",
			top: "20px",
			width: "30px",
			height: "40px",
		});
		expect(boxStyle(box, "rtl").insetInlineStart).toBe("calc(100% - 40px)");
	});
});
