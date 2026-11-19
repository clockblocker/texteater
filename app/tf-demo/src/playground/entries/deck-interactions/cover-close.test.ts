import { describe, expect, test } from "bun:test";
import { CHANNELS, restOf } from "./card-move";
import {
	besideOf,
	CLOSE_DEFAULTS,
	CLOSE_LIFT,
	coverClose,
} from "./cover-close";
import { drawn, type Slot } from "./geometry";

/** A pile of four: 48 px tails, the front one at the open scale. */
const SLOTS: Slot[] = [0, 1, 2, 3].map((index) => ({
	u: 100,
	v: 50 + index * 48,
	w: 416,
	h: 352,
	r: 0,
	s: index === 3 ? 1.05 : 1,
}));
const ORDER = ["a", "b", "c", "d"];
const KNOBS = { closeOutMs: 300, closeInMs: 260, closeGap: 16 };

function slot(index: number): Slot {
	const found = SLOTS[index];
	if (!found) throw new Error(`No slot ${index}`);
	return found;
}

function close(id: string, knobs = KNOBS, openAt = 3) {
	const move = coverClose({ order: ORDER, openAt, id, slots: SLOTS, knobs });
	if (!move) throw new Error(`No close for ${id}`);
	return move;
}

describe("where the close's first leg ends", () => {
	test("beside its slot toward inline-end, at its height, the gap clear of every other Card as drawn", () => {
		const beside = besideOf(SLOTS, 1, 16);
		if (!beside) throw new Error("No beside");
		const front = drawn(slot(3));
		expect(drawn(beside).u).toBeCloseTo(front.u + front.w + 16, 9);
		expect({ ...beside, u: 0 }).toEqual({ ...slot(1), u: 0 });
	});

	test("a Card at the open scale clears the rest by the gap as drawn too", () => {
		const beside = besideOf(SLOTS, 3, 0);
		if (!beside) throw new Error("No beside");
		const back = drawn(slot(0));
		expect(drawn(beside).u).toBeCloseTo(back.u + back.w, 9);
	});
});

describe("the Cover's close", () => {
	test("a Card not in the Deck has none", () => {
		expect(
			coverClose({
				order: ORDER,
				openAt: 3,
				id: "x",
				slots: SLOTS,
				knobs: CLOSE_DEFAULTS,
			}),
		).toBeNull();
	});

	test("a Card other than the open one goes out beside the Deck, lifted at its slot's size, then in, set down, restacking as the second leg starts", () => {
		const move = close("b");
		const beside = besideOf(SLOTS, 1, KNOBS.closeGap);
		if (!beside) throw new Error("No beside");
		expect(move).toMatchObject({
			index: 1,
			startMs: 0,
			ms: 560,
			zAtMs: 300,
			lifted: true,
		});
		const out = { ...beside, lift: CLOSE_LIFT };
		for (const channel of CHANNELS)
			expect(move.legs[channel]).toEqual([
				{ at: 0, ms: 300, to: out[channel] },
				{ at: 300, ms: 260, to: { ...slot(1), lift: 0 }[channel] },
			]);
		expect(restOf(move)).toEqual({ ...slot(1), lift: 0 });
	});

	test("the open Card goes straight into its slot in one leg, restacking as it lands", () => {
		const move = close("d");
		expect(move).toMatchObject({
			index: 3,
			ms: 300,
			zAtMs: 300,
			lifted: true,
		});
		for (const channel of CHANNELS)
			expect(move.legs[channel]).toEqual([
				{ at: 0, ms: 300, to: { ...slot(3), lift: 0 }[channel] },
			]);
	});

	test("the open Card goes straight in wherever it is in the Deck, and the last, when another is open, goes out and in under the Cards stacked over it", () => {
		const open = close("b", KNOBS, 1);
		expect(open).toMatchObject({ index: 1, ms: 300, zAtMs: 300 });
		expect(open.legs.u).toHaveLength(1);
		const last = close("d", KNOBS, 1);
		expect(last).toMatchObject({ index: 3, ms: 560, zAtMs: 300 });
		expect(last.legs.u).toHaveLength(2);
	});

	test("the legs and the gap follow the knobs", () => {
		const move = close("a", {
			closeOutMs: 420,
			closeInMs: 180,
			closeGap: 40,
		});
		expect(move).toMatchObject({ ms: 600, zAtMs: 420 });
		const beside = besideOf(SLOTS, 0, 40);
		expect(move.legs.u[0]?.to).toBe(beside?.u ?? Number.NaN);
		expect(move.legs.u[1]).toEqual({ at: 420, ms: 180, to: slot(0).u });
	});
});
