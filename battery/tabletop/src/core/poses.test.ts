import { describe, expect, test } from "bun:test";
import { cover, fan, grid, pile, row } from "./poses";

const card = { w: 4, h: 6 };

describe("pile", () => {
	test("steps each Card a quarter px up and to the start by default", () => {
		const [first, , third] = pile(["a", "b", "c"], "felt", { card });
		expect(first?.slot).toEqual({
			id: "felt:a",
			region: "felt",
			style: {
				insetInlineStart: "calc(50% + -2rem)",
				top: "calc(50% + -3rem)",
				width: "4rem",
				height: "6rem",
			},
		});
		expect(third?.centre).toEqual({ u: -2 / 64, v: -2 / 64 });
	});

	test("takes a step down by a heading for a Deck that shows its tops", () => {
		const cards = pile(["a", "b"], "deck", {
			card,
			step: { u: 0, v: 2.5 },
			origin: { u: 0, v: -1.25 },
		});
		expect(cards.map((posed) => posed.centre.v)).toEqual([-1.25, 1.25]);
	});
});

describe("fan", () => {
	test("turns each Card out of the circle, from −130° to 130°", () => {
		const cards = fan(["a", "b", "c"], "felt", { card });
		expect(cards.map((posed) => posed.rotate)).toEqual([-130, 0, 130]);
		expect(cards[1]?.centre.u).toBeCloseTo(0, 10);
		expect(cards[1]?.centre.v).toBeCloseTo(-55 / 16, 10);
	});

	test("leaves one Card upright", () => {
		expect(fan(["a"], "felt", { card })[0]?.rotate).toBe(0);
	});
});

describe("grid", () => {
	test("lays rows of `columns`, centred", () => {
		const cards = grid(["a", "b", "c"], "felt", {
			card,
			columns: 2,
			gap: 1,
		});
		expect(cards.map((posed) => posed.centre)).toEqual([
			{ u: -2.5, v: -3.5 },
			{ u: 2.5, v: -3.5 },
			{ u: -2.5, v: 3.5 },
		]);
	});
});

describe("row", () => {
	test("spaces Cards by a gap while they fit and closes up in CSS as the Region narrows", () => {
		const cards = row(["a", "b", "c"], "table", { card, gap: 1, inset: 1 });
		expect(cards[0]?.slot.style.insetInlineStart).toBe(
			"calc(50% + -2rem + -1 * max(0rem, min(5rem, (100% - 6rem) / 2)))",
		);
		expect(cards[2]?.centre.u).toBe(5);
	});
});

describe("cover", () => {
	test("fills its Region, inset, centred and at most maxWidth wide", () => {
		expect(cover("pane", { maxWidth: 40, inset: 1.5 })).toEqual({
			id: "pane:cover",
			region: "pane",
			style: {
				insetInlineStart: "calc((100% - min(40rem, 100% - 3rem)) / 2)",
				top: "1.5rem",
				width: "min(40rem, 100% - 3rem)",
				height: "calc(100% - 3rem)",
			},
		});
	});
});
