import { describe, expect, test } from "bun:test";
import {
	boxUnder,
	contains,
	type Follow,
	followStep,
	grabOf,
	padRect,
	reducedHomeOf,
} from "./carry";

const BOX = { u: 100, v: 50, w: 400, h: 300, s: 1 };

describe("the carry", () => {
	test("the spot the hand lifted the Card by stays under the hand as it moves", () => {
		const hand = { u: 180, v: 70 };
		const grab = grabOf(hand, BOX);
		expect(boxUnder(hand, grab, BOX, 1)).toEqual({ u: 100, v: 50 });
		expect(boxUnder({ u: 480, v: 170 }, grab, BOX, 1)).toEqual({
			u: 400,
			v: 150,
		});
	});

	test("as the lift grows the Card, it grows about the hand, not its centre", () => {
		const hand = { u: 180, v: 70 };
		const grab = grabOf(hand, BOX);
		const s = 1.1;
		const at = boxUnder(hand, grab, BOX, s);
		/* the grabbed spot, drawn at the new scale about the new centre */
		const centre = { u: at.u + BOX.w / 2, v: at.v + BOX.h / 2 };
		expect(centre.u + grab.u * s).toBeCloseTo(hand.u, 9);
		expect(centre.v + grab.v * s).toBeCloseTo(hand.v, 9);
	});

	test("a grab read off a scaled Card is in its own px", () => {
		const scaled = { ...BOX, s: 2 };
		/* 40 px left of the centre on screen is 20 of the Card's own px */
		expect(grabOf({ u: 260, v: 200 }, scaled)).toEqual({ u: -20, v: 0 });
	});

	test("the stiff follow closes on the hand without passing it, at any frame length", () => {
		for (const ms of [4, 16, 50, 200]) {
			let at: Follow = { x: 0, velocity: 0 };
			let most = 0;
			for (let t = 0; t < 600; t += ms) {
				at = followStep(at, 100, 1200, ms);
				most = Math.max(most, at.x);
			}
			expect(most).toBeLessThanOrEqual(100);
			expect(at.x).toBeGreaterThan(99.9);
		}
	});

	test("the stiff follow is one spring however the frames fall", () => {
		const one = followStep({ x: 0, velocity: 500 }, 100, 1200, 32);
		const two = followStep(
			followStep({ x: 0, velocity: 500 }, 100, 1200, 16),
			100,
			1200,
			16,
		);
		expect(two.x).toBeCloseTo(one.x, 9);
		expect(two.velocity).toBeCloseTo(one.velocity, 9);
	});

	test("the pad is a strip down the frame's inline-end side, and holds the hand inside it", () => {
		const pad = padRect({ w: 1158, h: 950 });
		expect(pad.u + pad.w).toBe(1158 - 16);
		expect(pad.w).toBe(193);
		expect(pad.h).toBe(950 - 32);
		expect(padRect({ w: 600, h: 400 }).w).toBe(120);
		expect(padRect({ w: 3000, h: 400 }).w).toBe(220);
		expect(contains(pad, { u: pad.u + 1, v: 500 })).toBe(true);
		expect(contains(pad, { u: pad.u - 1, v: 500 })).toBe(false);
	});

	test("reduced, a release near home tweens and one further off dissolves", () => {
		expect(reducedHomeOf({ u: 0, v: 0 }, { u: 24, v: 0 })).toBe("tween");
		expect(reducedHomeOf({ u: 0, v: 0 }, { u: 18, v: 18 })).toBe(
			"dissolve",
		);
	});
});
