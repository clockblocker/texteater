import { describe, expect, test } from "bun:test";
import { boxAt, snapLeft, snapPx } from "./box-glide";

const card = { u: 444, v: 372, w: 416, h: 352 };
const cover = { u: 292, v: 24, w: 720, h: 902 };

describe("snapPx", () => {
	test("rounds to whole CSS px at 1×, and to half px at 2×", () => {
		expect(snapPx(10.4, 1)).toBe(10);
		expect(snapPx(10.4, 2)).toBe(10.5);
		expect(snapPx(-3.3, 2)).toBe(-3.5);
	});
});

describe("snapLeft", () => {
	test("snaps what is left of a move, never back past where it started", () => {
		/* 34.7 px to go would round to 35, a step backwards: it holds instead */
		expect(snapLeft(34.6, 34.703, 1)).toBe(34.703);
		expect(snapLeft(34.4, 34.703, 1)).toBe(34);
		expect(snapLeft(-34.6, -34.703, 1)).toBe(-34.703);
	});

	test("leaves the far side free, so an overshoot still shows", () => {
		expect(snapLeft(-3.2, 100, 1)).toBe(-3);
		expect(snapLeft(3.2, -100, 1)).toBe(3);
	});
});

describe("boxAt", () => {
	test("is the plain mix of the two boxes, unsnapped", () => {
		expect(boxAt(card, cover, 0.5, null)).toEqual({
			u: 368,
			v: 198,
			w: 568,
			h: 627,
		});
	});

	test("starts and lands exactly on its two boxes, snapped", () => {
		expect(boxAt(card, cover, 0, 2)).toEqual(card);
		expect(boxAt(card, cover, 1, 2)).toEqual(cover);
	});

	test("keeps the destination's pixel phase on every frame it has left its start", () => {
		const to = { u: 292.25, v: 24.5, w: 719.5, h: 901.75 };
		for (let step = 0; step <= 100; step++) {
			const box = boxAt(card, to, step / 100, 2);
			for (const key of ["u", "v", "h"] as const) {
				if (box[key] === card[key]) continue;
				const off = (box[key] - to[key]) * 2;
				expect(Math.abs(off - Math.round(off))).toBeLessThan(1e-9);
			}
			/* the width moves by whole device px either side, so the centred column does too */
			if (box.w === card.w) continue;
			const half = ((box.w - to.w) / 2) * 2;
			expect(Math.abs(half - Math.round(half))).toBeLessThan(1e-9);
		}
	});

	test("never steps back past its start, starting off the grid", () => {
		const from = { u: 444.3, v: 371.7, w: 416.6, h: 352.2 };
		let last = boxAt(from, cover, 0, 1);
		for (let step = 1; step <= 100; step++) {
			const box = boxAt(from, cover, step / 100, 1);
			expect(box.u).toBeLessThanOrEqual(last.u);
			expect(box.v).toBeLessThanOrEqual(last.v);
			expect(box.w).toBeGreaterThanOrEqual(last.w);
			expect(box.h).toBeGreaterThanOrEqual(last.h);
			last = box;
		}
	});

	test("never passes either end, whatever the progress in between", () => {
		for (let step = 0; step <= 100; step++) {
			const box = boxAt(card, cover, step / 100, 1);
			expect(box.w).toBeGreaterThanOrEqual(card.w);
			expect(box.w).toBeLessThanOrEqual(cover.w);
			expect(box.v).toBeLessThanOrEqual(card.v);
			expect(box.v).toBeGreaterThanOrEqual(cover.v);
		}
	});
});
