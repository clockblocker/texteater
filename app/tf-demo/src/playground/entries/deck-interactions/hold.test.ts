import { describe, expect, test } from "bun:test";
import {
	buildPoseOf,
	buildShareOf,
	holdStateOf,
	liftedPose,
	type PoseRules,
	RISE_SHARE,
	SINK_DEPTH,
} from "./hold";

const HOLD = { ms: 500, slop: 10 };

const RULES: PoseRules = {
	rest: 1,
	lifted: 1.092,
	pressLift: 0.3,
	reduce: false,
};

describe("the hold", () => {
	test("a press held within the stillness for the hold's length lifts, and a moment short of it still holds", () => {
		expect(holdStateOf({ elapsed: 499, travel: 0, ...HOLD })).toBe(
			"holding",
		);
		expect(holdStateOf({ elapsed: 500, travel: 10, ...HOLD })).toBe(
			"lifts",
		);
	});

	test("a hand that drifts past the stillness is no hold, however long it has been down", () => {
		expect(holdStateOf({ elapsed: 40, travel: 10.5, ...HOLD })).toBe(
			"moved",
		);
		expect(holdStateOf({ elapsed: 900, travel: 11, ...HOLD })).toBe(
			"moved",
		);
	});

	test("the build waits out its delay, then runs evenly to the lift", () => {
		expect(buildShareOf(0, 500, 150)).toBe(0);
		expect(buildShareOf(150, 500, 150)).toBe(0);
		expect(buildShareOf(325, 500, 150)).toBeCloseTo(0.5, 6);
		expect(buildShareOf(500, 500, 150)).toBe(1);
		expect(buildShareOf(800, 500, 150)).toBe(1);
	});

	test("a delay as long as the hold builds nothing before the lift", () => {
		expect(buildShareOf(499, 500, 500)).toBe(0);
		expect(buildShareOf(500, 500, 600)).toBe(1);
	});
});

describe("the hold's feedback", () => {
	test("rising, the Card goes part of the way to its lifted pose and leaves the rest to the lift's pop", () => {
		expect(buildPoseOf(0, "rise", RULES)).toEqual({ lift: 0.3, s: 1 });
		const built = buildPoseOf(1, "rise", RULES);
		expect(built.lift).toBeCloseTo(0.3 + 0.7 * RISE_SHARE, 6);
		expect(built.s).toBeCloseTo(1 + 0.092 * RISE_SHARE, 6);
		expect(liftedPose(RULES)).toEqual({ lift: 1, s: 1.092 });
	});

	test("sinking, the Card presses in and keeps the press's shadow", () => {
		expect(buildPoseOf(1, "sink", RULES)).toEqual({
			lift: 0.3,
			s: 1 - SINK_DEPTH,
		});
	});

	test("with no build, the Card holds the press's pose", () => {
		expect(buildPoseOf(0.7, "none", RULES)).toEqual({ lift: 0.3, s: 1 });
	});

	test("reduced, nothing grows or shrinks: only the shadow rises, and the lift keeps the Card's size", () => {
		const reduce = { ...RULES, reduce: true };
		expect(buildPoseOf(1, "rise", reduce).s).toBe(1);
		expect(buildPoseOf(1, "rise", reduce).lift).toBeGreaterThan(0.3);
		expect(buildPoseOf(1, "sink", reduce)).toEqual({ lift: 0.3, s: 1 });
		expect(liftedPose(reduce)).toEqual({ lift: 1, s: 1 });
	});
});
