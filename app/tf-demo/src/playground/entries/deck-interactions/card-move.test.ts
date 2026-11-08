import { describe, expect, test } from "bun:test";
import { keyframesOf } from "./card-move";
import { ease } from "./deck-of-cards-ease";

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
