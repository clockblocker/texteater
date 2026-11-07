import { describe, expect, test } from "bun:test";
import { DECK_OF_CARDS_EASE } from "./ease";
import { motionPolicy, REDUCED, reduce, reduceFollowers } from "./reduce";
import { sumAt, type Term } from "./term";

const reduced = motionPolicy(true, false);
const linear = DECK_OF_CARDS_EASE.linear;

function spring(channel: Term["channel"], delta: number, delayMs = 0): Term {
	return {
		channel,
		delta,
		curve: { kind: "spring", stiffness: 632, damping: 50, rate: 10 },
		delayMs,
		bornAt: 0,
		source: "hand",
		raise: true,
	};
}

describe("the policy", () => {
	test("is reduced only when preferred, and Always play animations wins", () => {
		expect(motionPolicy(true, false).reduced).toBe(true);
		expect(motionPolicy(true, true).reduced).toBe(false);
		expect(motionPolicy(false, false).reduced).toBe(false);
	});

	test("leaves every Term as it is when not reduced", () => {
		const terms = [spring("x", 300), spring("lift", 0.03)];
		expect(reduce(terms, motionPolicy(false, false))).toEqual(terms);
	});
});

describe("a change of place past 24 px", () => {
	const terms = reduce(
		[spring("x", 300), spring("y", -40), spring("rotate", 12)],
		reduced,
	);

	test("holds where it was while it fades out over 100 ms", () => {
		expect(sumAt(terms, "x", 99)).toBe(300);
		expect(sumAt(terms, "rotate", 99)).toBe(12);
		expect(sumAt(terms, "opacity", 50)).toBeCloseTo(-0.5, 6);
		expect(sumAt(terms, "opacity", 100)).toBeCloseTo(-1, 6);
	});

	test("then shows at its rest and fades back in over 100 ms: one element, never two", () => {
		expect(sumAt(terms, "x", 100)).toBe(0);
		expect(sumAt(terms, "opacity", 150)).toBeCloseTo(-0.5, 6);
		expect(sumAt(terms, "opacity", 2 * REDUCED.dissolveMs)).toBe(0);
	});

	test("starts with no velocity: no flight and no overshoot", () => {
		expect(terms.every((term) => term.curve.kind === "tween")).toBe(true);
	});
});

describe("a change of 24 px or less", () => {
	test("tweens there in 140 ms", () => {
		const [x] = reduce([spring("x", 20)], reduced);
		expect(x?.curve).toMatchObject({ kind: "tween", ms: REDUCED.tweenMs });
		expect(sumAt(x ? [x] : [], "opacity", 50)).toBe(0);
	});
});

describe("what never moves under reduced motion", () => {
	test("lift and tilt get no Terms", () => {
		expect(
			reduce([spring("lift", 0.06), spring("tiltX", 8)], reduced),
		).toEqual([]);
	});

	test("a turn is a flat 140 ms crossfade", () => {
		const [turn] = reduce(
			[
				{
					channel: "turn",
					delta: -180,
					curve: { kind: "tween", ms: 300, ease: linear },
					delayMs: 40,
					bornAt: 0,
					source: "app",
				},
			],
			reduced,
		);
		expect(turn?.curve).toMatchObject({ ms: REDUCED.turnMs });
		expect(turn?.delayMs).toBe(40);
	});
});

describe("a trick", () => {
	test("keeps each Card's stagger and dissolves it at its first leg's start", () => {
		const legs: Term = {
			channel: "y",
			delta: 150,
			curve: {
				kind: "tween",
				ms: 900,
				ease: linear,
				keyframes: [1, -0.5, 0],
				times: [0, 0.4, 1],
			},
			delayMs: 30,
			bornAt: 0,
			source: "app",
		};
		const terms = reduce([legs], reduced);
		expect(sumAt(terms, "y", 129)).toBe(150);
		expect(sumAt(terms, "y", 130)).toBe(0);
		expect(sumAt(terms, "opacity", 130)).toBeCloseTo(-1, 6);
	});

	test("drops waypoints of a Card whose rest did not change", () => {
		const outAndBack: Term = {
			channel: "x",
			delta: 40,
			curve: {
				kind: "tween",
				ms: 400,
				ease: linear,
				keyframes: [0, 1, 0],
			},
			delayMs: 2,
			bornAt: 0,
			source: "app",
		};
		expect(reduce([outAndBack], reduced)).toEqual([]);
	});
});

describe("a Body's parts", () => {
	test("switch with the Body when it dissolves", () => {
		const parts = reduceFollowers(
			[spring("x", 40), spring("opacity", -1)],
			[spring("width", 400)],
			reduced,
		);
		expect(sumAt(parts, "x", 99)).toBe(40);
		expect(sumAt(parts, "x", 100)).toBe(0);
		expect(sumAt(parts, "opacity", 99)).toBe(-1);
		expect(sumAt(parts, "opacity", 100)).toBe(0);
	});
});
