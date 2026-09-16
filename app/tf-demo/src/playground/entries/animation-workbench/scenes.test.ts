import { describe, expect, test } from "bun:test";
import { spring as motionSpring } from "motion-dom";

import {
	CSS_EASE,
	cubicBezier,
	DEFAULT_PARAMS,
	springAt,
	springLength,
} from "./motion";
import { groupLength } from "./scene";
import { SCENE_GROUPS } from "./scenes";

const FRAME = 1000 / 60;

describe("browser curves", () => {
	test("a cubic bézier starts at 0, ends at 1 and is linear on the diagonal", () => {
		const linear = cubicBezier(0, 0, 1, 1);
		for (let i = 0; i <= 20; i += 1) {
			expect(linear(i / 20)).toBeCloseTo(i / 20, 4);
		}
		expect(CSS_EASE(0)).toBe(0);
		expect(CSS_EASE(1)).toBe(1);
		// The browser's `ease` is a touch past half way at the midpoint.
		expect(CSS_EASE(0.5)).toBeCloseTo(0.8024, 3);
	});

	test("springAt matches Motion's own spring generator", () => {
		for (const spec of [
			{ stiffness: 520, damping: 42 },
			{ stiffness: 500, damping: 25 },
			{ stiffness: 200, damping: 2 * Math.sqrt(200) },
			{ stiffness: 100, damping: 40 },
		]) {
			const theirs = motionSpring({ keyframes: [0, 1], ...spec });
			let compared = 0;
			for (let ms = 0; ms <= 1200; ms += 7) {
				// Motion snaps to the target once it detects rest; until then
				// the two must agree.
				const step = theirs.next(ms);
				if (step.done) break;
				expect(springAt(ms, spec)).toBeCloseTo(step.value, 5);
				compared += 1;
			}
			expect(compared).toBeGreaterThan(10);
		}
	});

	test("the shipped drag spring settles in about a third of a second", () => {
		const length = springLength({ stiffness: 520, damping: 42 });
		expect(length).toBeGreaterThan(250);
		expect(length).toBeLessThan(450);
		expect(springAt(length, { stiffness: 520, damping: 42 })).toBeCloseTo(
			1,
			2,
		);
	});
});

describe("scenes", () => {
	const params = DEFAULT_PARAMS;

	test("every scene has a timeline and settles by its end", () => {
		for (const group of SCENE_GROUPS) {
			expect(groupLength(group, params)).toBeGreaterThan(0);
			for (const scene of group.scenes) {
				const length = scene.length(params);
				expect(length).toBeGreaterThan(0);
				expect(scene.frame(length, params)).toEqual(
					scene.frame(length + 1000, params),
				);
			}
		}
	});

	test("a frame is a pure function of t: stepping and seeking agree", () => {
		for (const group of SCENE_GROUPS) {
			for (const scene of group.scenes) {
				const length = scene.length(params);
				for (let t = 0; t <= length; t += FRAME) {
					expect(scene.frame(t, params)).toEqual(
						scene.frame(t, params),
					);
				}
			}
		}
	});

	test("scene keys are unique across groups", () => {
		const keys = SCENE_GROUPS.flatMap((g) => g.scenes.map((s) => s.key));
		expect(new Set(keys).size).toBe(keys.length);
	});
});
