import { describe, expect, test } from "bun:test";
import { DECK_OF_CARDS_EASE } from "./ease";
import type { Posed } from "./place";
import { arrange, fan, pile } from "./poses";
import type { Trick, TrickLeg, TrickMove } from "./trick";
import {
	bysuit,
	deal,
	fanOut,
	flip,
	poker,
	shuffle,
	sort,
	turnDown,
} from "./tricks";

/* every number below is deck-of-cards' own, from upstream's `lib/modules/*.js`;
   the library's px are rem × 16 at its 16 px root */

const CARD = { w: 62 / 16, h: 88 / 16 };
const DECK = Array.from({ length: 52 }, (_, i) => `c${i}`);
const stack = (order: readonly string[]) => pile(order, "felt", { card: CARD });
const fanned = (order: readonly string[]) => fan(order, "felt", { card: CARD });

function moveOf(trick: Trick, id: string): TrickMove {
	return trick.moves.get(id) as TrickMove;
}

function at(trick: Trick, index: number): TrickMove {
	return moveOf(trick, trick.order[index] as string);
}

function restOf(trick: Trick, index: number): Posed {
	return trick.rest[index] as Posed;
}

/** Where a leg takes the Card, in the library's px from the felt's centre. */
function absolute(trick: Trick, index: number, leg: TrickLeg) {
	const rest = restOf(trick, index);
	return {
		x: (rest.centre.u + (leg.to.u ?? 0)) * 16,
		y: (rest.centre.v + (leg.to.v ?? 0)) * 16,
		rot: rest.rotate + (leg.to.rotate ?? 0),
	};
}

/** A `Math.random` that replays `values`, then 0.5. */
function replay(values: readonly number[]): () => number {
	let next = 0;
	return () => values[next++] ?? 0.5;
}

describe("the stack", () => {
	test("rests Card i a quarter px per Card up and to the left", () => {
		const centres = stack(DECK).map((posed) => posed.centre);
		expect(centres[4]).toEqual({ u: -1 / 16, v: -1 / 16 });
		expect((centres[51]?.u ?? 0) * 16).toBe(-12.75);
	});
});

describe("deal, the library's intro", () => {
	const trick = deal(DECK, stack, { faceDown: true });

	test("starts each Card 250 px above its rest, unseen, face up", () => {
		const move = at(trick, 8);
		expect(move.from).toEqual({
			u: 0,
			v: -250 / 16,
			w: 0,
			h: 0,
			rotate: 0,
			opacity: -1,
			turn: -180,
		});
		expect((restOf(trick, 8).centre.v + (move.from?.v ?? 0)) * 16).toBe(
			-252,
		);
	});

	test("drops it for 1000 ms after 500 + 10i, fading in on the linear time", () => {
		const move = at(trick, 8);
		expect(move.legs).toEqual([
			{ at: 580, ms: 1000, to: { u: 0, v: 0 } },
			{
				at: 580,
				ms: 1000,
				to: { opacity: 0 },
				ease: DECK_OF_CARDS_EASE.linear,
			},
		]);
		expect(move.zAt).toBe(580);
	});

	test("turns it face down 250 ms after it lands", () => {
		expect(at(trick, 8).sideAt).toBe(1830);
		expect(new Set(trick.sides?.values())).toEqual(new Set(["back"]));
	});

	test("keeps each Card's side and face without faceDown", () => {
		const plain = deal(DECK, stack);
		expect(at(plain, 8).sideAt).toBeUndefined();
		expect(at(plain, 8).from?.turn).toBeUndefined();
		expect(plain.sides).toBeUndefined();
	});
});

describe("fanOut", () => {
	const trick = fanOut(DECK, fanned);

	test("gathers onto the stack for 300 ms, then spreads for 300 from −130° to 130°", () => {
		const last = at(trick, 51);
		const gather = absolute(trick, 51, last.legs[0] as TrickLeg);
		expect(gather.x).toBeCloseTo(-12.75, 10);
		expect(gather.y).toBeCloseTo(-12.75, 10);
		expect(gather.rot).toBeCloseTo(0, 10);
		expect(last.legs[0]).toMatchObject({ at: 510, ms: 300 });
		expect(last.legs[1]).toEqual({
			at: 810,
			ms: 300,
			to: { u: 0, v: 0, rotate: 0 },
		});
		expect(restOf(trick, 0).rotate).toBe(-130);
		expect(restOf(trick, 51).rotate).toBe(130);
	});

	test("rests on radius 55 around the centre, its stacking order set as it spreads", () => {
		const radians = ((130 - 90) * Math.PI) / 180;
		expect(restOf(trick, 51).centre.u * 16).toBeCloseTo(
			Math.cos(radians) * 55,
			10,
		);
		expect(restOf(trick, 51).centre.v * 16).toBeCloseTo(
			Math.sin(radians) * 55,
			10,
		);
		expect(at(trick, 51).zAt).toBe(810);
	});
});

describe("shuffle", () => {
	const deck = DECK.slice(0, 3);

	test("reorders as Fisher–Yates does with the same draws", () => {
		/* i = 2 swaps with floor(0.9 × 3) = 2, i = 1 with floor(0.1 × 2) = 0 */
		expect(
			shuffle(deck, stack, { random: replay([0.9, 0.1]) }).order,
		).toEqual(["c1", "c0", "c2"]);
	});

	test("slides each Card 20–60 px out from the centre, level with its place, and back", () => {
		/* card 1: distance 0.5 × 40 + 20 = 40, round(0.7) = 1 → left */
		const trick = shuffle(deck, stack, {
			random: replay([0.9, 0.1, 0, 0, 0.5, 0.7]),
		});
		const move = at(trick, 1);
		const out = absolute(trick, 1, move.legs[0] as TrickLeg);
		expect(out.x).toBeCloseTo(-40, 10);
		expect(out.y).toBeCloseTo(-0.25, 10);
		expect(move.legs[0]).toMatchObject({ at: 2, ms: 200 });
		expect(move.legs[1]).toEqual({
			at: 202,
			ms: 200,
			to: { u: 0, v: 0, rotate: 0 },
		});
		expect(move.zAt).toBe(202);
		/* card 0: distance 20, round(0) = 0 → right */
		const right = at(trick, 0);
		expect(absolute(trick, 0, right.legs[0] as TrickLeg).x).toBe(20);
	});

	test("scales the slide with the Cards", () => {
		const trick = shuffle(deck, stack, {
			scale: 2,
			random: replay([0.9, 0.1, 0, 0]),
		});
		expect(absolute(trick, 0, at(trick, 0).legs[0] as TrickLeg).x).toBe(40);
	});
});

describe("sort", () => {
	const rank = (id: string) => Number(id.slice(1));

	test("puts the highest rank at the bottom, or with reverse the lowest", () => {
		expect(sort(DECK, stack, { rank }).order[0]).toBe("c51");
		expect(sort(DECK, stack, { rank, reverse: true }).order[0]).toBe("c0");
	});

	test("lifts to y −150 in 400 ms, restacks, and comes down at 500 ms", () => {
		const trick = sort(DECK, stack, { rank });
		const move = at(trick, 3);
		const lift = absolute(trick, 3, move.legs[0] as TrickLeg);
		expect(lift.y).toBeCloseTo(-150, 10);
		expect(lift.x).toBeCloseTo(-0.75, 10);
		expect(lift.rot).toBe(0);
		expect(move.legs[0]).toMatchObject({ at: 30, ms: 400 });
		expect(move.legs[1]).toEqual({
			at: 530,
			ms: 400,
			to: { u: 0, v: 0, rotate: 0 },
		});
		expect(move.zAt).toBe(430);
	});
});

describe("bysuit", () => {
	/* a 5 of hearts is the library's card 17 */
	const index = (id: string) => Number(id.slice(1));
	const rows = (order: readonly string[]) =>
		arrange(order, "felt", {
			card: CARD,
			centre: (id) => ({ u: index(id) / 16, v: 0 }),
		});

	test("moves each Card straight to its row in 400 ms, 10 ms × its own number apart", () => {
		const order = ["c17", "c3"];
		const trick = bysuit(order, rows, { index });
		expect(moveOf(trick, "c17")).toEqual({
			legs: [{ at: 170, ms: 400, to: { u: 0, v: 0, rotate: 0 } }],
		});
		expect(moveOf(trick, "c3").legs[0]?.at).toBe(30);
		expect(trick.order).toBe(order);
		expect(restOf(trick, 0).centre).toEqual({ u: 17 / 16, v: 0 });
	});
});

describe("poker", () => {
	const trick = poker(DECK, stack);

	test("deals the top five, the top first, 250 ms apart, face up as each lands", () => {
		expect([...trick.moves.keys()]).toEqual([
			"c51",
			"c50",
			"c49",
			"c48",
			"c47",
		]);
		expect(moveOf(trick, "c49")).toEqual({
			legs: [{ at: 500, ms: 250, to: { u: 0, v: 0, rotate: 0 } }],
			zAt: 500,
			sideAt: 750,
		});
		expect(trick.sides).toEqual(
			new Map(
				["c51", "c50", "c49", "c48", "c47"].map((id) => [id, "front"]),
			),
		);
		expect(trick.order).toBe(DECK);
	});
});

describe("flip", () => {
	const deck = DECK.slice(0, 4);

	test("turns every Card face down when more than half are up, else face up, at once", () => {
		const up = new Set(deck.slice(0, 3));
		const sideOf = (id: string) => (up.has(id) ? "front" : "back");
		const down = flip(deck, stack, { sideOf });
		expect(new Set(down.sides?.values())).toEqual(new Set(["back"]));
		expect(moveOf(down, "c2")).toEqual({ legs: [], sideAt: 0 });
		up.delete("c0");
		expect(new Set(flip(deck, stack, { sideOf }).sides?.values())).toEqual(
			new Set(["front"]),
		);
	});

	test("turns every Card to the side it names", () => {
		const trick = flip(deck, stack, { sideOf: () => "back", side: "back" });
		expect(trick.sides?.get("c0")).toBe("back");
	});
});

describe("turnDown, poker's first step", () => {
	test("turns every Card face down 7.5 ms a Card apart, moving none", () => {
		const trick = turnDown(DECK, stack);
		expect(moveOf(trick, "c4")).toEqual({ legs: [], sideAt: 30 });
		expect(trick.sides?.get("c51")).toBe("back");
	});
});
