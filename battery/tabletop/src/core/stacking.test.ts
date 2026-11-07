import { describe, expect, test } from "bun:test";
import { type Move, NO_PARTS, overAt } from "./move";
import { FOLLOW } from "./shape";
import { SPRINGS } from "./springs";
import { crossing, type Neighbour } from "./stacking";

/* a Deck of five, bottom first, its middle Card opened as a Cover at 50 */
const DECK: Neighbour[] = [
	{ id: "a", z: 1, later: false },
	{ id: "b", z: 2, later: false },
	{ id: "d", z: 4, later: true },
	{ id: "e", z: 5, later: true },
];

function on(made: ReturnType<typeof crossing>, bornAt = 0): Move {
	return {
		curve: { kind: "spring", ...SPRINGS.morph, rate: 0 },
		source: "app",
		bornAt,
		delayMs: 0,
		terms: [],
		parts: NO_PARTS,
		crossing: made,
		leaving: null,
	};
}

describe("a crossing", () => {
	test("going back under: the Cards in front of the rest come to show over it, from nothing to all", () => {
		const made = crossing({
			from: 50,
			to: 3,
			others: DECK,
			showing: new Map(),
			shape: FOLLOW,
		});
		expect(made?.over).toEqual(
			new Map([
				["d", { from: 0, to: 1 }],
				["e", { from: 0, to: 1 }],
			]),
		);
	});

	test("coming forward: the Cards in front stop showing over it", () => {
		const made = crossing({
			from: 3,
			to: 50,
			others: DECK,
			showing: new Map(),
			shape: FOLLOW,
		});
		expect(made?.over).toEqual(
			new Map([
				["d", { from: 1, to: 0 }],
				["e", { from: 1, to: 0 }],
			]),
		);
	});

	test("turned back halfway, starts from what shows, so nothing pops", () => {
		const going = on(
			crossing({
				from: 50,
				to: 3,
				others: DECK,
				showing: new Map(),
				shape: FOLLOW,
			}),
		);
		const showing = overAt(going, 60);
		const half = showing.get("d") ?? 0;
		expect(half).toBeGreaterThan(0.05);
		expect(half).toBeLessThan(0.95);
		const back = crossing({
			from: 3,
			to: 50,
			others: DECK,
			showing,
			shape: FOLLOW,
		});
		expect(back?.over.get("d")).toEqual({ from: half, to: 0 });
		expect(overAt(on(back, 60), 60).get("d")).toBeCloseTo(half, 10);
	});

	test("ties go by the seats' order", () => {
		const made = crossing({
			from: 9,
			to: 4,
			others: [{ id: "same", z: 4, later: true }],
			showing: new Map(),
			shape: FOLLOW,
		});
		expect(made?.over.get("same")).toEqual({ from: 0, to: 1 });
	});

	test("is nothing when no other Body's order against it changes", () => {
		expect(
			crossing({
				from: 50,
				to: 50,
				others: DECK,
				showing: new Map(),
				shape: FOLLOW,
			}),
		).toBeNull();
		expect(
			crossing({
				from: 9,
				to: 10,
				others: DECK,
				showing: new Map(),
				shape: FOLLOW,
			}),
		).toBeNull();
	});

	test("a cut crosses nothing and only switches the order", () => {
		const cut = crossing({
			from: 3,
			to: 7,
			others: DECK,
			showing: new Map(),
			shape: { kind: "step", at: 0.4 },
		});
		expect(cut?.over.size).toBe(0);
		expect(cut?.shape).toEqual({ kind: "step", at: 0.4 });
	});
});
