import { describe, expect, test } from "bun:test";
import { approachRate } from "./geometry";
import {
	COLLAPSE_CURVES,
	collapseOf,
	iconAt,
	progressOf,
	releaseVerdictOf,
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

describe("D's panel icon", () => {
	test("rides the middle of the strip as it grows, then stays put while the Card travels on", () => {
		expect(iconAt(0, THRESHOLD)).toEqual({ centre: 0, grown: 0 });
		expect(iconAt(-48, THRESHOLD)).toEqual({ centre: 24, grown: 0.5 });
		const whole = { centre: THRESHOLD / 2, grown: 1 };
		for (const uncovered of [THRESHOLD, THRESHOLD + 0.5, 180, -400])
			expect(iconAt(uncovered, THRESHOLD)).toEqual(whole);
	});

	test("never runs ahead of the Card, nor jumps where it stops", () => {
		let last = 0;
		for (let px = 0; px <= 200; px += 0.25) {
			const { centre } = iconAt(px, THRESHOLD);
			expect(centre).toBeGreaterThanOrEqual(last);
			expect(centre - last).toBeLessThanOrEqual(0.125 + 1e-12);
			expect(centre).toBeLessThanOrEqual(px);
			last = centre;
		}
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

describe("D's flick at release", () => {
	const ON = { on: true, ms: 200 } as const;
	const OFF = { on: false, ms: 200 } as const;

	test("short and slow, the Card comes back", () => {
		expect(releaseVerdictOf("inline", -60, -0.05, THRESHOLD, ON)).toEqual(
			verdictOf("inline", -60, THRESHOLD),
		);
	});

	test("short and fast the way it pulled, a release commits on the pull's zone", () => {
		expect(releaseVerdictOf("inline", -60, -0.6, THRESHOLD, ON)).toEqual({
			commits: true,
			zone: "dismiss",
			reason: "flick 180",
		});
		expect(releaseVerdictOf("block", -60, -0.6, THRESHOLD, ON)).toEqual({
			commits: true,
			zone: "expand",
			reason: "flick 180",
		});
	});

	test("fast but turned back, the hand carries it no further", () => {
		expect(releaseVerdictOf("inline", 60, -2, THRESHOLD, ON).commits).toBe(
			false,
		);
	});

	test("with the flick off, only the distance counts", () => {
		expect(releaseVerdictOf("inline", -60, -2, THRESHOLD, OFF)).toEqual(
			verdictOf("inline", -60, THRESHOLD),
		);
	});

	test("at the threshold a release commits as it showed, whatever the hand", () => {
		for (const flick of [ON, OFF])
			expect(
				releaseVerdictOf("inline", THRESHOLD, -3, THRESHOLD, flick),
			).toEqual(verdictOf("inline", THRESHOLD, THRESHOLD));
	});
});
