import { describe, expect, test } from "bun:test";
import { DECK_OF_CARDS_EASE } from "./ease";
import type { Move, Pose } from "./move";
import { pathTerm, type RetargetInput, retarget } from "./retarget";
import { SPRINGS, TURN_TWEEN } from "./springs";
import { sumAt, type Term, valueAt, velocityAt } from "./term";

const linear = DECK_OF_CARDS_EASE.linear;

function input(
	from: Pose,
	to: Pose,
	move: Move,
	live: readonly Term[] = [],
	now = 0,
): RetargetInput {
	return { live, from, to, move, now, turn: TURN_TWEEN };
}

function terms(result: ReturnType<typeof retarget>): Term[] {
	return [...result.kept, ...result.added];
}

function shown(
	rest: Pose,
	list: readonly Term[],
	channel: "x" | "y",
	now: number,
) {
	return (rest[channel] ?? 0) + sumAt(list, channel, now);
}

const box = (x: number, y: number, width = 100, height = 60): Pose => ({
	x,
	y,
	width,
	height,
});

describe("a move the hand starts", () => {
	const hand = (x: number, y: number): Move => ({
		source: "hand",
		velocity: { x, y },
		spring: SPRINGS.settle,
	});

	test("starts from where the Body shows and arrives at its rest", () => {
		const list = terms(
			retarget(input(box(300, 40), box(0, 0), hand(0, 0))),
		);
		expect(shown(box(0, 0), list, "x", 0)).toBe(300);
		expect(shown(box(0, 0), list, "x", 2000)).toBe(0);
	});

	test("keeps only the part of the hand's speed aimed at the rest", () => {
		/* the rest is 300 px to the left; the hand throws left and down */
		const list = terms(
			retarget(input(box(300, 0), box(0, 0), hand(-1500, 900))),
		);
		const x = list.find((term) => term.channel === "x") as Term;
		expect(velocityAt(x, 0)).toBeCloseTo(-1500, 6);
		/* none of the downward speed carries: y has no way to go */
		expect(list.find((term) => term.channel === "y")).toBeUndefined();
	});

	test("carries none of a hand moving away from the rest", () => {
		const list = terms(
			retarget(input(box(300, 0), box(0, 0), hand(800, 0))),
		);
		expect(velocityAt(list[0] as Term, 0)).toBe(0);
	});

	test("moves every channel on one line, so they arrive together", () => {
		const list = terms(
			retarget(
				input(box(300, 100, 200, 120), box(0, 0), hand(-900, -300)),
			),
		);
		const share = (channel: string, now: number) => {
			const term = list.find((t) => t.channel === channel) as Term;
			return valueAt(term, now) / term.delta;
		};
		for (const now of [16, 80, 200])
			for (const channel of ["y", "width", "height"])
				expect(share(channel, now)).toBeCloseTo(share("x", now), 6);
	});

	test("replaces the Terms a Body had", () => {
		const live = terms(retarget(input(box(0, 0), box(500, 0), hand(0, 0))));
		const result = retarget(
			input(box(500, 0), box(0, 0), hand(0, 0), live, 50),
		);
		expect(result.kept).toEqual([]);
	});
});

describe("a move the app starts on a spring", () => {
	const reflow: Move = { source: "app", spring: SPRINGS.reflow };

	test("adds a Term that cancels the jump and keeps the old ones running", () => {
		const first = terms(retarget(input(box(0, 0), box(400, 0), reflow)));
		const now = 120;
		const before = shown(box(400, 0), first, "x", now);
		const result = retarget(
			input(box(400, 0), box(100, 0), reflow, first, now),
		);
		const after = terms(result);
		expect(result.kept).toHaveLength(1);
		/* continuous in position and in velocity across the retarget */
		expect(shown(box(100, 0), after, "x", now)).toBeCloseTo(before, 6);
		const v = (list: Term[]) =>
			list
				.filter((term) => term.channel === "x")
				.reduce((sum, term) => sum + velocityAt(term, now), 0);
		expect(v(after)).toBeCloseTo(v(first), 6);
	});
});

describe("a move the app starts on a tween", () => {
	test("runs from where the Body shows through its waypoints to rest", () => {
		const move: Move = {
			source: "app",
			tween: { ms: 300, ease: linear },
			path: {
				x: [
					{ at: 10, ms: 300, to: -50 },
					{ at: 310, ms: 300, to: 0 },
				],
			},
		};
		const list = terms(retarget(input(box(20, 0), box(0, 0), move)));
		const x = list.find((term) => term.channel === "x") as Term;
		expect(valueAt(x, 5)).toBe(20);
		expect(valueAt(x, 310)).toBeCloseTo(-50, 6);
		expect(valueAt(x, 610)).toBe(0);
		expect(x.delayMs).toBe(10);
	});

	test("starts from `from` when it names one, unseen before", () => {
		const move: Move = {
			source: "app",
			tween: { ms: 1000, ease: linear },
			from: { y: -250, opacity: -1 },
			path: {
				y: [{ at: 500, ms: 1000, to: 0 }],
				opacity: [{ at: 500, ms: 1000, to: 0 }],
			},
		};
		const list = terms(retarget(input(box(900, 900), box(0, 0), move)));
		expect(sumAt(list, "y", 0)).toBe(-250);
		expect(sumAt(list, "opacity", 0)).toBe(-1);
		expect(sumAt(list, "x", 0)).toBe(900);
	});

	test("holds the old stacking order until its zAt", () => {
		const move: Move = {
			source: "app",
			tween: { ms: 300, ease: linear },
			zAt: 300,
		};
		const list = terms(retarget(input({ z: 2 }, { z: 7 }, move)));
		expect(sumAt(list, "z", 299)).toBe(-5);
		expect(sumAt(list, "z", 300)).toBe(0);
	});

	test("a path waiting between legs holds still", () => {
		const term = pathTerm(
			"y",
			0,
			[
				{ at: 0, ms: 100, to: 40 },
				{ at: 200, ms: 100, to: 0 },
			],
			linear,
			0,
		) as Term;
		expect(valueAt(term, 150)).toBeCloseTo(40, 6);
		expect(valueAt(term, 250)).toBeCloseTo(20, 6);
	});
});

describe("a change of side", () => {
	const any: Move = { source: "app", spring: SPRINGS.morph };
	const angle = (rest: number, list: Term[], now: number) =>
		rest + sumAt(list, "turn", now);

	test("turns face down and face up the same way round", () => {
		const down = terms(retarget(input({ turn: 0 }, { turn: 180 }, any)));
		expect(angle(180, down, 0)).toBe(0);
		expect(angle(180, down, 150)).toBeGreaterThan(0);
		const up = terms(retarget(input({ turn: 180 }, { turn: 0 }, any)));
		expect(angle(0, up, 0)).toBe(-180);
		expect(angle(0, up, 150)).toBeGreaterThan(-180);
		expect(angle(0, up, 300)).toBe(0);
	});

	test("turns back the way it came when turned again mid-turn", () => {
		const down = terms(retarget(input({ turn: 0 }, { turn: 180 }, any)));
		const mid = angle(180, down, 150);
		const back = terms(
			retarget(input({ turn: 180 }, { turn: 0 }, any, down, 150)),
		);
		expect(angle(0, back, 150)).toBeCloseTo(mid, 6);
		expect(angle(0, back, 200)).toBeLessThan(mid);
		expect(angle(0, back, 450)).toBe(0);
	});

	test("starts a scripted move off its side, turning at its sideAt", () => {
		const intro: Move = {
			source: "app",
			tween: { ms: 1000, ease: linear },
			from: { turn: -180 },
			sideAt: 1750,
		};
		const list = terms(
			retarget(input({ turn: 180 }, { turn: 180 }, intro)),
		);
		expect(angle(180, list, 1750)).toBe(0);
		expect(angle(180, list, 1900)).toBeGreaterThan(0);
		expect(angle(180, list, 2050)).toBe(180);
	});

	test("switches at once at its sideAt when the turn has no length", () => {
		const cue: Move = {
			source: "app",
			tween: { ms: 300, ease: linear },
			sideAt: 250,
		};
		const list = terms(
			retarget({
				...input({ turn: 180 }, { turn: 0 }, cue),
				turn: { ms: 0, ease: linear },
			}),
		);
		expect(angle(0, list, 250)).toBe(-180);
		expect(angle(0, list, 251)).toBe(0);
		const now = terms(
			retarget({
				...input({ turn: 180 }, { turn: 0 }, any),
				turn: { ms: 0, ease: linear },
			}),
		);
		expect(now).toEqual([]);
	});

	test("leaves a turn in flight alone when the side is unchanged", () => {
		const down = terms(retarget(input({ turn: 0 }, { turn: 180 }, any)));
		const result = retarget(
			input({ turn: 180, x: 0 }, { turn: 180, x: 50 }, any, down, 100),
		);
		expect(
			result.kept.filter((term) => term.channel === "turn"),
		).toHaveLength(1);
	});
});
