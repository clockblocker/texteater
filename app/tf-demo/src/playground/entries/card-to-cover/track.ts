/**
 * What one open or close looked like, frame by frame, and the verdict on
 * it: whether each part's path is smooth or jumps and keeps to the box's
 * progress, how far the box ever scaled or overshot, and how long the
 * frames took. Pure; `recorder.ts` fills it.
 */

/** A rect in logical px: `x` from the inline-start edge. */
export type Box = {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
};

export type TrackFrame = {
	/** ms since the tap, on the page's clock. */
	readonly t: number;
	/** The box in the frame, the scale its transform carries and its opacity. */
	readonly box: Box & { readonly scale: number; readonly opacity: number };
	/** Each part's rect in the box. */
	readonly parts: Readonly<Record<string, Box>>;
};

export type PartVerdict = {
	readonly part: string;
	/** Frames in which the part was seen to move in the box. */
	readonly moving: number;
	/** The largest move from one frame to the next, in the box, px. */
	readonly maxStep: number;
	/** The frames whose step stands out from both of its neighbours. */
	readonly jumps: readonly number[];
	/** Where it came to rest in the box. */
	readonly end: Box | null;
};

export type FrameStats = {
	readonly frames: number;
	readonly mean: number;
	readonly p95: number;
	readonly max: number;
	/** Intervals over 1.5 × the median: frames the page dropped. */
	readonly dropped: number;
};

/** A step is a jump when it passes this and 3 × both of its neighbours. */
const JUMP_MIN_PX = 4;
const JUMP_RATIO = 3;
/** Under this a part counts as still: sub-pixel rounding. */
const STILL_PX = 0.25;

function distance(a: Box, b: Box): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Under this opacity the box shows nothing, so nothing in it can be seen to jump. */
const HIDDEN = 0.01;

/**
 * The frame-to-frame steps of one part that anyone could see: 0 where it
 * is missing, or where the box was hidden at either end of the step.
 */
function stepsOf(frames: readonly TrackFrame[], part: string): number[] {
	const steps: number[] = [];
	for (let index = 1; index < frames.length; index++) {
		const before = frames[index - 1];
		const after = frames[index];
		const from = before?.parts[part];
		const to = after?.parts[part];
		const seen =
			before !== undefined &&
			after !== undefined &&
			before.box.opacity > HIDDEN &&
			after.box.opacity > HIDDEN;
		steps.push(from && to && seen ? distance(from, to) : 0);
	}
	return steps;
}

/** The indices of steps that stand out from both neighbours. */
export function jumpsIn(steps: readonly number[]): number[] {
	return steps.flatMap((step, index) => {
		const around = Math.max(steps[index - 1] ?? 0, steps[index + 1] ?? 0);
		return step > JUMP_MIN_PX && step > JUMP_RATIO * around
			? [index + 1]
			: [];
	});
}

export function partVerdict(
	frames: readonly TrackFrame[],
	part: string,
): PartVerdict {
	const steps = stepsOf(frames, part);
	const end =
		[...frames].reverse().find((frame) => frame.parts[part])?.parts[part] ??
		null;
	return {
		part,
		moving: steps.filter((step) => step > STILL_PX).length,
		maxStep: Math.max(0, ...steps),
		jumps: jumpsIn(steps),
		end,
	};
}

function percentile(sorted: readonly number[], share: number): number {
	if (sorted.length === 0) return 0;
	const index = Math.min(
		sorted.length - 1,
		Math.ceil(share * sorted.length) - 1,
	);
	return sorted[Math.max(0, index)] ?? 0;
}

export function frameStats(frames: readonly TrackFrame[]): FrameStats {
	const intervals: number[] = [];
	for (let index = 1; index < frames.length; index++) {
		const before = frames[index - 1];
		const after = frames[index];
		if (before && after) intervals.push(after.t - before.t);
	}
	const sorted = [...intervals].sort((a, b) => a - b);
	const median = percentile(sorted, 0.5);
	return {
		frames: intervals.length,
		mean:
			intervals.length === 0
				? 0
				: intervals.reduce((sum, value) => sum + value, 0) /
					intervals.length,
		p95: percentile(sorted, 0.95),
		max: sorted.at(-1) ?? 0,
		dropped: intervals.filter((value) => value > 1.5 * median).length,
	};
}

/** How far the box's scale ever strayed from 1. */
export function maxScaleOff(frames: readonly TrackFrame[]): number {
	return Math.max(0, ...frames.map((frame) => Math.abs(frame.box.scale - 1)));
}

/** How far the box ever went past where it came to rest, px, on each axis. */
export function boxOvershoot(frames: readonly TrackFrame[]): Box {
	const first = frames[0]?.box;
	const last = frames.at(-1)?.box;
	if (!first || !last) return { x: 0, y: 0, w: 0, h: 0 };
	const past = (key: keyof Box) => {
		const sign = Math.sign(last[key] - first[key]);
		return Math.max(
			0,
			...frames.map((frame) => (frame.box[key] - last[key]) * sign),
		);
	};
	return { x: past("x"), y: past("y"), w: past("w"), h: past("h") };
}

/**
 * How far `part`'s place in the box ever strayed from where the box's own
 * progress (its height's, or its width's when the height holds) puts it,
 * px: 0 when the parts ride the box's clock.
 */
export function partDrift(frames: readonly TrackFrame[], part: string): number {
	const first = frames.find((frame) => frame.parts[part]);
	const last = [...frames].reverse().find((frame) => frame.parts[part]);
	const from = first?.parts[part];
	const to = last?.parts[part];
	if (!first || !last || !from || !to) return 0;
	const key = Math.abs(last.box.h - first.box.h) > 0.5 ? "h" : "w";
	const span = last.box[key] - first.box[key];
	if (Math.abs(span) <= 0.5) return 0;
	return Math.max(
		0,
		...frames.map((frame) => {
			const place = frame.parts[part];
			if (!place) return 0;
			const p = (frame.box[key] - first.box[key]) / span;
			return Math.hypot(
				place.x - (from.x + (to.x - from.x) * p),
				place.y - (from.y + (to.y - from.y) * p),
			);
		}),
	);
}

/** How many frames the box was between its first size and its last. */
export function resizingFrames(frames: readonly TrackFrame[]): number {
	const first = frames[0]?.box;
	const last = frames.at(-1)?.box;
	if (!first || !last) return 0;
	const between = (value: number, a: number, b: number) =>
		value > Math.min(a, b) + 0.5 && value < Math.max(a, b) - 0.5;
	return frames.filter(
		(frame) =>
			between(frame.box.w, first.w, last.w) ||
			between(frame.box.h, first.h, last.h),
	).length;
}
