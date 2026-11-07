import { describe, expect, test } from "bun:test";
import { DECK_OF_CARDS_EASE } from "./ease";
import type { Posed } from "./place";
import { fan, pile } from "./poses";
import {
	deal,
	fanOut,
	shuffle,
	sort,
	type Trick,
	type TrickLeg,
	type TrickMove,
	trickMove,
} from "./tricks";

/* every number below is deck-of-cards' own, from upstream's `lib/modules/*.js`;
   the library's px are rem × 16 at its 16 px root */

const CARD = { w: 62 / 16, h: 88 / 16 };
const DECK = Array.from({ length: 52 }, (_, i) => `c${i}`);
const stack = (order: readonly string[]) => pile(order, "felt", { card: CARD });
const fanned = (order: readonly string[]) => fan(order, "felt", { card: CARD });

function moveOf(trick: Trick, index: number): TrickMove {
	const id = trick.order[index] as string;
	return trick.moves.get(id) as TrickMove;
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

describe("deal, the library's intro", () => {
	const trick = deal(DECK, stack);

	test("drops each Card from 250 px above its rest, unseen", () => {
		expect(moveOf(trick, 8).from).toEqual({
			u: 0,
			v: -250 / 16,
			w: 0,
			h: 0,
			rotate: 0,
			opacity: -1,
		});
	});

	test("for 1000 ms after 500 + 10i, fading in on the linear time", () => {
		const move = moveOf(trick, 8);
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
		expect(move.sideAt).toBeUndefined();
	});

	test("turns it face down 250 ms after it lands when asked", () => {
		expect(moveOf(deal(DECK, stack, { faceDown: true }), 8).sideAt).toBe(
			1830,
		);
	});
});

describe("fanOut", () => {
	const trick = fanOut(DECK, fanned);

	test("gathers onto the stack for 300 ms, then spreads for 300 from −130° to 130°", () => {
		const last = moveOf(trick, 51);
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
		expect(last.zAt).toBe(810);
	});

	test("rests on radius 55 around the centre", () => {
		const radians = ((130 - 90) * Math.PI) / 180;
		expect(restOf(trick, 51).centre.u * 16).toBeCloseTo(
			Math.cos(radians) * 55,
			10,
		);
		expect(restOf(trick, 51).centre.v * 16).toBeCloseTo(
			Math.sin(radians) * 55,
			10,
		);
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

	test("slides each Card 20–60 px out in 200 ms, 2 ms apart, and back", () => {
		/* card 1: distance 0.5 × 40 + 20 = 40, round(0.7) = 1 → left */
		const trick = shuffle(deck, stack, {
			random: replay([0.9, 0.1, 0, 0, 0.5, 0.7]),
		});
		const move = moveOf(trick, 1);
		expect(move.legs[0]).toEqual({
			at: 2,
			ms: 200,
			to: { u: -40 / 16, v: 0, rotate: -0 },
		});
		expect(move.legs[1]).toMatchObject({ at: 202, ms: 200 });
		expect(move.zAt).toBe(202);
		/* card 0: distance 20, round(0) = 0 → right */
		expect(moveOf(trick, 0).legs[0]?.to.u).toBe(20 / 16);
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
		const move = moveOf(trick, 3);
		const lift = absolute(trick, 3, move.legs[0] as TrickLeg);
		expect(lift.y).toBeCloseTo(-150, 10);
		expect(lift.x).toBeCloseTo(-0.75, 10);
		expect(move.legs[0]).toMatchObject({ at: 30, ms: 400 });
		expect(move.legs[1]).toMatchObject({ at: 530, ms: 400 });
		expect(move.zAt).toBe(430);
	});
});

describe("trickMove", () => {
	test("turns rem into px and mirrors the inline axis and rotation in RTL", () => {
		const move = trickMove(
			{
				from: { u: 1, opacity: -1 },
				legs: [{ at: 10, ms: 300, to: { u: 2, v: -1, rotate: 30 } }],
				zAt: 310,
			},
			{ remPx: 16, dir: -1 },
		);
		if (!("tween" in move)) throw new Error("a trick plays on a tween");
		expect(move.path?.x).toEqual([{ at: 10, ms: 300, to: -32 }]);
		expect(move.path?.y).toEqual([{ at: 10, ms: 300, to: -16 }]);
		expect(move.path?.rotate).toEqual([{ at: 10, ms: 300, to: -30 }]);
		expect(move.from).toEqual({ x: -16, opacity: -1 });
		expect(move.zAt).toBe(310);
	});
});
