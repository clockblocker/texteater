import { describe, expect, test } from "bun:test";
import {
	BAR_REM,
	type Box,
	CARD_WIDTH_REM,
	cardHeightPx,
	cardWidthIn,
	coverBoxIn,
	DECK_TOP_REM,
	deckColumnIn,
	deckSlotsIn,
	deckTopIn,
	dropRegions,
	edgeWidth,
	groundBoxIn,
	HEADER_REM,
	HYSTERESIS_PX,
	handBoxIn,
	inside,
	isNarrow,
	NARROW_BELOW_REM,
	PILE_HEIGHT_REM,
	type Region,
	regionAt,
	returnBandIn,
	sameBoxes,
	sheetZ,
	sideOf,
	spawnSize,
	Z,
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
		const tall = dropRegions(PANE, CARD_WIDTH_REM, REM, { barRem: 4.5 });
		expect(tall.bar.height).toBe(72);
		expect(tall.cover.top).toBe(50 + 72);
	});

	test("in right-to-left text inline-start is on the right", () => {
		const rtl = dropRegions(PANE, CARD_WIDTH_REM, REM, {
			direction: "rtl",
		});
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

	test("on a narrow screen a Pane has no edges and its cover region spans it", () => {
		const narrow = dropRegions(PANE, CARD_WIDTH_REM, REM, { narrow: true });
		expect(narrow.edges).toEqual([]);
		expect(narrow.cover).toEqual({
			left: 100,
			top: 50 + BAR_REM * REM,
			width: 1200,
			height: 900 - BAR_REM * REM,
		});
		expect(narrow.bar).toEqual(regions.bar);
		/* so a pointer at the very side opens a Cover rather than a Pane */
		expect(regionAt([{ paneId: "a", regions: narrow }], 101, 400)).toEqual({
			kind: "cover",
			paneId: "a",
		});
	});
});

describe("isNarrow", () => {
	test("a screen is narrow below the md breakpoint, at the root size given", () => {
		expect(isNarrow(NARROW_BELOW_REM * REM - 1, REM)).toBe(true);
		expect(isNarrow(NARROW_BELOW_REM * REM, REM)).toBe(false);
		expect(isNarrow(800, 20)).toBe(true);
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

	test("on a narrow screen a Cover fills its Pane", () => {
		expect(coverBoxIn(PANE, REM, true)).toEqual(PANE);
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

describe("sheetZ", () => {
	/** A Pane's Sheets: its Ground and then twelve Covers, bottom first. */
	const z = Array.from({ length: 13 }, (_, index) => sheetZ(index));

	test("a Ground rests at Z.sheet and each Cover one higher, up to the cap", () => {
		expect(z.slice(0, 9)).toEqual(
			Array.from({ length: 9 }, (_, index) => Z.sheet + index),
		);
	});

	test("in a Pane of twelve Covers every Sheet stays below the Deck", () => {
		for (const sheet of z) expect(sheet).toBeLessThan(Z.deck);
		const slots = deckSlotsIn(
			PANE,
			Array.from({ length: 25 }, (_, index) => ({
				id: `card-${index.toString()}`,
				subject: index.toString(),
			})),
			null,
			REM,
			OPEN_SCALE,
		);
		const lowestCard = Math.min(...slots.map((slot) => slot.z));
		expect(Math.max(...z)).toBeLessThan(lowestCard);
	});

	test("no Cover sinks under the Sheet below it", () => {
		z.forEach((sheet, index) => {
			if (index > 0)
				expect(sheet).toBeGreaterThanOrEqual(z[index - 1] ?? 0);
		});
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

	describe("a Note in hand", () => {
		/* the frame's client box: offset, so client and frame coordinates differ */
		const frame: Box = { left: 40, top: 30, width: 1000, height: 800 };
		const width = cardWidthIn(PANE.width, REM, OPEN_SCALE);

		test("is Card-wide for its Pane, centred on the hand and held below its top", () => {
			expect(
				handBoxIn(frame, PANE.width, 540, 230, 288, REM, OPEN_SCALE),
			).toEqual({
				left: 500 - width / 2,
				top: 200 - 24,
				width,
				height: 288,
			});
		});

		test("never leaves the frame across", () => {
			expect(
				handBoxIn(frame, PANE.width, 45, 230, 288, REM, OPEN_SCALE)
					.left,
			).toBe(0);
			expect(
				handBoxIn(frame, PANE.width, 1030, 230, 288, REM, OPEN_SCALE)
					.left,
			).toBe(1000 - width);
		});

		test("narrows with a narrow Pane", () => {
			expect(
				handBoxIn(frame, 300, 540, 230, 288, REM, OPEN_SCALE).width,
			).toBeCloseTo(268 / 1.05);
		});
	});

	test("the front Card gives up one Heading row to each Card folded behind it", () => {
		expect(cardHeightPx(1, REM)).toBe(PILE_HEIGHT_REM * REM);
		expect(cardHeightPx(4, REM)).toBe(
			(PILE_HEIGHT_REM - 3 * HEADER_REM) * REM,
		);
		expect(cardHeightPx(0, REM)).toBe(cardHeightPx(1, REM));
	});

	test("in a shorter column the front Card is shorter, and never less than a Heading row", () => {
		expect(cardHeightPx(4, REM, 300)).toBe(300 - 3 * HEADER_REM * REM);
		expect(cardHeightPx(12, REM, 300)).toBe(HEADER_REM * REM);
	});

	describe("in a short Pane", () => {
		const foot = (box: Box) => box.top + box.height;
		const paneOf = (height: number): Box => ({ ...PANE, height });

		test("it shrinks to fit below its top, keeping a rem under its foot", () => {
			const pane = paneOf(560);
			const column = deckColumnIn(pane, REM, OPEN_SCALE);
			expect(column.top).toBe(50 + DECK_TOP_REM * REM);
			expect(foot(column)).toBe(foot(pane) - REM);
			expect(column.height).toBeLessThan(PILE_HEIGHT_REM * REM);
		});

		test("shorter still, it keeps a usable pile and moves up instead", () => {
			const pane = paneOf(350);
			const column = deckColumnIn(pane, REM, OPEN_SCALE);
			expect(column.height).toBe(16 * REM);
			expect(foot(column)).toBe(foot(pane) - REM);
			expect(column.top).toBeLessThan(50 + DECK_TOP_REM * REM);
		});

		test("it never rises over the Pane bar, and shrinks to what is left", () => {
			const pane = paneOf(200);
			const column = deckColumnIn(pane, REM, OPEN_SCALE);
			expect(column.top).toBe(50 + BAR_REM * REM);
			expect(foot(column)).toBe(foot(pane) - REM);
		});

		test("a stage Deck, nearer its top than the bar, keeps its own top", () => {
			const column = deckColumnIn(paneOf(900), REM, OPEN_SCALE, 1);
			expect(column.top).toBe(50 + REM);
		});

		test("whatever the Pane, the Deck stays inside it", () => {
			for (const height of [0, 40, 120, 300, 480, 700, 900, 2000]) {
				const pane = paneOf(height);
				const column = deckColumnIn(pane, REM, OPEN_SCALE);
				expect(column.height).toBeGreaterThanOrEqual(0);
				expect(foot(column)).toBeLessThanOrEqual(
					Math.max(foot(pane), column.top),
				);
			}
		});
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

	test("on a narrow screen the return band spans the Pane", () => {
		const band = returnBandIn(PANE, CARD_WIDTH_REM, REM, OPEN_SCALE, {
			narrow: true,
		});
		expect(band.left).toBe(100);
		expect(band.width).toBe(1200);
	});
});

describe("deckSlotsIn", () => {
	/** Five Cards in rank, a to e. */
	const cards = ["a", "b", "c", "d", "e"].map((id) => ({
		id,
		subject: id,
	}));
	const slotsOf = (frontId: string | null) =>
		deckSlotsIn(PANE, cards, frontId, REM, OPEN_SCALE);

	test("Cards are drawn last in rank first", () => {
		expect(slotsOf("c").map((slot) => slot.card.id)).toEqual([
			"e",
			"d",
			"c",
			"b",
			"a",
		]);
	});

	test("the front Card is open, those drawn before it fold above it and the rest below", () => {
		expect(slotsOf("c").map((slot) => slot.place)).toEqual([
			"above",
			"above",
			"open",
			"below",
			"below",
		]);
		expect(slotsOf("e").map((slot) => slot.place)).toEqual([
			"open",
			"below",
			"below",
			"below",
			"below",
		]);
	});

	test("a front id that names no Card opens the first in rank", () => {
		for (const frontId of [null, "gone"])
			expect(slotsOf(frontId).map((slot) => slot.place)).toEqual([
				"above",
				"above",
				"above",
				"above",
				"open",
			]);
	});

	test("slots sit one Heading row apart in the Deck's column, each as tall as the front Card", () => {
		const column = deckColumnIn(PANE, REM, OPEN_SCALE);
		expect(slotsOf("c").map((slot) => slot.box)).toEqual(
			cards.map((_, index) => ({
				left: column.left,
				top: column.top + index * HEADER_REM * REM,
				width: column.width,
				height: cardHeightPx(5, REM, column.height),
			})),
		);
	});

	test("z rises toward the open Card from both sides, and the open Card is over all", () => {
		const z = slotsOf("c").map((slot) => slot.z);
		expect(z).toEqual([
			Z.deck + 7,
			Z.deck + 8,
			Z.deck + 9,
			Z.deck + 8,
			Z.deck + 7,
		]);
		const front = slotsOf("d").map((slot) => slot.z);
		expect(front[1]).toBe(Math.max(...front));
	});

	describe.each([11, 25])("in a Deck of %i Cards", (count) => {
		const many = Array.from({ length: count }, (_, index) => ({
			id: `card-${index.toString()}`,
			subject: index.toString(),
		}));
		const frontIds = [null, ...many.map((card) => card.id)];

		test("every folded Card stays below the open Card and the drop zones", () => {
			for (const frontId of frontIds) {
				const slots = deckSlotsIn(PANE, many, frontId, REM, OPEN_SCALE);
				const open = slots.find((slot) => slot.place === "open");
				for (const slot of slots) {
					expect(slot.z).toBeGreaterThanOrEqual(Z.deck);
					expect(slot.z).toBeLessThan(Z.zone);
					if (slot !== open)
						expect(slot.z).toBeLessThan(open?.z ?? 0);
				}
			}
		});

		test("of two folded Cards that overlap, the one nearer the open Card is over", () => {
			for (const frontId of frontIds) {
				const slots = deckSlotsIn(PANE, many, frontId, REM, OPEN_SCALE);
				const openAt = slots.findIndex((slot) => slot.place === "open");
				slots.forEach((a, i) => {
					slots.forEach((b, j) => {
						const overlap =
							a.box.top < b.box.top + b.box.height &&
							b.box.top < a.box.top + a.box.height;
						if (
							i !== j &&
							overlap &&
							Math.abs(i - openAt) < Math.abs(j - openAt)
						)
							expect(a.z).toBeGreaterThan(b.z);
					});
				});
			}
		});
	});

	test("an empty Deck has no slots", () => {
		expect(deckSlotsIn(PANE, [], null, REM, OPEN_SCALE)).toEqual([]);
	});

	test("a stage Deck's slots start at its own top", () => {
		const [first] = deckSlotsIn(PANE, cards, null, REM, OPEN_SCALE, 1);
		expect(first?.box.top).toBe(50 + REM);
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
