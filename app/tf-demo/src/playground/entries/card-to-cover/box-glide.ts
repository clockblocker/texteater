import {
	type AnimationPlaybackControls,
	animate,
	type MotionValue,
	frame as motionFrame,
	motionValue,
	type Transition,
} from "motion/react";
import type { Rect } from "../deck-interactions/geometry";
import type { CardValues } from "../deck-interactions/use-deck";
import { PROGRESS_REST } from "./timing";

/** One frame at 60 Hz, in ms. */
const FRAME_MS = 1000 / 60;

/** What the box's own glide moves: its place and its real size. */
export const BOX = ["u", "v", "w", "h"] as const;

/** The parts both forms share: they move to their new places. */
export const SHARED_PARTS = ["heading", "contexts", "lines"] as const;
export type SharedPart = (typeof SHARED_PARTS)[number];

type Offset = { readonly x: number; readonly y: number };
type Places = Readonly<Record<SharedPart, Offset>>;

/** How far each shared part is drawn from its place in the layout, px. */
export type PartOffsets = Readonly<
	Record<
		SharedPart,
		{ readonly x: MotionValue<number>; readonly y: MotionValue<number> }
	>
>;

export function makePartOffsets(): PartOffsets {
	const pair = () => ({ x: motionValue(0), y: motionValue(0) });
	return { heading: pair(), contexts: pair(), lines: pair() };
}

/** `value` on the device's pixel grid. */
export function snapPx(value: number, dpr: number): number {
	return Math.round(value * dpr) / dpr;
}

/**
 * How far a moving value still has to go, `left`, on the device's pixel
 * grid, never rounded past `span`, the way it had at the start: a move
 * that starts off the grid holds still until the grid is on its way
 * rather than stepping back onto it. Past the end it is left free, so an
 * underdamped spring still overshoots.
 */
export function snapLeft(left: number, span: number, dpr: number): number {
	const snapped = snapPx(left, dpr);
	return span >= 0 ? Math.min(snapped, span) : Math.max(snapped, span);
}

/**
 * The box at progress `p` from `from` to `to`. Snapped (`dpr` given), each
 * value is `to` plus a whole number of device pixels (`snapLeft`), and the
 * width moves by an even number of them: every edge and the centred
 * content column keep `to`'s sub-pixel phase on every frame, so nothing in
 * the box shimmies against its edges, and the box lands exactly on `to`.
 */
export function boxAt(
	from: Rect,
	to: Rect,
	p: number,
	dpr: number | null,
): Rect {
	const at = (a: number, b: number) => a + (b - a) * p;
	if (dpr === null)
		return {
			u: at(from.u, to.u),
			v: at(from.v, to.v),
			w: at(from.w, to.w),
			h: at(from.h, to.h),
		};
	const near = (a: number, b: number) =>
		b + snapLeft(at(a, b) - b, a - b, dpr);
	return {
		u: near(from.u, to.u),
		v: near(from.v, to.v),
		w:
			to.w +
			2 *
				snapLeft(
					(at(from.w, to.w) - to.w) / 2,
					(from.w - to.w) / 2,
					dpr,
				),
		h: near(from.h, to.h),
	};
}

/** Each shared part's drawn rect, page px, at the transforms the DOM has now. */
function drawnRects(box: HTMLElement): Record<SharedPart, DOMRect> | null {
	const rects: Partial<Record<SharedPart, DOMRect>> = {};
	for (const name of SHARED_PARTS) {
		const part = box.querySelector(`[data-part="${name}"]`);
		if (!(part instanceof HTMLElement)) return null;
		rects[name] = part.getBoundingClientRect();
	}
	return rects as Record<SharedPart, DOMRect>;
}

/**
 * The FLIP of a change of form, measured in the box's own frame: each
 * part's drawn rect, then `commit`, then its rect again. Both reads are in
 * one task, under the same box transform and the same part offsets, so
 * their difference is the layout's move to the sub-pixel, as long as the
 * box only translates (a rotated or scaled box would turn or stretch it).
 * Each part is left drawn where it was, ready for `glide` to bring its
 * offset to 0. The box keeps its size across the commit, and the column
 * its width, so the new places are the ones the parts keep as it grows.
 * Returns the offsets the parts start at and their new layout rects.
 */
export function flipParts(
	box: HTMLElement | null,
	offsets: PartOffsets,
	commit: () => void,
): {
	readonly start: Places;
	readonly placed: Readonly<Record<SharedPart, DOMRect>>;
} | null {
	const before = box ? drawnRects(box) : null;
	commit();
	const after = box ? drawnRects(box) : null;
	if (!before || !after) return null;
	const start = {} as Record<SharedPart, Offset>;
	const placed = {} as Record<SharedPart, DOMRect>;
	for (const name of SHARED_PARTS) {
		const drawn = { x: offsets[name].x.get(), y: offsets[name].y.get() };
		start[name] = {
			x: before[name].left - after[name].left + drawn.x,
			y: before[name].top - after[name].top + drawn.y,
		};
		placed[name] = new DOMRect(
			after[name].left - drawn.x,
			after[name].top - drawn.y,
			after[name].width,
			after[name].height,
		);
		offsets[name].x.set(start[name].x);
		offsets[name].y.set(start[name].y);
	}
	return { start, placed };
}

export type Glide = {
	/** Leaves everything where it is drawn now. */
	readonly stop: () => void;
	/** true once everything has landed; false if stopped first. */
	readonly finished: Promise<boolean>;
};

/**
 * Glides the box's `u v w h` from where they are to `to`, every value on
 * one progress from 0 to 1 that `spec` drives from rest, so the box resizes
 * as it travels and never scales. The parts given ride the same progress
 * from their `start` offsets to 0 (one clock), or their own on `ownSpec`
 * (parts after the box). Snapped (`dpr`), the box keeps `to`'s pixel phase
 * and the offsets are whole device pixels.
 *
 * `start: "painted"` starts the clock on the frame after the next one,
 * one frame in: the next frame paints the change of form, the slowest of
 * the move (the new parts' first style, layout and paint), and a clock
 * already running would spend it, so the box would show its first frame
 * a fifth of its way along. `"tap"` starts it now, as Motion does.
 */
export function glide({
	card,
	to,
	spec,
	parts,
	dpr,
	start: clock = "tap",
}: {
	readonly card: CardValues;
	readonly to: Rect;
	readonly spec: Transition;
	readonly parts?: {
		readonly offsets: PartOffsets;
		readonly start: Places;
		readonly ownSpec?: Transition;
	};
	readonly dpr: number | null;
	readonly start?: "painted" | "tap";
}): Glide {
	for (const key of BOX) card[key].stop();
	const from: Rect = {
		u: card.u.get(),
		v: card.v.get(),
		w: card.w.get(),
		h: card.h.get(),
	};
	const drawBox = (p: number) => {
		const box = boxAt(from, to, p, dpr);
		for (const key of BOX) card[key].set(box[key]);
	};
	const drawParts = (p: number) => {
		if (!parts) return;
		for (const name of SHARED_PARTS) {
			const start = parts.start[name];
			const x = start.x * (1 - p);
			const y = start.y * (1 - p);
			parts.offsets[name].x.set(
				dpr === null ? x : snapLeft(x, start.x, dpr),
			);
			parts.offsets[name].y.set(
				dpr === null ? y : snapLeft(y, start.y, dpr),
			);
		}
	};
	const progress = motionValue(0);
	const partsProgress = parts?.ownSpec ? motionValue(0) : progress;
	const stops = [
		progress.on("change", drawBox),
		partsProgress.on("change", drawParts),
	];
	let stopped = false;
	const animations: AnimationPlaybackControls[] = [];
	const ownSpec = parts?.ownSpec;
	const begin = (elapsed: number) => {
		animations.push(
			animate(progress, 1, { ...spec, ...PROGRESS_REST, elapsed }),
		);
		if (partsProgress !== progress && ownSpec)
			animations.push(
				animate(partsProgress, 1, {
					...ownSpec,
					...PROGRESS_REST,
					elapsed,
				}),
			);
	};
	const started = new Promise<void>((resolve) => {
		if (clock === "tap") {
			begin(0);
			resolve();
			return;
		}
		motionFrame.postRender(() =>
			motionFrame.read(() => {
				if (stopped) return;
				begin(FRAME_MS);
				resolve();
			}),
		);
	});
	const finished = started
		.then(() =>
			Promise.all(animations.map((animation) => animation.finished)),
		)
		.then(() => {
			if (stopped) return false;
			for (const stop of stops) stop();
			for (const key of BOX) card[key].set(to[key]);
			drawParts(1);
			return true;
		});
	return {
		stop: () => {
			if (stopped) return;
			stopped = true;
			for (const stop of stops) stop();
			for (const animation of animations) animation.stop();
		},
		finished,
	};
}
