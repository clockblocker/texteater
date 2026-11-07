import { describe, expect, test } from "bun:test";
import {
	DEFAULT_TILT,
	FLAT,
	followLean,
	glareAt,
	isFlat,
	leanDone,
	leanToward,
	leanValue,
	pointerOn,
	shownLean,
} from "./tilt";

const BOX = { x: 100, y: 100, width: 200, height: 100, rotate: 0, scale: 1 };

describe("pointerOn", () => {
	test("reads the pointer from the Body's centre to its edges", () => {
		expect(pointerOn(BOX, { x: 200, y: 150 }, 1)).toEqual({ u: 0, v: 0 });
		expect(pointerOn(BOX, { x: 300, y: 100 }, 1)).toEqual({ u: 1, v: -1 });
		expect(pointerOn(BOX, { x: 150, y: 175 }, 1)).toEqual({
			u: -0.5,
			v: 0.5,
		});
	});

	test("clamps a pointer past an edge to it", () => {
		expect(pointerOn(BOX, { x: 900, y: 150 }, 1).u).toBe(1);
	});

	test("reads inline logically, so RTL mirrors it", () => {
		expect(pointerOn(BOX, { x: 300, y: 150 }, -1).u).toBe(-1);
	});

	test("reads in the Body's own turned frame", () => {
		/* turned a quarter clockwise, its inline-end edge faces down */
		const at = pointerOn({ ...BOX, rotate: 90 }, { x: 200, y: 200 }, 1);
		expect(at.u).toBeCloseTo(0.5);
		expect(at.v).toBeCloseTo(0);
	});
});

describe("leanToward", () => {
	test("brings the edge under the pointer up by the angle at most", () => {
		expect(leanToward({ u: 1, v: -0.5 }, DEFAULT_TILT)).toEqual({
			tiltX: -5,
			tiltY: 10,
			tiltLift: DEFAULT_TILT.lift,
			glare: 1,
		});
	});
});

describe("glareAt", () => {
	test("sits under the edge that came up, and mirrors in RTL", () => {
		const lean = { ...FLAT, tiltX: 10, tiltY: 5 };
		expect(glareAt(lean, DEFAULT_TILT, 1)).toEqual({ x: 75, y: 100 });
		expect(glareAt(lean, DEFAULT_TILT, -1)).toEqual({ x: 25, y: 100 });
		expect(glareAt(FLAT, { ...DEFAULT_TILT, maxDeg: 0 }, 1)).toEqual({
			x: 50,
			y: 50,
		});
	});
});

describe("followLean", () => {
	const spring = DEFAULT_TILT.spring;
	const lit = { tiltX: 0, tiltY: 8, tiltLift: 0.02, glare: 1 };

	test("starts from flat and arrives at the target", () => {
		const terms = followLean([], FLAT, lit, spring, 0);
		expect(shownLean(lit, terms, 0)).toEqual(FLAT);
		expect(terms.every((term) => leanDone(term, 3000))).toBe(true);
		expect(shownLean(lit, terms, 3000)).toEqual(lit);
	});

	test("keeps the lean and its speed continuous as the target moves", () => {
		const first = followLean([], FLAT, lit, spring, 0);
		const next = { ...lit, tiltY: -4 };
		const second = followLean(first, lit, next, spring, 80);
		const before = shownLean(lit, first, 80);
		expect(shownLean(next, second, 80).tiltY).toBeCloseTo(before.tiltY);
		const speed = (terms: typeof first) =>
			terms
				.filter((term) => term.channel === "tiltY")
				.reduce(
					(sum, term) =>
						sum +
						(leanValue(term, 80.05) - leanValue(term, 80)) * 20_000,
					0,
				);
		expect(speed(second)).toBeCloseTo(speed(first), 0);
	});

	test("folds a channel into one Term, and leaves the others be", () => {
		const first = followLean([], FLAT, lit, spring, 0);
		const second = followLean(first, lit, { ...lit, tiltY: 2 }, spring, 40);
		expect(second.filter((term) => term.channel === "tiltY")).toHaveLength(
			1,
		);
		const glare = (terms: typeof first) =>
			terms.find((term) => term.channel === "glare");
		const kept = glare(second);
		if (!kept) throw new Error("no glare Term");
		expect(kept).toBe(glare(first) as typeof kept);
		expect(leanValue(kept, 40)).toBeLessThan(0);
	});

	test("adds nothing for a target that didn't move", () => {
		expect(followLean([], FLAT, FLAT, spring, 0)).toEqual([]);
		expect(isFlat(FLAT)).toBe(true);
	});
});
