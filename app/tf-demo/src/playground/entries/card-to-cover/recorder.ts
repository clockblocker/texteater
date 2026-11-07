import { useSyncExternalStore } from "react";
import type { Box, TrackFrame } from "./track";

/** A rect Motion measured for a part, in the box, the moment it measured it. */
type Measured = {
	readonly part: string;
	readonly t: number;
	readonly box: Box;
};

/** One open or close, sampled every animation frame. */
export type Track = {
	readonly kind: "open" | "close";
	readonly id: string;
	readonly rtl: boolean;
	readonly frames: readonly TrackFrame[];
	readonly measured: readonly Measured[];
};

/** Motion's page box: an interval per axis. */
type AxisBox = {
	readonly x: { readonly min: number; readonly max: number };
	readonly y: { readonly min: number; readonly max: number };
};

/** Frames in a row with nothing moving before a recording stops. */
const STILL_FRAMES = 15;
const STILL_PX = 0.05;
const CAP_MS = 8000;

/** The frame's padding box: where `insetInlineStart: 0; top: 0` puts a Card. */
function innerRect(frame: Element) {
	const rect = frame.getBoundingClientRect();
	const style = getComputedStyle(frame);
	const left = rect.left + Number.parseFloat(style.borderLeftWidth);
	const right = rect.right - Number.parseFloat(style.borderRightWidth);
	const top = rect.top + Number.parseFloat(style.borderTopWidth);
	return { left, right, top };
}

/** The scale an element's computed transform carries along x. */
function scaleOf(element: Element): number {
	const transform = getComputedStyle(element).transform;
	if (!transform || transform === "none") return 1;
	const matrix = new DOMMatrixReadOnly(transform);
	return Math.hypot(matrix.a, matrix.b);
}

function sample(
	box: HTMLElement,
	frame: Element,
	rtl: boolean,
	t: number,
): TrackFrame {
	const outer = innerRect(frame);
	const rect = box.getBoundingClientRect();
	const parts: Record<string, Box> = {};
	for (const node of box.querySelectorAll<HTMLElement>("[data-part]")) {
		const part = node.getBoundingClientRect();
		const name = node.dataset.part;
		if (!name) continue;
		parts[name] = {
			x: rtl ? rect.right - part.right : part.left - rect.left,
			y: part.top - rect.top,
			w: part.width,
			h: part.height,
		};
	}
	return {
		t,
		box: {
			x: rtl ? outer.right - rect.right : rect.left - outer.left,
			y: rect.top - outer.top,
			w: box.offsetWidth,
			h: box.offsetHeight,
			scale: scaleOf(box),
			opacity: Number(getComputedStyle(box).opacity),
		},
		parts,
	};
}

function still(a: TrackFrame, b: TrackFrame): boolean {
	const near = (p: Box, q: Box | undefined) =>
		q !== undefined &&
		Math.abs(p.x - q.x) < STILL_PX &&
		Math.abs(p.y - q.y) < STILL_PX &&
		Math.abs(p.w - q.w) < STILL_PX &&
		Math.abs(p.h - q.h) < STILL_PX;
	return (
		near(a.box, b.box) &&
		Object.entries(a.parts).every(([name, part]) =>
			near(part, b.parts[name]),
		)
	);
}

/**
 * Samples the open box and its parts every animation frame from a tap until
 * everything has been still for 15 frames, and keeps the last recording
 * for the inspector. Motion's own measurements of the parts are kept with
 * it, in the same box coordinates.
 */
export function createRecorder() {
	let last: Track | null = null;
	let live: {
		readonly kind: Track["kind"];
		readonly id: string;
		readonly rtl: boolean;
		readonly frame: Element;
		readonly start: number;
		readonly frames: TrackFrame[];
		readonly measured: Measured[];
		readonly minMs: number;
		handle: number;
	} | null = null;
	const listeners = new Set<() => void>();

	const finish = () => {
		if (!live) return;
		cancelAnimationFrame(live.handle);
		last = {
			kind: live.kind,
			id: live.id,
			rtl: live.rtl,
			frames: live.frames,
			measured: live.measured,
		};
		live = null;
		for (const listener of listeners) listener();
	};

	return {
		get: () => last,
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		/**
		 * Starts recording `id`'s box; one still for `minMs` (the move's
		 * planned length) has not finished yet.
		 */
		start(options: {
			readonly kind: Track["kind"];
			readonly id: string;
			readonly rtl: boolean;
			readonly frame: Element;
			readonly minMs: number;
		}) {
			finish();
			const recording = {
				...options,
				start: performance.now(),
				frames: [] as TrackFrame[],
				measured: [] as Measured[],
				handle: 0,
			};
			live = recording;
			let stillFor = 0;
			const tick = (now: number) => {
				if (live !== recording) return;
				const box = recording.frame.querySelector<HTMLElement>(
					`[data-card-id="${recording.id}"]`,
				);
				if (!box) return finish();
				const frame = sample(
					box,
					recording.frame,
					recording.rtl,
					now - recording.start,
				);
				const previous = recording.frames.at(-1);
				stillFor =
					previous && still(previous, frame) ? stillFor + 1 : 0;
				recording.frames.push(frame);
				if (
					(frame.t > recording.minMs && stillFor >= STILL_FRAMES) ||
					frame.t > CAP_MS
				)
					return finish();
				recording.handle = requestAnimationFrame(tick);
			};
			recording.handle = requestAnimationFrame(tick);
		},
		/** What Motion measured for `part` (`onLayoutMeasure`), page px. */
		measured(part: string, box: AxisBox) {
			if (!live) return;
			const outer = innerRect(live.frame);
			live.measured.push({
				part,
				t: performance.now() - live.start,
				box: {
					x: live.rtl
						? outer.right - box.x.max
						: box.x.min - outer.left,
					y: box.y.min - outer.top,
					w: box.x.max - box.x.min,
					h: box.y.max - box.y.min,
				},
			});
		},
	};
}

export type Recorder = ReturnType<typeof createRecorder>;

export function useLastTrack(recorder: Recorder): Track | null {
	return useSyncExternalStore(recorder.subscribe, recorder.get);
}
