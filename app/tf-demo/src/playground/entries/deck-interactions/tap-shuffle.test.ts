import { describe, expect, test } from "bun:test";
import { ease } from "./deck-of-cards-ease";
import type { Slot } from "./geometry";
import {
	keyframesOf,
	LEG_MS,
	pullOutOf,
	restOf,
	STAGGER_MS,
	tapShuffle,
} from "./tap-shuffle";

/** A pile of four: 48 px tails, the front one at the open scale. */
const SLOTS: Slot[] = [0, 1, 2, 3].map((index) => ({
	u: 100,
	v: 50 + index * 48,
	w: 416,
	h: 352,
	r: 0,
	s: index === 3 ? 1.05 : 1,
}));
const ORDER = ["a", "b", "c", "d"];

function slot(index: number): Slot {
	const found = SLOTS[index];
	if (!found) throw new Error(`No slot ${index}`);
	return found;
}

/** A stand-in for `Math.random` that hands out `draws` in turn. */
function drawing(...draws: number[]) {
	return () => draws.shift() ?? 0;
}

describe("the tapped Card's reach", () => {
	test("deck-of-cards' own reach is 20 to 60 px, the distance drawn before the side", () => {
		expect(pullOutOf("20–60 px", "random", 416, drawing(0, 0))).toBe(20);
		expect(pullOutOf("20–60 px", "random", 416, drawing(1, 1))).toBe(-60);
		expect(pullOutOf("20–60 px", "inline-end", 416, drawing(0.5))).toBe(40);
	});

	test("a share of the Card scales with its width, toward the side asked", () => {
		expect(pullOutOf("½ card", "inline-end", 416)).toBe(208);
		expect(pullOutOf("½ card", "inline-start", 416)).toBe(-208);
		expect(pullOutOf("⅓ card", "inline-end", 300)).toBe(100);
		expect(pullOutOf("⅔ card", "inline-end", 300)).toBe(200);
	});

	test("off doesn't shuffle", () => {
		expect(pullOutOf("off", "inline-end", 416)).toBeNull();
	});
});

describe("a tap's shuffle", () => {
	test("a tap on the front Card, or on none, shuffles nothing", () => {
		expect(
			tapShuffle({ order: ORDER, id: "d", slots: SLOTS, out: 208 }),
		).toBeNull();
		expect(
			tapShuffle({ order: ORDER, id: "x", slots: SLOTS, out: 208 }),
		).toBeNull();
	});

	test("the tapped Card goes to the front, the ones in front of it a slot down, the ones behind stay", () => {
		const plan = tapShuffle({
			order: ORDER,
			id: "b",
			slots: SLOTS,
			out: 208,
		});
		expect(plan?.order).toEqual(["a", "c", "d", "b"]);
		expect(plan?.moves.map((move) => [move.id, move.index])).toEqual([
			["b", 3],
			["c", 1],
			["d", 2],
		]);
	});

	test("the tapped Card slides out sideways at its own height, upright, then into the front slot, its stacking changing between", () => {
		const plan = tapShuffle({
			order: ORDER,
			id: "a",
			slots: SLOTS,
			out: 208,
		});
		const tapped = plan?.moves[0];
		if (!tapped) throw new Error("No move");
		expect(tapped.startMs).toBe(STAGGER_MS * 3);
		expect(tapped.ms).toBe(2 * LEG_MS);
		expect(tapped.zAtMs).toBe(LEG_MS);
		expect(tapped.legs.u).toEqual([
			{ at: 0, ms: 200, to: 308 },
			{ at: 200, ms: 200, to: 100 },
		]);
		expect(tapped.legs.v).toEqual([
			{ at: 0, ms: 200, to: 50 },
			{ at: 200, ms: 200, to: 194 },
		]);
		expect(tapped.legs.r.map((leg) => leg.to)).toEqual([0, 0]);
		expect(tapped.legs.s.map((leg) => leg.to)).toEqual([1, 1.05]);
		expect(tapped.legs.lift.map((leg) => leg.to)).toEqual([0, 0]);
		expect(restOf(tapped)).toEqual({ ...slot(3), lift: 0 });
	});

	test("the Cards between move on the second beat only, 2 ms × their new place apart, and restack as they start", () => {
		const plan = tapShuffle({
			order: ORDER,
			id: "a",
			slots: SLOTS,
			out: -208,
		});
		const between = plan?.moves.slice(1) ?? [];
		expect(between.map((move) => move.startMs)).toEqual([200, 202, 204]);
		/* reduced, every Card dissolves on the first beat */
		expect(plan?.moves.map((move) => move.reducedStartMs)).toEqual([
			6, 0, 2, 4,
		]);
		for (const [index, move] of between.entries()) {
			expect(move.index).toBe(index);
			expect(move.ms).toBe(LEG_MS);
			expect(move.zAtMs).toBe(0);
			expect(move.legs.v).toEqual([
				{ at: 0, ms: 200, to: slot(index).v },
			]);
			expect(restOf(move)).toEqual({ ...slot(index), lift: 0 });
		}
	});
});

describe("legs as one tween", () => {
	test("two legs back to back are one 400 ms tween through the waypoint", () => {
		const tween = keyframesOf(10, [
			{ at: 0, ms: 200, to: 50 },
			{ at: 200, ms: 200, to: 0 },
		]);
		expect(tween.keyframes).toEqual([10, 50, 0]);
		expect(tween.times).toEqual([0, 0.5, 1]);
		expect(tween.eases).toEqual([ease.cubicInOut, ease.cubicInOut]);
		expect(tween.ms).toBe(400);
	});

	test("a gap holds the value where it is", () => {
		const tween = keyframesOf(10, [{ at: 100, ms: 100, to: 30 }]);
		expect(tween.keyframes).toEqual([10, 10, 30]);
		expect(tween.times).toEqual([0, 0.5, 1]);
		expect(tween.eases).toEqual([ease.linear, ease.cubicInOut]);
	});

	test("no legs is no move", () => {
		expect(keyframesOf(7, [])).toMatchObject({ keyframes: [7, 7], ms: 0 });
	});
});
