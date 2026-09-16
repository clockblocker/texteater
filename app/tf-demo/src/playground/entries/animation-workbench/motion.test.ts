import { describe, expect, test } from "bun:test";

import {
	DEFAULT_PARAMS,
	ease,
	layoutFor,
	moveLength,
	type Params,
	slotAtRest,
	spring,
} from "./motion";
import { VARIANTS } from "./variants";

const layout = layoutFor(4, 16);
const FRAME = 1000 / 60;

describe("easing", () => {
	test("every easing starts at 0 and settles at 1", () => {
		for (const easing of [
			"linear",
			"easeOut",
			"easeInOut",
			"spring",
		] as const) {
			const params: Params = { ...DEFAULT_PARAMS, easing };
			expect(ease(0, params)).toBeCloseTo(0, 6);
			expect(ease(1, params)).toBeCloseTo(1, 6);
		}
	});

	test("a spring is within 0.1% of rest by progress 1, at any bounce", () => {
		for (const bounce of [0, 0.15, 0.5, 0.9]) {
			expect(Math.abs(spring(0.999, bounce) - 1)).toBeLessThan(0.002);
		}
	});

	test("bounce overshoots, no bounce never does", () => {
		const overshoot = Math.max(
			...Array.from({ length: 200 }, (_, i) => spring(i / 200, 0.5)),
		);
		expect(overshoot).toBeGreaterThan(1);
		for (let i = 0; i <= 200; i += 1) {
			expect(spring(i / 200, 0)).toBeLessThanOrEqual(1 + 1e-9);
		}
	});
});

describe("variants", () => {
	const move = { from: 3, to: 1 };
	const params: Params = { ...DEFAULT_PARAMS, stagger: 30 };
	const length = moveLength(move, params, layout.count);

	test("a frame is a pure function of t: stepping and seeking agree", () => {
		for (const spec of VARIANTS) {
			for (let t = 0; t <= length; t += FRAME) {
				const seek = spec.variant(move, t, params, layout);
				const step = spec.variant(move, t, params, layout);
				expect(step).toEqual(seek);
			}
		}
	});

	test("the travelling variants start at rest(from) and end at rest(to)", () => {
		for (const spec of VARIANTS) {
			if (spec.key === "swap" || spec.key === "crossfade") continue;
			const first = spec.variant(move, 0, params, layout);
			const last = spec.variant(move, length, params, layout);
			first.cards.forEach((card, index) => {
				const slot = slotAtRest(index, move.from, layout);
				expect(card.y).toBeCloseTo(slot.y, 6);
				expect(card.height).toBeCloseTo(slot.height, 6);
			});
			last.cards.forEach((card, index) => {
				const slot = slotAtRest(index, move.to, layout);
				expect(card.y).toBeCloseTo(slot.y, 6);
				expect(card.height).toBeCloseTo(slot.height, 6);
			});
		}
	});

	test("a parameter change redraws the same t without touching the clock", () => {
		const slide = VARIANTS.find((spec) => spec.key === "slide");
		if (!slide) throw new Error("slide missing");
		const t = 120;
		const a = slide.variant(move, t, params, layout);
		const b = slide.variant(
			move,
			t,
			{ ...params, easing: "linear" },
			layout,
		);
		expect(a.cards[2]?.y).not.toBeCloseTo(b.cards[2]?.y ?? Number.NaN, 3);
	});

	test("a mid-flight retarget starts from the seed frame", () => {
		const slide = VARIANTS.find((spec) => spec.key === "slide");
		if (!slide) throw new Error("slide missing");
		const seed = slide.variant(move, 90, params, layout);
		const next = { from: move.to, to: 3, seed };
		const first = slide.variant(next, 0, params, layout);
		expect(first).toEqual(seed);
		const settled = slide.variant(
			next,
			moveLength(next, params, layout.count),
			params,
			layout,
		);
		settled.cards.forEach((card, index) => {
			expect(card.y).toBeCloseTo(slotAtRest(index, 3, layout).y, 6);
		});
	});
});
