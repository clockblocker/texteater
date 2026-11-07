import { describe, expect, test } from "bun:test";
import { type Move, NO_PARTS, sumAt } from "./move";
import { motionPolicy, REDUCED, reduce, reducedKind } from "./reduce";
import { FOLLOW } from "./shape";
import { SPRINGS } from "./springs";

const ON = { reduced: true };

function move(terms: Move["terms"], rest: Partial<Move> = {}): Move {
	return {
		curve: { kind: "spring", ...SPRINGS.morph, rate: 0 },
		source: "app",
		bornAt: 0,
		delayMs: 0,
		terms,
		parts: NO_PARTS,
		crossing: null,
		leaving: null,
		...rest,
	};
}

const far = move([
	{ channel: "x", delta: 300, shape: FOLLOW },
	{ channel: "width", delta: -400, shape: FOLLOW },
	{ channel: "tiltY", delta: 6, shape: FOLLOW },
	{ channel: "lift", delta: 0.03, shape: FOLLOW },
]);

describe("the policy", () => {
	test("is reduced only when preferred, and Always play animations wins", () => {
		expect(motionPolicy(true, false).reduced).toBe(true);
		expect(motionPolicy(true, true).reduced).toBe(false);
		expect(motionPolicy(false, false).reduced).toBe(false);
	});

	test("leaves every Move as it is when not reduced", () => {
		expect(reduce(far, { reduced: false })).toBe(far);
	});
});

describe("a change past 24 px", () => {
	const reduced = reduce(far, ON);
	const opacity = (t: number) => 1 + sumAt([reduced], "opacity", t);

	test("dissolves: it holds where it was while it fades out over 100 ms", () => {
		expect(reducedKind(far)).toBe("dissolve");
		expect(sumAt([reduced], "x", 50)).toBe(300);
		expect(opacity(0)).toBe(1);
		expect(opacity(REDUCED.dissolveMs)).toBeCloseTo(0, 6);
	});

	test("then shows at its rest and fades back in over 100 ms: one element, never two", () => {
		expect(sumAt([reduced], "x", REDUCED.dissolveMs + 1)).toBe(0);
		expect(opacity(2 * REDUCED.dissolveMs)).toBe(1);
	});

	test("nothing leans, lifts or grows", () => {
		expect(
			reduced.terms.some((term) =>
				["tiltY", "lift"].includes(term.channel),
			),
		).toBe(false);
		expect(sumAt([reduced], "width", 50)).toBe(-400);
	});

	test("its stacking switches while it is hidden", () => {
		const crossed = reduce(
			move(far.terms, {
				crossing: {
					from: 50,
					to: 5,
					over: new Map([["d", { from: 0, to: 1 }]]),
					shape: FOLLOW,
				},
			}),
			ON,
		);
		expect(crossed.crossing?.shape).toEqual({ kind: "step", at: 0.5 });
	});
});

describe("a change of 24 px or less", () => {
	test("tweens there in 140 ms", () => {
		const near = reduce(
			move([{ channel: "y", delta: 12, shape: FOLLOW }]),
			ON,
		);
		expect(near.curve).toMatchObject({
			kind: "tween",
			ms: REDUCED.tweenMs,
		});
		expect(sumAt([near], "y", REDUCED.tweenMs)).toBe(0);
	});
});

describe("a turn", () => {
	test("is a flat 140 ms crossfade", () => {
		const turn = reduce(
			move([{ channel: "turn", delta: -180, shape: FOLLOW }]),
			ON,
		);
		expect(turn.curve).toMatchObject({ kind: "tween", ms: REDUCED.turnMs });
	});
});

describe("a trick", () => {
	test("keeps each Card's stagger: it dissolves at its first leg's start", () => {
		const leg = move(
			[
				{
					channel: "y",
					delta: 200,
					shape: {
						kind: "keys",
						keys: [1, 0.5, 0],
						times: [0, 0.5, 1],
					},
				},
			],
			{ delayMs: 120, curve: { kind: "tween", ms: 900, ease: (t) => t } },
		);
		const reduced = reduce(leg, ON);
		expect(reduced.delayMs).toBe(120);
		expect(reduced.curve).toMatchObject({ ms: 2 * REDUCED.dissolveMs });
		expect(sumAt([reduced], "y", 120 + 50)).toBe(200);
		expect(sumAt([reduced], "y", 120 + 150)).toBe(0);
	});
});
