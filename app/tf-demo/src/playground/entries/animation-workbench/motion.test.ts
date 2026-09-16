import { describe, expect, test } from "bun:test";

import { SWAP, swapKeyframes } from "../deck-models/swap-pulse";
import { layoutFor, moveLength, rest, tapMove } from "./motion";
import { peakMs, pulseAt, swap } from "./swap";

const layout = layoutFor(4, 16);
const FRAME = 1000 / 60;

describe("swap", () => {
	const move = { from: 3, to: 1 };
	const length = moveLength(move, SWAP);

	test("a frame is a pure function of t: stepping and seeking agree", () => {
		for (let t = 0; t <= length; t += FRAME) {
			expect(swap(move, t, SWAP, layout)).toEqual(
				swap(move, t, SWAP, layout),
			);
		}
	});

	test("the tapped Card pulses to 1.02 at 22 % and is back at rest by the end", () => {
		const at = (t: number) =>
			swap(move, t, SWAP, layout).cards[move.to]?.scale ?? Number.NaN;
		expect(at(0)).toBeCloseTo(1, 6);
		expect(at(peakMs(SWAP))).toBeCloseTo(1.02, 6);
		expect(at(length)).toBeCloseTo(1, 6);
		for (let t = 0; t <= length; t += FRAME) {
			expect(at(t)).toBeGreaterThanOrEqual(1);
			expect(at(t)).toBeLessThanOrEqual(1.02 + 1e-9);
		}
	});

	test("the workbench pulse and the live deck's Motion keyframes are one spec", () => {
		const motion = swapKeyframes(SWAP);
		expect(motion.keyframes.scale).toEqual([1, 1 + SWAP.peak, 1]);
		expect(motion.options.times).toEqual([0, SWAP.peakAt, 1]);
		expect(motion.options.duration).toBeCloseTo(SWAP.duration / 1000, 9);
		expect(motion.options.ease).toEqual([SWAP.grow, SWAP.settle]);
		// The same keyframes the workbench draws: rest, peak, rest.
		expect(pulseAt(0, SWAP)).toBe(0);
		expect(pulseAt(SWAP.peakAt, SWAP)).toBeCloseTo(1, 6);
		expect(pulseAt(1, SWAP)).toBeCloseTo(0, 6);
	});

	test("a spec change redraws the same t without touching the clock", () => {
		const t = 60;
		const a = swap(move, t, SWAP, layout);
		const b = swap(move, t, { ...SWAP, peak: 0 }, layout);
		const c = swap(move, t, { ...SWAP, peakAt: 0.9 }, layout);
		expect(a.cards[move.to]?.scale).toBeGreaterThan(1);
		expect(b.cards[move.to]?.scale).toBe(1);
		expect(c.cards[move.to]?.scale).toBeLessThan(
			a.cards[move.to]?.scale ?? 0,
		);
	});

	test("a mid-flight retarget starts from the seed frame", () => {
		const seed = swap(move, 40, SWAP, layout);
		const next = { from: move.to, to: 3, seed };
		// The geometry carries over; z-order and header side are the new
		// move's at once.
		const first = swap(next, 0, SWAP, layout);
		first.cards.forEach((card, index) => {
			expect(card.y).toBeCloseTo(seed.cards[index]?.y ?? Number.NaN, 6);
			expect(card.scale).toBeCloseTo(
				seed.cards[index]?.scale ?? Number.NaN,
				6,
			);
		});
		const settled = swap(next, moveLength(next, SWAP), SWAP, layout);
		expect(settled).toEqual(swap({ from: 1, to: 3 }, length, SWAP, layout));
	});
});

describe("taps", () => {
	const atRest = rest(3);
	const first = tapMove(atRest, 1, false, swap(atRest, 0, SWAP, layout));
	if (!first) throw new Error("a tap on a folded Card must start a move");

	test("a tap at rest starts a clean move with a full timeline", () => {
		expect(first).toEqual({ from: 3, to: 1 });
		expect(moveLength(first, SWAP)).toBe(SWAP.duration);
	});

	test("a redundant tap leaves the pulse alone, playing or paused", () => {
		const onScreen = swap(first, 90, SWAP, layout);
		expect(tapMove(first, first.to, true, onScreen)).toBeNull();
		expect(tapMove(first, first.to, false, onScreen)).toBeNull();
		// The move in flight keeps its timeline; nothing collapses to 0.
		expect(moveLength(first, SWAP)).toBe(SWAP.duration);
	});

	test("a tap elsewhere mid-flight retargets from the frame on screen", () => {
		const onScreen = swap(first, 90, SWAP, layout);
		const next = tapMove(first, 2, true, onScreen);
		expect(next).toEqual({ from: 1, to: 2, seed: onScreen });
		if (!next) return;
		expect(moveLength(next, SWAP)).toBe(SWAP.duration);
		expect(swap(next, 0, SWAP, layout).cards[1]?.scale).toBeCloseTo(
			onScreen.cards[1]?.scale ?? Number.NaN,
			6,
		);
	});

	test("repeated taps end where one uninterrupted play would", () => {
		const onScreen = swap(first, 90, SWAP, layout);
		const next = tapMove(first, 2, true, onScreen);
		if (!next) throw new Error("expected a retarget");
		const end = swap(next, moveLength(next, SWAP), SWAP, layout);
		expect(end).toEqual(
			swap({ from: 1, to: 2 }, SWAP.duration, SWAP, layout),
		);
	});
});
