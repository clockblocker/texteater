import { describe, expect, test } from "bun:test";
import { ease } from "../deck-interactions/deck-of-cards-ease";
import { PLAYING_DECK, type PlayingCard } from "./playing-cards";
import {
	bysuit,
	type CardPlan,
	fan,
	flip,
	intro,
	poker,
	shuffle,
	sort,
	stackOffset,
	turnDown,
} from "./tricks";

/* every number below is deck-of-cards' own, from upstream's `lib/modules/*.js` */

const FS = 16;

function planOf(plans: readonly CardPlan[], index: number): CardPlan {
	const plan = plans[index];
	if (!plan) throw new Error(`no plan ${index.toString()}`);
	return plan;
}

/** A `Math.random` that replays `values`, then 0.5. */
function replay(values: readonly number[]): () => number {
	let next = 0;
	return () => values[next++] ?? 0.5;
}

describe("the stack", () => {
	test("Card i rests a quarter px per Card up and to the left", () => {
		expect(stackOffset(0)).toBe(-0);
		expect(stackOffset(4)).toBe(-1);
		expect(stackOffset(51)).toBe(-12.75);
	});
});

describe("intro", () => {
	const { plans } = intro(PLAYING_DECK);

	test("starts each Card 250 px up, unseen, face up", () => {
		const plan = planOf(plans, 8);
		expect(plan.from).toEqual({ x: -2, y: -252, rot: 0, o: 0 });
		expect(plan.side?.[0]).toEqual({ at: 0, to: "front" });
	});

	test("drops it for 1000 ms after 500 + 10i, fading with the linear time", () => {
		const plan = planOf(plans, 8);
		expect(plan.moves?.y).toEqual([{ at: 580, ms: 1000, to: -2 }]);
		expect(plan.moves?.x).toEqual([{ at: 580, ms: 1000, to: -2 }]);
		expect(plan.moves?.o).toEqual([
			{ at: 580, ms: 1000, to: 1, ease: ease.linear },
		]);
		expect(plan.z).toEqual([{ at: 580, to: 8 }]);
	});

	test("turns it face down 250 ms after it lands", () => {
		expect(planOf(plans, 8).side?.[1]).toEqual({ at: 1830, to: "back" });
	});
});

describe("sort", () => {
	test("puts the highest i at the bottom, or with reverse the lowest", () => {
		expect(sort(PLAYING_DECK).order[0]?.i).toBe(51);
		expect(sort(PLAYING_DECK, true).order[0]?.i).toBe(0);
	});

	test("lifts to y −150 in 400 ms, restacks, and comes down at 500 ms", () => {
		const plan = planOf(sort(PLAYING_DECK).plans, 3);
		expect(plan.moves?.y).toEqual([
			{ at: 30, ms: 400, to: -150 },
			{ at: 530, ms: 400, to: -0.75 },
		]);
		expect(plan.moves?.x).toEqual([
			{ at: 30, ms: 400, to: -0.75 },
			{ at: 530, ms: 400, to: -0.75 },
		]);
		expect(plan.moves?.rot).toEqual([
			{ at: 30, ms: 400, to: 0 },
			{ at: 530, ms: 400, to: 0 },
		]);
		expect(plan.z).toEqual([{ at: 430, to: 3 }]);
	});
});

describe("shuffle", () => {
	const deck = PLAYING_DECK.slice(0, 3);

	test("reorders as Fisher–Yates does with the same draws", () => {
		/* i = 2 swaps with floor(0.9 × 3) = 2, i = 1 with floor(0.1 × 2) = 0 */
		const { order } = shuffle(deck, FS, replay([0.9, 0.1]));
		expect(order.map((card) => card.i)).toEqual([1, 0, 2]);
	});

	test("slides each Card 20–60 px out in 200 ms, 2 ms apart, and back", () => {
		/* card 1: distance 0.5 × 40 + 20 = 40, round(0.7) = 1 → left */
		const { plans } = shuffle(deck, FS, replay([0.9, 0.1, 0, 0, 0.5, 0.7]));
		const plan = planOf(plans, 1);
		expect(plan.moves?.x).toEqual([
			{ at: 2, ms: 200, to: -40 },
			{ at: 202, ms: 200, to: -0.25 },
		]);
		expect(plan.moves?.y).toEqual([
			{ at: 2, ms: 200, to: -0.25 },
			{ at: 202, ms: 200, to: -0.25 },
		]);
		expect(plan.z).toEqual([{ at: 202, to: 1 }]);
		/* card 0: distance 20, round(0) = 0 → right */
		expect(planOf(plans, 0).moves?.x?.[0]?.to).toBe(20);
	});

	test("scales the slide by the font size over 16", () => {
		const { plans } = shuffle(deck, 32, replay([0.9, 0.1, 0, 0]));
		expect(planOf(plans, 0).moves?.x?.[0]?.to).toBe(40);
	});
});

describe("bysuit", () => {
	test("lays a grid by rank and suit over 400 ms, delayed 10 ms × i", () => {
		const card = PLAYING_DECK[13 + 4] as PlayingCard; // 5 of hearts
		const { plans } = bysuit([card], FS);
		expect(planOf(plans, 0).moves).toEqual({
			x: [{ at: 170, ms: 400, to: -Math.round((6.75 - 5) * 8) }],
			y: [{ at: 170, ms: 400, to: -Math.round((1.5 - 1) * 92) }],
			rot: [{ at: 170, ms: 400, to: 0 }],
		});
	});
});

describe("fan", () => {
	const { plans } = fan(PLAYING_DECK, FS);

	test("gathers for 300 ms, then spreads for 300 ms from −130° to 130°", () => {
		const first = planOf(plans, 0);
		const last = planOf(plans, 51);
		expect(first.moves?.rot).toEqual([
			{ at: 0, ms: 300, to: 0 },
			{ at: 300, ms: 300, to: -130 },
		]);
		expect(last.moves?.rot?.[1]).toEqual({ at: 810, ms: 300, to: 130 });
		expect(last.moves?.x?.[0]).toEqual({ at: 510, ms: 300, to: -12.75 });
	});

	test("spreads on radius 55 around the centre, z set as it spreads", () => {
		const last = planOf(plans, 51);
		const radians = ((130 - 90) * Math.PI) / 180;
		expect(last.moves?.x?.[1]?.to).toBeCloseTo(Math.cos(radians) * 55, 10);
		expect(last.moves?.y?.[1]?.to).toBeCloseTo(Math.sin(radians) * 55, 10);
		expect(last.z).toEqual([{ at: 810, to: 51 }]);
	});
});

describe("poker", () => {
	const { plans } = poker(PLAYING_DECK, FS);

	test("deals the top five, the top first, 250 ms apart", () => {
		expect(plans.map((plan) => plan.id)).toEqual(
			[51, 50, 49, 48, 47].map(
				(i) => (PLAYING_DECK[i] as PlayingCard).id,
			),
		);
		const third = planOf(plans, 2);
		expect(third.moves).toEqual({
			x: [{ at: 500, ms: 250, to: Math.round(-0.05 * 70) }],
			y: [{ at: 500, ms: 250, to: -110 }],
			rot: [{ at: 500, ms: 250, to: 0 }],
		});
		expect(third.z).toEqual([{ at: 500, to: 53 }]);
		expect(third.side).toEqual([{ at: 750, to: "front" }]);
	});
});

describe("flip", () => {
	test("turns all face down when more than half are up, else face up", () => {
		const deck = PLAYING_DECK.slice(0, 4);
		const up = new Set(deck.slice(0, 3).map((card) => card.id));
		const sideOf = (id: string) => (up.has(id) ? "front" : "back");
		expect(flip(deck, sideOf).plans[0]?.side).toEqual([
			{ at: 0, to: "back" },
		]);
		up.delete(deck[0]?.id ?? "");
		expect(flip(deck, sideOf).plans[0]?.side).toEqual([
			{ at: 0, to: "front" },
		]);
	});

	test("poker's turn-down staggers 7.5 ms per Card", () => {
		expect(planOf(turnDown(PLAYING_DECK).plans, 4).side).toEqual([
			{ at: 30, to: "back" },
		]);
	});
});
