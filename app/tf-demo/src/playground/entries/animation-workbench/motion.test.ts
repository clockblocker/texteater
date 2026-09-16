import { describe, expect, test } from "bun:test";

import { DEFAULT_PARAMS, layoutFor, moveLength, type Params } from "./motion";
import { VARIANTS } from "./variants";

const layout = layoutFor(4, 16);
const FRAME = 1000 / 60;

describe("tap", () => {
	const move = { from: 3, to: 1 };
	const params: Params = DEFAULT_PARAMS;
	const length = moveLength(move, params);
	const swap = VARIANTS.find((spec) => spec.key === "swap");
	if (!swap) throw new Error("swap missing");

	test("a frame is a pure function of t: stepping and seeking agree", () => {
		for (let t = 0; t <= length; t += FRAME) {
			expect(swap.variant(move, t, params, layout)).toEqual(
				swap.variant(move, t, params, layout),
			);
		}
	});

	test("the tapped Card pulses to 1.02 at 22 % and is back at rest by the end", () => {
		const at = (t: number) =>
			swap.variant(move, t, params, layout).cards[move.to]?.scale ??
			Number.NaN;
		expect(at(0)).toBeCloseTo(1, 6);
		expect(at(0.22 * length)).toBeCloseTo(1.02, 6);
		expect(at(length)).toBeCloseTo(1, 6);
		for (let t = 0; t <= length; t += FRAME) {
			expect(at(t)).toBeGreaterThanOrEqual(1);
			expect(at(t)).toBeLessThanOrEqual(1.02 + 1e-9);
		}
	});

	test("a parameter change redraws the same t without touching the clock", () => {
		const t = 60;
		const a = swap.variant(move, t, params, layout);
		const b = swap.variant(move, t, { ...params, accent: 0 }, layout);
		expect(a.cards[move.to]?.scale).toBeGreaterThan(1);
		expect(b.cards[move.to]?.scale).toBe(1);
	});

	test("a mid-flight retarget starts from the seed frame", () => {
		const seed = swap.variant(move, 40, params, layout);
		const next = { from: move.to, to: 3, seed };
		// The geometry carries over; z-order and header side are the new
		// move's at once.
		const first = swap.variant(next, 0, params, layout);
		first.cards.forEach((card, index) => {
			expect(card.y).toBeCloseTo(seed.cards[index]?.y ?? Number.NaN, 6);
			expect(card.scale).toBeCloseTo(
				seed.cards[index]?.scale ?? Number.NaN,
				6,
			);
		});
		const settled = swap.variant(
			next,
			moveLength(next, params),
			params,
			layout,
		);
		expect(settled).toEqual(
			swap.variant({ from: 1, to: 3 }, length, params, layout),
		);
	});
});
