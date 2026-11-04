import { describe, expect, test } from "bun:test";
import { approachRate } from "./geometry";
import {
	COLLAPSE_CURVES,
	collapseOf,
	progressOf,
	rubberBand,
	takeUp,
	travelOf,
	verdictOf,
	zoneOf,
} from "./swipe-gesture";

const THRESHOLD = 96;

describe("D's directions", () => {
	test("inline-start and down close the Deck; inline-end and up open the Card", () => {
		expect(zoneOf("inline", -10)).toBe("dismiss");
		expect(zoneOf("inline", 10)).toBe("expand");
		expect(zoneOf("block", 10)).toBe("dismiss");
		expect(zoneOf("block", -10)).toBe("expand");
	});
});

describe("D's one breakpoint", () => {
	test("1 px short: the Deck is not whole, nothing says it will commit, and a release cancels", () => {
		const pull = -(THRESHOLD - 1);
		expect(progressOf(pull, THRESHOLD)).toBeLessThan(1);
		for (const curve of COLLAPSE_CURVES)
			expect(collapseOf("inline", pull, THRESHOLD, curve)).toBeLessThan(
				1,
			);
		expect(verdictOf("inline", pull, THRESHOLD)).toEqual({
			commits: false,
			zone: "dismiss",
			reason: "short 95",
		});
	});

	test("at the threshold: the Deck is whole and a release commits", () => {
		const pull = -THRESHOLD;
		expect(progressOf(pull, THRESHOLD)).toBe(1);
		for (const curve of COLLAPSE_CURVES)
			expect(collapseOf("inline", pull, THRESHOLD, curve)).toBe(1);
		expect(verdictOf("inline", pull, THRESHOLD)).toEqual({
			commits: true,
			zone: "dismiss",
			reason: "threshold 96",
		});
	});

	test("moving the threshold moves both together", () => {
		expect(collapseOf("inline", -120, 140, "linear")).toBeLessThan(1);
		expect(verdictOf("inline", -120, 140).commits).toBe(false);
		expect(collapseOf("inline", -140, 140, "linear")).toBe(1);
		expect(verdictOf("inline", -140, 140).commits).toBe(true);
	});

	test("Open commits at the same threshold and folds nothing", () => {
		expect(verdictOf("inline", THRESHOLD - 1, THRESHOLD).commits).toBe(
			false,
		);
		expect(verdictOf("block", -THRESHOLD, THRESHOLD)).toMatchObject({
			commits: true,
			zone: "expand",
		});
		expect(collapseOf("block", -THRESHOLD, THRESHOLD, "linear")).toBe(0);
	});
});

describe("D's Deck collapse", () => {
	test("is the pull's share of the threshold, and only toward Close deck", () => {
		expect(collapseOf("inline", 0, THRESHOLD, "linear")).toBe(0);
		expect(collapseOf("inline", -48, THRESHOLD, "linear")).toBe(0.5);
		expect(collapseOf("block", 48, THRESHOLD, "linear")).toBe(0.5);
		expect(collapseOf("inline", -300, THRESHOLD, "linear")).toBe(1);
		expect(collapseOf("inline", 48, THRESHOLD, "linear")).toBe(0);
	});

	test("no curve ever runs ahead of the pull", () => {
		for (const curve of COLLAPSE_CURVES)
			for (let px = 0; px <= THRESHOLD; px += 4)
				expect(
					collapseOf("inline", -px, THRESHOLD, curve),
				).toBeLessThanOrEqual(px / THRESHOLD + 1e-12);
	});
});

describe("D's travel", () => {
	test("the Card tracks the hand 1:1, then rubber-bands past its end", () => {
		expect(travelOf(300, 400, 48)).toBe(300);
		expect(travelOf(400, 400, 48)).toBe(400);
		const past = travelOf(480, 400, 48) - 400;
		expect(past).toBeGreaterThan(0);
		expect(past).toBeLessThan(80);
		expect(travelOf(5000, 400, 48) - 400).toBeLessThan(48);
		expect(rubberBand(0, 48)).toBe(0);
		expect(rubberBand(100, 0)).toBe(0);
	});

	test("the Card stays put through the axis-lock slop, then catches the hand up without a jump", () => {
		expect(takeUp(8, 10, 24)).toBe(0);
		expect(takeUp(10, 10, 24)).toBe(0);
		expect(takeUp(10.5, 10, 24)).toBeCloseTo(10.5 - 10 * (1 - 0.5 / 24));
		expect(takeUp(-34, 10, 24)).toBe(-34);
		expect(takeUp(60, 10, 24)).toBe(60);
	});

	test("a Card caught moving owes no slop", () => {
		expect(takeUp(3, 0, 24)).toBe(3);
		expect(takeUp(-3, 0, 24)).toBe(-3);
	});
});

describe("D's Open, in a straight line", () => {
	const release = { u: 500, v: 300 };
	const cover = { u: 200, v: 24 };

	test("a swipe toward inline-end, away from the Cover, carries nothing on", () => {
		expect(approachRate(release, cover, { u: 2500, v: 0 })).toBe(0);
	});

	test("of a swipe up only the part toward the Cover carries on, as a share of the way per second", () => {
		const rate = approachRate(release, cover, { u: 0, v: -2000 });
		const way = { u: cover.u - release.u, v: cover.v - release.v };
		const along = (-2000 * way.v) / Math.hypot(way.u, way.v);
		expect(rate).toBeGreaterThan(0);
		expect(rate * Math.hypot(way.u, way.v)).toBeCloseTo(along, 6);
	});

	test("a Card already there has no way to go", () => {
		expect(approachRate(cover, cover, { u: 0, v: -2000 })).toBe(0);
	});
});
