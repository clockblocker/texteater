import { describe, expect, test } from "bun:test";
import { poker, shuffle } from "tabletop/core";
import {
	bysuitPose,
	CARD_IDS,
	cardOf,
	freshDeck,
	placesOf,
	pokerPose,
	putDown,
	slotsOf,
	stackPose,
	turnOver,
	withTrick,
} from "./deck";

/* every number below is deck-of-cards' own, from upstream's `lib/modules/*.js`,
   in the library's px: rem × 16 at its 16 px root */

const px = (rem: number) => Math.round(rem * 16 * 1e6) / 1e6;

function centreOf(
	posed: readonly { id: string; centre: { u: number; v: number } }[],
	id: string,
) {
	const found = posed.find((one) => one.id === id);
	if (!found) throw new Error(`no ${id}`);
	return { x: px(found.centre.u), y: px(found.centre.v) };
}

describe("a fresh Deck", () => {
	test("is the library's 52 in order, stacked and face down", () => {
		const deck = freshDeck();
		expect(deck.order).toHaveLength(52);
		expect(cardOf(deck.order[17] as string)).toMatchObject({
			rank: 5,
			suit: 1,
		});
		expect(new Set(Object.values(deck.sides))).toEqual(new Set(["back"]));
		const places = placesOf(deck);
		expect(places.get("0_1")).toMatchObject({ z: 0, rotate: 0 });
		expect(places.get("3_13")).toMatchObject({ z: 51, side: "back" });
	});
});

describe("the poses", () => {
	test("the stack rests Card i a quarter px up and to the left", () => {
		expect(centreOf(stackPose(CARD_IDS), "3_13")).toEqual({
			x: -12.75,
			y: -12.75,
		});
	});

	test("by suit lays four rows, ace to king, 8 px and 92 px apart", () => {
		/* the 5 of hearts: −round((6.75 − 5) × 8), −round((1.5 − 1) × 92) */
		expect(centreOf(bysuitPose(CARD_IDS), "1_5")).toEqual({
			x: -14,
			y: -46,
		});
		expect(centreOf(bysuitPose(CARD_IDS), "3_13")).toEqual({
			x: 50,
			y: 138,
		});
	});

	test("poker deals the top five in a row 110 px up, the top Card first", () => {
		const dealt = CARD_IDS.slice(-5).reverse();
		expect(dealt.map((id) => centreOf(pokerPose(CARD_IDS), id))).toEqual(
			[-143, -73, -3, 67, 137].map((x) => ({ x, y: -110 })),
		);
		expect(centreOf(pokerPose(CARD_IDS), "0_2")).toEqual({
			x: -0.25,
			y: -0.25,
		});
	});

	test("poker raises the five over the Deck at len − 1 + k", () => {
		const deck = withTrick(
			freshDeck(),
			poker(CARD_IDS, pokerPose),
			"poker",
		);
		const places = placesOf(deck);
		expect(places.get("3_13")).toMatchObject({ z: 51, side: "front" });
		expect(places.get("3_9")).toMatchObject({ z: 55, side: "front" });
		expect(places.get("3_8")).toMatchObject({ z: 46, side: "back" });
	});
});

describe("the reader's hand", () => {
	test("puts a Card down where it lets go, over every other, until a trick moves it", () => {
		const down = putDown(freshDeck(), "0_1", { u: 3, v: -2 });
		expect(placesOf(down).get("0_1")?.z).toBe(52);
		expect(
			slotsOf(down).find((slot) => slot.id === "felt:0_1")?.style,
		).toMatchObject({ top: "calc(50% + -4.75rem)" });
		const again = putDown(down, "0_2", { u: 0, v: 0 });
		expect(placesOf(again).get("0_2")?.z).toBe(53);
		const shuffled = withTrick(
			again,
			shuffle(again.order, stackPose),
			"stack",
		);
		expect(shuffled.loose).toEqual({});
	});

	test("keeps a Card put down through a trick that only turns it", () => {
		const down = putDown(freshDeck(), "0_1", { u: 3, v: -2 });
		const dealt = withTrick(down, poker(down.order, pokerPose), "poker");
		expect(Object.keys(dealt.loose)).toEqual(["0_1"]);
	});

	test("turns a Card over with a tap", () => {
		expect(turnOver(freshDeck(), "0_1").sides["0_1"]).toBe("front");
	});
});
