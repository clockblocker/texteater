import { describe, expect, test } from "bun:test";
import {
	CARD_WIDTH_REM,
	DECK_TOP_REM,
	deckPlacements,
	HEADER_REM,
	placementBox,
} from "compass";
import {
	cardHeightRem,
	centreScaledTop,
	coverBoxIn,
	OPEN_SCALE,
	pileSlotsIn,
} from "./deck-geometry";

const REM = 16;
/** A Pane with room for a whole pile. */
const PANE = { width: 1200, height: 900 };

describe("a dealt Deck's pile", () => {
	const slots = pileSlotsIn(PANE, 4, { rem: REM });

	test("is the app's: each slot is a Compass placement read in px", () => {
		expect(
			slots.map(({ inlineStart, top, width, height }) => ({
				left: inlineStart,
				top,
				width,
				height,
			})),
		).toEqual(
			deckPlacements(4, OPEN_SCALE).map((placement) =>
				placementBox(placement, { left: 0, top: 0, ...PANE }, REM),
			),
		);
	});

	test("is a column of whole Cards a Heading row apart, the front one at the foot", () => {
		expect(slots).toHaveLength(4);
		for (const [index, slot] of slots.entries()) {
			expect(slot.width).toBe(CARD_WIDTH_REM * REM);
			expect(slot.inlineStart).toBe(
				(PANE.width - CARD_WIDTH_REM * REM) / 2,
			);
			expect(slot.top).toBe((DECK_TOP_REM + index * HEADER_REM) * REM);
			expect(slot.height).toBe(cardHeightRem(4) * REM);
		}
	});

	test("rests its front Card alone at the open scale", () => {
		expect(slots.map((slot) => slot.scale)).toEqual([1, 1, 1, OPEN_SCALE]);
		expect(
			pileSlotsIn(PANE, 2, { rem: REM, openScale: 1.2 }).map(
				(slot) => slot.scale,
			),
		).toEqual([1, 1.2]);
	});

	test("leaves the Card's width room for the open scale in a narrow Pane", () => {
		const [slot] = pileSlotsIn({ width: 320, height: 900 }, 1, {
			rem: REM,
		});
		expect(slot?.width).toBeCloseTo((320 - 2 * REM) / OPEN_SCALE);
	});

	test("starts where the surface says, for one with nothing above its Deck", () => {
		const [first] = pileSlotsIn(PANE, 3, { rem: REM, topRem: 4 });
		expect(first?.top).toBe(4 * REM);
	});

	test("follows the root size", () => {
		const [first] = pileSlotsIn(PANE, 1, { rem: 20 });
		expect(first?.width).toBe(CARD_WIDTH_REM * 20);
		expect(first?.top).toBe(DECK_TOP_REM * 20);
	});

	test("has no slots for no Cards", () => {
		expect(pileSlotsIn(PANE, 0, { rem: REM })).toEqual([]);
	});
});

describe("the open Card's scale", () => {
	test("grows it downward from its top edge, for a renderer that scales about the centre", () => {
		const front = pileSlotsIn(PANE, 4, { rem: REM }).at(-1);
		if (!front) throw new Error("Missing the front slot");
		const top = centreScaledTop(front);
		/* drawn about its centre from `top`, its top edge is the slot's */
		const drawnTop = top - ((front.scale - 1) * front.height) / 2;
		expect(drawnTop).toBeCloseTo(front.top);
		expect(top).toBeGreaterThan(front.top);
	});

	test("moves nothing at scale 1", () => {
		const [back] = pileSlotsIn(PANE, 4, { rem: REM });
		if (!back) throw new Error("Missing the back slot");
		expect(centreScaledTop(back)).toBe(back.top);
	});
});

describe("a Card's height", () => {
	test("is the whole pile for a lone Card, and a Heading row less per Card behind", () => {
		const lone = cardHeightRem(1);
		expect(cardHeightRem(4)).toBe(lone - 3 * HEADER_REM);
		expect(pileSlotsIn(PANE, 1, { rem: REM })[0]?.height).toBe(lone * REM);
	});
});

describe("a Cover's box", () => {
	test("is flush with its Pane's top and inset from its sides and foot", () => {
		const cover = coverBoxIn(PANE, REM);
		expect(cover.top).toBe(0);
		expect(cover.inlineStart).toBeGreaterThan(0);
		expect(cover.width).toBe(PANE.width - 2 * cover.inlineStart);
		expect(cover.height).toBeLessThan(PANE.height);
	});

	test("fills its Pane on a narrow screen", () => {
		expect(coverBoxIn(PANE, REM, true)).toEqual({
			inlineStart: 0,
			top: 0,
			...PANE,
		});
	});
});
