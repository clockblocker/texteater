import { describe, expect, test } from "bun:test";
import { progressAfter } from "./curve";
import {
	done,
	type Move,
	NO_PARTS,
	overAt,
	partSumAt,
	startMoves,
	sumAt,
	UNSTARTED,
	zAt,
} from "./move";
import { FOLLOW, type Shape, shareAt, span } from "./shape";
import { SPRINGS } from "./springs";

const MORPH = { kind: "spring" as const, ...SPRINGS.morph, rate: 0 };

function move(rest: Partial<Move> = {}): Move {
	return {
		curve: MORPH,
		source: "app",
		bornAt: 0,
		delayMs: 0,
		terms: [],
		parts: NO_PARTS,
		crossing: null,
		leaving: null,
		...rest,
	};
}

describe("a Move's one progress", () => {
	test("runs from 0 to 1 and ends within a ten-thousandth, so nothing snaps (#1311 rule 9)", () => {
		let last = 0;
		for (let t = 0; t <= 1000; t += 1000 / 60) {
			const p = progressAfter(MORPH, t);
			expect(p).toBeGreaterThanOrEqual(last);
			expect(p).toBeLessThanOrEqual(1);
			last = p;
		}
		const tail = progressAfter(MORPH, 600);
		expect(1 - tail).toBeLessThan(1e-3);
	});

	test("holds still until its clock starts, then every channel and Part rides it", () => {
		const held = move({
			bornAt: UNSTARTED,
			terms: [
				{ channel: "x", delta: 100, shape: FOLLOW },
				{ channel: "width", delta: 200, shape: FOLLOW },
			],
			parts: new Map([
				["heading", [{ channel: "y", delta: 40, shape: FOLLOW }]],
			]),
		});
		expect(sumAt([held], "x", 5000)).toBe(100);
		const [started] = startMoves([held], 0);
		if (!started) throw new Error("no Move");
		for (const t of [16, 50, 120, 300]) {
			const share = sumAt([started], "x", t) / 100;
			expect(sumAt([started], "width", t) / 200).toBeCloseTo(share, 10);
			expect(partSumAt([started], "heading", "y", t) / 40).toBeCloseTo(
				share,
				10,
			);
		}
		expect(done(started, 2000)).toBe(true);
		expect(sumAt([started], "x", 2000)).toBe(0);
	});
});

describe("shapes on the progress", () => {
	const at = (shape: Shape) =>
		[0, 0.25, 0.5, 0.75, 1].map((p) => shareAt(shape, p));

	test("follow, span and step start whole and end at nothing", () => {
		expect(at(FOLLOW)).toEqual([1, 0.75, 0.5, 0.25, 0]);
		expect(at(span(0.25, 0.75))).toEqual([1, 1, 0.5, 0, 0]);
		expect(at({ kind: "step", at: 0.5 })).toEqual([1, 1, 0, 0, 0]);
	});

	test("waypoints pass through their keys at their times", () => {
		const dip: Shape = {
			kind: "keys",
			keys: [0, 1, 1, 0],
			times: [0, 0.25, 0.75, 1],
		};
		expect(at(dip)).toEqual([0, 1, 1, 1, 0]);
	});
});

describe("a crossing on a Move", () => {
	const crossing = {
		from: 50,
		to: 5,
		over: new Map([["front", { from: 0, to: 1 }]]),
		shape: FOLLOW,
	};

	test("draws the Body above what it crosses throughout, and shows the crossed one over it on the progress", () => {
		const going = move({ crossing });
		expect(zAt(going, 0)).toBe(50);
		expect(zAt(going, 200)).toBe(50);
		const shows = [0, 30, 80, 200, 800].map(
			(t) => overAt(going, t).get("front") ?? 0,
		);
		for (let i = 1; i < shows.length; i++)
			expect(shows[i] ?? 0).toBeGreaterThanOrEqual(shows[i - 1] ?? 0);
		expect(shows[0]).toBe(0);
		expect(shows.at(-1)).toBeCloseTo(1, 3);
	});

	test("a cut switches the order at its time", () => {
		const cut = move({
			curve: { kind: "tween", ms: 100, ease: (t) => t },
			crossing: {
				...crossing,
				over: new Map(),
				shape: { kind: "step", at: 0.5 },
			},
		});
		expect(zAt(cut, 40)).toBe(50);
		expect(zAt(cut, 60)).toBe(5);
	});
});
