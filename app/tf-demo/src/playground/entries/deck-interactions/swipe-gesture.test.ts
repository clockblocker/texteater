import { describe, expect, test } from "bun:test";
import {
	armedAt,
	collapseOf,
	type DetentRules,
	rubberBand,
	shownAt,
	takeUp,
	verdictOf,
	zoneOf,
} from "./swipe-gesture";

const rules: DetentRules = {
	detent: 96,
	hysteresis: 12,
	resistance: 0.4,
	band: 20,
	end: 400,
	rubberLimit: 48,
};

describe("D's directions", () => {
	test("inline-start and down close the Deck; inline-end and up open the Card", () => {
		expect(zoneOf("inline", -10)).toBe("dismiss");
		expect(zoneOf("inline", 10)).toBe("expand");
		expect(zoneOf("block", 10)).toBe("dismiss");
		expect(zoneOf("block", -10)).toBe("expand");
	});
});

describe("D's detent", () => {
	test("arms at the detent and disarms only past the hysteresis", () => {
		expect(armedAt(95, false, rules)).toBe(false);
		expect(armedAt(96, false, rules)).toBe(true);
		expect(armedAt(85, true, rules)).toBe(true);
		expect(armedAt(83, true, rules)).toBe(false);
	});

	test("the Card tracks 1:1, lags in the band, and is under the hand again once armed", () => {
		expect(shownAt(50, false, rules)).toBe(50);
		expect(shownAt(76, false, rules)).toBe(76);
		expect(shownAt(95, false, rules)).toBeCloseTo(76 + 19 * 0.6);
		expect(shownAt(96, true, rules)).toBe(96);
		/* so crossing the detent snaps the Card forward by the lag */
		expect(
			shownAt(96, true, rules) - shownAt(96, false, rules),
		).toBeCloseTo(20 * 0.4);
	});

	test("past its end the Card rubber-bands and never passes the limit", () => {
		expect(shownAt(400, true, rules)).toBe(400);
		const past = shownAt(480, true, rules) - 400;
		expect(past).toBeGreaterThan(0);
		expect(past).toBeLessThan(80);
		expect(shownAt(5000, true, rules) - 400).toBeLessThan(48);
		expect(rubberBand(0, 48)).toBe(0);
		expect(rubberBand(100, 0)).toBe(0);
	});

	test("without resistance the Card never lags", () => {
		const free = { ...rules, resistance: 0 };
		expect(shownAt(90, false, free)).toBe(90);
		expect(shownAt(96, true, free)).toBe(96);
	});
});

describe("D's release", () => {
	const base = {
		axis: "inline" as const,
		pull: -120,
		speed: 0,
		armed: true,
		flickSpeed: 0.5,
	};

	test("past the detent commits the action the panel shows", () => {
		expect(verdictOf(base)).toEqual({
			commits: true,
			zone: "dismiss",
			reason: "detent 120",
		});
	});

	test("short of the detent the Card comes back", () => {
		expect(verdictOf({ ...base, pull: -60, armed: false })).toEqual({
			commits: false,
			zone: "dismiss",
			reason: "short 60",
		});
	});

	test("a flick outward commits short of the detent", () => {
		expect(
			verdictOf({ ...base, pull: 40, speed: 0.8, armed: false }),
		).toMatchObject({
			commits: true,
			zone: "expand",
			reason: "flick 0.80",
		});
	});

	test("a flick needs travel, so a twitch is not a flick", () => {
		expect(
			verdictOf({ ...base, pull: -10, speed: -2, armed: false }).commits,
		).toBe(false);
	});

	test("a flick back toward the slot cancels, even past the detent", () => {
		expect(verdictOf({ ...base, speed: 0.6 })).toEqual({
			commits: false,
			zone: "dismiss",
			reason: "flicked back",
		});
	});
});

describe("D's Deck collapse", () => {
	test("gathers in proportion to the pull toward Close deck, and only toward it", () => {
		expect(collapseOf("inline", 0, 96, "linear")).toBe(0);
		expect(collapseOf("inline", -48, 96, "linear")).toBe(0.5);
		expect(collapseOf("inline", -96, 96, "linear")).toBe(1);
		expect(collapseOf("inline", -200, 96, "linear")).toBe(1);
		expect(collapseOf("block", 48, 96, "linear")).toBe(0.5);
		expect(collapseOf("inline", 48, 96, "linear")).toBe(0);
		expect(collapseOf("block", -48, 96, "linear")).toBe(0);
	});

	test("a curve bends the way there but keeps both ends", () => {
		expect(collapseOf("inline", -48, 96, "ease-out")).toBeGreaterThan(0.5);
		expect(collapseOf("inline", -96, 96, "ease-out")).toBeCloseTo(1);
		expect(collapseOf("inline", -96, 96, "ease-in-out")).toBeCloseTo(1);
	});
});

describe("D's axis lock", () => {
	test("the Card stays put through the slop, then catches the hand up without a jump", () => {
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
