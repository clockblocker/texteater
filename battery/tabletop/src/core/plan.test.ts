import { describe, expect, test } from "bun:test";
import { progressAfter } from "./curve";
import { type Move, startMoves, sumAt, UNSTARTED } from "./move";
import { type Change, LEAN_LEAD, type Pose, plan } from "./plan";
import { SPRINGS, TURN_TWEEN } from "./springs";

const CARD = {
	x: 100,
	y: 300,
	width: 256,
	height: 144,
	rotate: 0,
	lift: 0,
	opacity: 0,
	turn: 0,
} satisfies Pose;
const COVER = {
	x: 50,
	y: 40,
	width: 640,
	height: 800,
	rotate: 0,
	lift: 0,
	opacity: 0,
	turn: 0,
} satisfies Pose;

function change(rest: Partial<Change>): Change {
	return {
		live: [],
		from: CARD,
		to: COVER,
		style: { source: "app", spring: SPRINGS.morph },
		now: 0,
		bornAt: 0,
		turn: TURN_TWEEN,
		lean: null,
		stacking: null,
		formChanged: false,
		...rest,
	};
}

function movesOf(planned: ReturnType<typeof plan>): Move[] {
	return [
		...planned.keep,
		...(planned.box ? [planned.box] : []),
		...(planned.turn ? [planned.turn] : []),
	];
}

const shown = (
	moves: readonly Move[],
	rest: Pose,
	channel: keyof Pose,
	t: number,
) => (rest[channel] ?? 0) + sumAt(moves, channel, t);

describe("a release from the hand", () => {
	const hand = (
		velocity: { x: number; y: number },
		from: Pose = CARD,
		to: Pose = { ...CARD, x: 400 },
	) =>
		plan(
			change({
				from,
				to,
				style: { source: "hand", velocity, spring: SPRINGS.settle },
			}),
		);

	test("starts where the Body shows and ends exactly at its rest", () => {
		const { box } = hand({ x: 0, y: 0 });
		if (!box) throw new Error("no Move");
		expect(shown([box], { ...CARD, x: 400 }, "x", 0)).toBe(100);
		expect(shown([box], { ...CARD, x: 400 }, "x", 3000)).toBe(400);
	});

	test("carries only the part of the hand's speed aimed at the rest", () => {
		const toward = hand({ x: 600, y: 900 }).box?.curve;
		const away = hand({ x: -600, y: 0 }).box?.curve;
		expect(toward).toMatchObject({ kind: "spring", rate: 2 });
		expect(away).toMatchObject({ kind: "spring", rate: 0 });
	});

	test("never passes its rest, however fast the hand comes in", () => {
		for (const speed of [0, 900, 4000, 40_000]) {
			const { box } = hand({ x: speed, y: 0 });
			if (!box) throw new Error("no Move");
			for (let t = 0; t < 2000; t += 4)
				expect(
					shown([box], { ...CARD, x: 400 }, "x", t),
				).toBeLessThanOrEqual(400 + 1e-6);
		}
	});

	test("with no way to go throws the hand's speed away and makes no Move", () => {
		const still = hand({ x: 3000, y: -2000 }, CARD, {
			...CARD,
			x: 100.004,
		});
		expect(still.box).toBeNull();
		expect(still.keep).toEqual([]);
	});
});

describe("a change the app starts on a spring", () => {
	const open = plan(change({}));

	test("rides one progress: place, size and every edge end on the same frame", () => {
		const { box } = open;
		if (!box) throw new Error("no Move");
		for (const t of [16, 60, 140, 300]) {
			const share = sumAt([box], "width", t) / (CARD.width - COVER.width);
			expect(sumAt([box], "x", t) / (CARD.x - COVER.x)).toBeCloseTo(
				share,
				10,
			);
			expect(
				sumAt([box], "height", t) / (CARD.height - COVER.height),
			).toBeCloseTo(share, 10);
		}
	});

	for (const at of [16, 90, 240])
		test(`turned back ${at} ms in, every channel keeps its place and its speed`, () => {
			const first = movesOf(open);
			const back = movesOf(
				plan(
					change({
						live: first,
						from: COVER,
						to: CARD,
						now: at,
						bornAt: at,
					}),
				),
			);
			for (const channel of ["x", "y", "width", "height"] as const) {
				const before = (t: number) => shown(first, COVER, channel, t);
				const after = (t: number) => shown(back, CARD, channel, t);
				expect(after(at)).toBeCloseTo(before(at), 6);
				const speed = (f: (t: number) => number) =>
					(f(at + 0.01) - f(at)) / 0.01;
				expect(speed(after)).toBeCloseTo(speed(before), 2);
			}
		});
});

describe("a lean the change lets go of", () => {
	const lean = { tiltX: -6, tiltY: 5, tiltLift: 0.02, glare: 1 };

	test("is flat before a box that resizes starts to grow (#1322)", () => {
		const { box } = plan(change({ lean }));
		if (!box) throw new Error("no Move");
		const progressAt = (t: number) => progressAfter(box.curve, t);
		for (let t = 0; t < 1500; t += 4) {
			const grown = Math.abs(
				sumAt([box], "width", t) - (CARD.width - COVER.width),
			);
			const leaning =
				Math.abs(sumAt([box], "tiltX", t)) +
				Math.abs(sumAt([box], "tiltY", t));
			if (grown > 1e-6) expect(leaning).toBe(0);
		}
		expect(progressAt(0)).toBe(0);
		expect(sumAt([box], "tiltY", 0)).toBe(5);
		expect(
			box.terms.find((term) => term.channel === "width")?.shape,
		).toMatchObject({ kind: "span", from: LEAN_LEAD, to: 1 });
	});

	test("rides the whole progress when the box keeps its size", () => {
		const { box } = plan(change({ to: { ...CARD, x: 400 }, lean }));
		expect(
			box?.terms.find((term) => term.channel === "tiltY")?.shape,
		).toEqual({ kind: "follow" });
	});
});

describe("a change of stacking", () => {
	test("crosses the Bodies whose order flips on the box's own progress", () => {
		const { box } = plan(
			change({
				from: COVER,
				to: CARD,
				stacking: {
					from: 50,
					to: 5,
					others: [
						{ id: "front", z: 6, later: true },
						{ id: "behind", z: 4, later: false },
					],
					showing: new Map(),
				},
			}),
		);
		expect(box?.crossing?.over).toEqual(
			new Map([["front", { from: 0, to: 1 }]]),
		);
		expect(box?.crossing?.shape).toEqual({ kind: "follow" });
	});

	test("on a Trick, is cut at its zAt", () => {
		const { box } = plan(
			change({
				from: CARD,
				to: CARD,
				style: {
					source: "app",
					tween: TURN_TWEEN,
					path: {
						x: [{ at: 0, ms: 400, to: 0 }],
						y: [
							{ at: 0, ms: 400, to: -50 },
							{ at: 500, ms: 400, to: 0 },
						],
					},
					zAt: 400,
				},
				stacking: { from: 3, to: 7, others: [], showing: new Map() },
			}),
		);
		expect(box?.crossing?.shape).toEqual({ kind: "step", at: 400 / 900 });
		expect(box?.bornAt).toBe(0);
	});
});

describe("a change of side", () => {
	const DOWN: Pose = { ...CARD, turn: 180 };

	test("turns face down and face up the same way round, as a Move of its own", () => {
		const down = plan(change({ to: DOWN, from: CARD }));
		const up = plan(change({ to: CARD, from: DOWN }));
		expect(down.turn?.terms).toEqual([
			{ channel: "turn", delta: -180, shape: { kind: "follow" } },
		]);
		expect(up.turn?.terms).toEqual([
			{ channel: "turn", delta: -180, shape: { kind: "follow" } },
		]);
	});

	test("turns back the way it came when turned again mid-turn", () => {
		const down = movesOf(plan(change({ to: DOWN, from: CARD, bornAt: 0 })));
		const back = movesOf(
			plan(
				change({
					live: startMoves(down, 0),
					from: DOWN,
					to: CARD,
					now: 100,
					bornAt: 100,
				}),
			),
		);
		const angle = shown(back, CARD, "turn", 100);
		expect(angle).toBeCloseTo(shown(down, DOWN, "turn", 100), 6);
		expect(shown(back, CARD, "turn", 2000)).toBe(0);
		expect(
			back.filter((move) =>
				move.terms.some((term) => term.channel === "turn"),
			),
		).toHaveLength(1);
	});

	test("waits for its Move's clock like every other", () => {
		expect(
			plan(change({ to: DOWN, from: CARD, bornAt: UNSTARTED })).turn
				?.bornAt,
		).toBe(UNSTARTED);
	});
});
