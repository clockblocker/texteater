import { describe, expect, test } from "bun:test";
import { DECK_OF_CARDS_EASE } from "./ease";
import {
	done,
	settled,
	shareAt,
	sumAt,
	type Term,
	timeToShare,
	valueAt,
	velocityAt,
} from "./term";

const linear = DECK_OF_CARDS_EASE.linear;

function spring(delta: number, velocity = 0, delayMs = 0): Term {
	return {
		channel: "x",
		delta,
		curve: { kind: "spring", stiffness: 380, damping: 38, velocity },
		delayMs,
		bornAt: 1000,
		source: "app",
	};
}

function tween(
	delta: number,
	ms: number,
	extra: Partial<Extract<Term["curve"], { kind: "tween" }>> = {},
): Term {
	return {
		channel: "y",
		delta,
		curve: { kind: "tween", ms, ease: linear, ...extra },
		delayMs: 0,
		bornAt: 0,
		source: "app",
	};
}

describe("a spring Term", () => {
	test("starts at its delta and decays to nothing, as Motion's spring does", () => {
		const term = spring(100);
		expect(valueAt(term, 1000)).toBe(100);
		expect(valueAt(term, 1100)).toBeCloseTo(41.085, 2);
		expect(valueAt(term, 1600)).toBe(0);
		expect(done(term, 1600)).toBe(true);
	});

	test("starts with the velocity it is given, never one inferred", () => {
		const term = spring(100, -2000);
		expect(velocityAt(term, 1000)).toBeCloseTo(-2000, 6);
		expect(valueAt(term, 1016)).toBeLessThan(valueAt(spring(100), 1016));
	});

	test("holds its delta, still, until its delay", () => {
		const term = spring(50, 0, 200);
		expect(valueAt(term, 1150)).toBe(50);
		expect(velocityAt(term, 1150)).toBe(0);
		expect(done(term, 1150)).toBe(false);
	});
});

describe("a tween Term", () => {
	test("runs its delta to nothing over its length on its curve", () => {
		const term = tween(-40, 200);
		expect(valueAt(term, 0)).toBe(-40);
		expect(valueAt(term, 50)).toBeCloseTo(-30, 10);
		expect(valueAt(term, 200)).toBe(0);
		expect(velocityAt(term, 100)).toBeCloseTo(200, 6);
	});

	test("passes through its waypoints at their times, a curve per leg", () => {
		const curve = {
			kind: "tween" as const,
			ms: 100,
			ease: [linear, DECK_OF_CARDS_EASE.cubicInOut],
			keyframes: [1, -2, 0],
			times: [0, 0.4, 1],
		};
		expect(shareAt(curve, 0.2)).toBeCloseTo(-0.5, 10);
		expect(shareAt(curve, 0.4)).toBeCloseTo(-2, 10);
		expect(shareAt(curve, 0.7)).toBeCloseTo(-1, 10);
	});

	test("[1, 1] holds its delta for its length, then drops it", () => {
		const term = tween(3, 400, { keyframes: [1, 1] });
		expect(valueAt(term, 399)).toBe(3);
		expect(valueAt(term, 400)).toBe(0);
	});

	test("a step between equal times switches at once", () => {
		const curve = {
			kind: "tween" as const,
			ms: 200,
			ease: linear,
			keyframes: [1, 1, 0, 0],
			times: [0, 0.5, 0.5, 1],
		};
		expect(shareAt(curve, 0.49)).toBe(1);
		expect(shareAt(curve, 0.5)).toBe(0);
	});
});

describe("Terms together", () => {
	test("sum per channel and settle when every one has", () => {
		const terms = [spring(10), tween(5, 100), spring(4)];
		expect(sumAt(terms, "x", 1000)).toBe(14);
		expect(settled(terms, 1000)).toBe(false);
		expect(settled(terms, 3000)).toBe(true);
	});

	test("timeToShare finds when a move is most of the way there", () => {
		const term = tween(100, 200);
		expect(timeToShare(term, 0.5)).toBe(104);
	});
});
