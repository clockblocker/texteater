import { describe, expect, test } from "vitest";
import {
	BAR_REM,
	type Box,
	CARD_WIDTH_REM,
	cardHeightPx,
	cardWidthIn,
	coverBoxIn,
	DECK_TOP_REM,
	deckColumnIn,
	deckTopIn,
	dropRegions,
	edgeWidth,
	groundBoxIn,
	HEADER_REM,
	HYSTERESIS_PX,
	inside,
	PILE_HEIGHT_REM,
	type Region,
	regionAt,
	returnBandIn,
	sameBoxes,
	sideOf,
	spawnSize,
} from "./geometry";

const REM = 16;
const OPEN_SCALE = 1.05;
const TEXT_COLUMN_REM = 42;
/** A wide Pane, offset in its frame so nothing passes by starting at zero. */
const PANE: Box = { left: 100, top: 50, width: 1200, height: 900 };

function boxAt(box: Box, scale: number): Box {
	return {
		left: box.left * scale,
		top: box.top * scale,
		width: box.width * scale,
		height: box.height * scale,
	};
}

describe("spawnSize", () => {
	test("a Pane opens as wide as the Card's column plus the Cover insets", () => {
		expect(spawnSize(CARD_WIDTH_REM, 2000, REM)).toBe((26 + 3) * REM);
		expect(spawnSize(TEXT_COLUMN_REM, 2000, REM)).toBe((42 + 3) * REM);
	});

	test("it never takes more than half the Pane it splits", () => {
		expect(spawnSize(TEXT_COLUMN_REM, 1000, REM)).toBe(500);
	});

	test("it is a whole number of px", () => {
		expect(spawnSize(CARD_WIDTH_REM, 999, REM)).toBe(464);
		expect(spawnSize(CARD_WIDTH_REM, 2000, 15.5)).toBe(
			Math.round(29 * 15.5),
		);
	});

	test("it scales with the root size", () => {
		expect(spawnSize(CARD_WIDTH_REM, 4000, 20)).toBe(29 * 20);
	});
});

describe("dropRegions", () => {
	const regions = dropRegions(PANE, CARD_WIDTH_REM, REM);
	const side = edgeWidth(CARD_WIDTH_REM, PANE.width, REM);

	test("a side region is the Pane a drop there spawns, capped at three tenths of its Pane", () => {
		expect(edgeWidth(CARD_WIDTH_REM, 2000, REM)).toBe(
			spawnSize(CARD_WIDTH_REM, 2000, REM),
		);
		expect(side).toBe(1200 * 0.3);
		expect(edgeWidth(TEXT_COLUMN_REM, 800, REM)).toBe(240);
	});

	test("the edges run the Pane's full height, one on each side", () => {
		expect(regions.edges).toEqual([
			{
				edge: "inline-start",
				box: { left: 100, top: 50, width: side, height: 900 },
			},
			{
				edge: "inline-end",
				box: { left: 1300 - side, top: 50, width: side, height: 900 },
			},
		]);
	});

	test("the cover region lies between the edges, under the bar", () => {
		const bar = BAR_REM * REM;
		expect(regions.bar).toEqual({
			left: 100,
			top: 50,
			width: 1200,
			height: bar,
		});
		expect(regions.cover).toEqual({
			left: 100 + side,
			top: 50 + bar,
			width: 1200 - 2 * side,
			height: 900 - bar,
		});
	});

	test("a taller bar pushes the cover region down", () => {
		const tall = dropRegions(PANE, CARD_WIDTH_REM, REM, 4.5);
		expect(tall.bar.height).toBe(72);
		expect(tall.cover.top).toBe(50 + 72);
	});

	test("in right-to-left text inline-start is on the right", () => {
		const rtl = dropRegions(PANE, CARD_WIDTH_REM, REM, BAR_REM, "rtl");
		expect(rtl.edges.map((e) => [e.edge, e.box.left])).toEqual([
			["inline-end", 100],
			["inline-start", 1300 - side],
		]);
		expect(rtl.cover).toEqual(regions.cover);
	});

	test("every region scales with the root size", () => {
		const scaled = dropRegions(boxAt(PANE, 1.25), CARD_WIDTH_REM, 20);
		expect(scaled.cover).toEqual(boxAt(regions.cover, 1.25));
		expect(scaled.bar).toEqual(boxAt(regions.bar, 1.25));
	});
});

describe("sideOf", () => {
	test("inline-start is left in left-to-right text and right in right-to-left", () => {
		expect(sideOf("inline-start", "ltr")).toBe("left");
		expect(sideOf("inline-end", "ltr")).toBe("right");
		expect(sideOf("inline-start", "rtl")).toBe("right");
		expect(sideOf("inline-end", "rtl")).toBe("left");
	});
});

describe("regionAt", () => {
	const LEFT: Box = { left: 0, top: 0, width: 800, height: 900 };
	const RIGHT: Box = { left: 800, top: 0, width: 800, height: 900 };
	const panes = [
		{ paneId: "a", regions: dropRegions(LEFT, CARD_WIDTH_REM, REM) },
		{ paneId: "b", regions: dropRegions(RIGHT, CARD_WIDTH_REM, REM) },
	];
	const side = edgeWidth(CARD_WIDTH_REM, 800, REM);
	const below = BAR_REM * REM + 100;

	test("a pointer over a side region is over that edge of its Pane", () => {
		expect(regionAt(panes, 10, below)).toEqual({
			kind: "edge",
			paneId: "a",
			edge: "inline-start",
		});
		expect(regionAt(panes, 1590, below)).toEqual({
			kind: "edge",
			paneId: "b",
			edge: "inline-end",
		});
	});

	test("between the edges and under the bar it is the cover region", () => {
		expect(regionAt(panes, 400, below)).toEqual({
			kind: "cover",
			paneId: "a",
		});
	});

	test("the bar is chrome: no region, though an edge reaches up beside it", () => {
		expect(regionAt(panes, 400, 10)).toBeNull();
		expect(regionAt(panes, 10, 10)).toBeNull();
	});

	test("outside every Pane there is no region", () => {
		expect(regionAt(panes, 400, 1000)).toBeNull();
	});

	test("a region held is kept until the pointer is HYSTERESIS_PX outside it", () => {
		const held: Region = {
			kind: "edge",
			paneId: "a",
			edge: "inline-start",
		};
		const justOut = side + HYSTERESIS_PX - 1;
		/* entered fresh, that point is the cover region */
		expect(regionAt(panes, justOut, below)).toEqual({
			kind: "cover",
			paneId: "a",
		});
		expect(regionAt(panes, justOut, below, held)).toBe(held);
		expect(regionAt(panes, side + HYSTERESIS_PX + 1, below, held)).toEqual({
			kind: "cover",
			paneId: "a",
		});
	});

	test("the margin reaches across into the next Pane", () => {
		const held: Region = { kind: "edge", paneId: "a", edge: "inline-end" };
		expect(regionAt(panes, 800 + HYSTERESIS_PX - 1, below, held)).toBe(
			held,
		);
		expect(regionAt(panes, 800 + HYSTERESIS_PX + 1, below, held)).toEqual({
			kind: "edge",
			paneId: "b",
			edge: "inline-start",
		});
	});

	test("a held cover region is left at once on its Pane's bar", () => {
		const held: Region = { kind: "cover", paneId: "a" };
		expect(regionAt(panes, 400, BAR_REM * REM - 1, held)).toBeNull();
	});

	test("a held region in a Pane no longer measured is not kept", () => {
		const held: Region = { kind: "cover", paneId: "gone" };
		expect(regionAt(panes, 400, below, held)).toEqual({
			kind: "cover",
			paneId: "a",
		});
	});
});

describe("Sheet boxes", () => {
	test("a Cover is flush with its Pane's top and inset from its sides and foot", () => {
		expect(coverBoxIn(PANE, REM)).toEqual({
			left: 124,
			top: 50,
			width: 1152,
			height: 876,
		});
	});

	test("a Ground fills its Pane under the bar", () => {
		expect(groundBoxIn(PANE, REM)).toEqual({
			left: 100,
			top: 86,
			width: 1200,
			height: 864,
		});
		expect(groundBoxIn(PANE, REM, 4.5).top).toBe(50 + 72);
	});

	test("neither collapses below nothing in a Pane too small for it", () => {
		const tiny: Box = { left: 0, top: 0, width: 20, height: 20 };
		expect(coverBoxIn(tiny, REM)).toMatchObject({ width: 0, height: 0 });
		expect(groundBoxIn(tiny, REM)).toMatchObject({ height: 0 });
	});

	test("both scale with the root size", () => {
		expect(coverBoxIn(boxAt(PANE, 1.25), 20)).toEqual(
			boxAt(coverBoxIn(PANE, REM), 1.25),
		);
		expect(groundBoxIn(boxAt(PANE, 1.25), 20)).toEqual(
			boxAt(groundBoxIn(PANE, REM), 1.25),
		);
	});
});

describe("the Deck", () => {
	test("its top sits DECK_TOP_REM below its Pane's top, at the root size given", () => {
		expect(deckTopIn(16)).toBe(DECK_TOP_REM * 16);
		/* it was 12 * 16 px whatever the root size, so a larger root
		   font slid the Deck up under the Text it was dealt from */
		expect(deckTopIn(20)).toBe(240);
		expect(deckTopIn(20, 3)).toBe(60);
	});

	test("its column is centred in its Pane and as tall as the pile", () => {
		const column = deckColumnIn(PANE, REM, OPEN_SCALE);
		expect(column).toEqual({
			left: 100 + (1200 - CARD_WIDTH_REM * REM) / 2,
			top: 50 + DECK_TOP_REM * REM,
			width: CARD_WIDTH_REM * REM,
			height: PILE_HEIGHT_REM * REM,
		});
	});

	test("a Card narrows in a narrow Pane, leaving room for its resting scale", () => {
		expect(cardWidthIn(300, REM, OPEN_SCALE)).toBeCloseTo(268 / 1.05);
		expect(cardWidthIn(10, REM, OPEN_SCALE)).toBe(0);
	});

	test("the front Card gives up one Heading row to each Card folded behind it", () => {
		expect(cardHeightPx(1, REM)).toBe(PILE_HEIGHT_REM * REM);
		expect(cardHeightPx(4, REM)).toBe(
			(PILE_HEIGHT_REM - 3 * HEADER_REM) * REM,
		);
		expect(cardHeightPx(0, REM)).toBe(cardHeightPx(1, REM));
	});

	test("the return band spans between the edges, from the Deck's top to below its foot", () => {
		const side = edgeWidth(CARD_WIDTH_REM, PANE.width, REM);
		const column = deckColumnIn(PANE, REM, OPEN_SCALE);
		expect(returnBandIn(PANE, CARD_WIDTH_REM, REM, OPEN_SCALE)).toEqual({
			left: 100 + side,
			top: column.top,
			width: 1200 - 2 * side,
			height: column.height + 3 * REM,
		});
	});
});

describe("boxes", () => {
	const box: Box = { left: 10, top: 10, width: 10, height: 10 };

	test("inside includes the edges and grows by the margin given", () => {
		expect(inside(box, 10, 20)).toBe(true);
		expect(inside(box, 21, 15)).toBe(false);
		expect(inside(box, 21, 15, 1)).toBe(true);
	});

	test("sameBoxes compares every measured box by value", () => {
		expect(sameBoxes({ a: box }, { a: { ...box } })).toBe(true);
		expect(sameBoxes({ a: box }, { a: { ...box, top: 11 } })).toBe(false);
		expect(sameBoxes({ a: box }, { b: box })).toBe(false);
		expect(sameBoxes({ a: box, b: box }, { a: box })).toBe(false);
	});
});
