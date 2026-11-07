import { describe, expect, test } from "bun:test";
import {
	type Box,
	frameStats,
	jumpsIn,
	maxScaleOff,
	partVerdict,
	resizingFrames,
	type TrackFrame,
} from "./track";

/** A frame every 16 ms whose box is `w` wide and whose part sits at `y`. */
function frameAt(
	index: number,
	y: number,
	box: Partial<TrackFrame["box"]> = {},
): TrackFrame {
	const part: Box = { x: 16, y, w: 384, h: 40 };
	return {
		t: index * 16,
		box: { x: 0, y: 0, w: 416, h: 352, scale: 1, opacity: 1, ...box },
		parts: { lines: part },
	};
}

describe("jumpsIn", () => {
	test("finds nothing in a path that eases in and out", () => {
		expect(jumpsIn([1, 4, 9, 14, 16, 14, 9, 4, 1])).toEqual([]);
	});

	test("flags a step that stands out from both neighbours", () => {
		expect(jumpsIn([2, 2, 30, 2, 2])).toEqual([3]);
	});

	test("ignores sub-4 px steps, however they compare", () => {
		expect(jumpsIn([0, 0, 3, 0, 0])).toEqual([]);
	});

	test("flags a snap at the end of a slow landing", () => {
		expect(jumpsIn([5, 3, 2, 1, 12])).toEqual([5]);
	});
});

describe("partVerdict", () => {
	test("reads a smooth path's steps and where it rests", () => {
		const frames = [49, 60, 80, 100, 110, 112, 112].map((y, index) =>
			frameAt(index, y),
		);
		const verdict = partVerdict(frames, "lines");
		expect(verdict.jumps).toEqual([]);
		expect(verdict.moving).toBe(5);
		expect(verdict.maxStep).toBe(20);
		expect(verdict.end?.y).toBe(112);
	});

	test("finds a part that snaps mid-way", () => {
		const frames = [49, 51, 53, 90, 92, 94].map((y, index) =>
			frameAt(index, y),
		);
		expect(partVerdict(frames, "lines").jumps).toEqual([3]);
	});

	test("counts no step the eye could not see: the box was hidden at one end", () => {
		const frames = [
			frameAt(0, 49, { opacity: 0.5 }),
			frameAt(1, 49, { opacity: 0 }),
			frameAt(2, 183, { opacity: 0 }),
			frameAt(3, 183, { opacity: 0.6 }),
		];
		const verdict = partVerdict(frames, "lines");
		expect(verdict.jumps).toEqual([]);
		expect(verdict.maxStep).toBe(0);
	});
});

describe("frameStats", () => {
	test("reads the intervals between frames and counts the dropped ones", () => {
		const times = [0, 16, 33, 50, 83, 100];
		const frames = times.map((t) => ({ ...frameAt(0, 0), t }));
		const stats = frameStats(frames);
		expect(stats.frames).toBe(5);
		expect(stats.mean).toBe(20);
		expect(stats.max).toBe(33);
		expect(stats.p95).toBe(33);
		expect(stats.dropped).toBe(1);
	});
});

describe("the box", () => {
	test("measures how far its scale strays from 1", () => {
		expect(maxScaleOff([frameAt(0, 0), frameAt(1, 0)])).toBe(0);
		expect(
			maxScaleOff([frameAt(0, 0), frameAt(1, 0, { scale: 1.05 })]),
		).toBeCloseTo(0.05);
	});

	test("counts the frames it spends between its first size and its last", () => {
		const frames = [416, 500, 650, 742, 720].map((w, index) =>
			frameAt(index, 0, { w, h: 352 }),
		);
		expect(resizingFrames(frames)).toBe(2);
	});
});
