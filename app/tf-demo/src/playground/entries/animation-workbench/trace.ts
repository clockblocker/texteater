/**
 * A frame trace: what every watched element of a specimen measured, frame
 * by frame, around one interaction. The sampler (`use-trace.ts`) reads the
 * DOM; everything here is arithmetic on what it read, so the cut between
 * recordings, the pre-roll and the summary numbers are testable without a
 * browser.
 *
 * Time in a `Recording` is milliseconds from its origin: the input event
 * that started it, or, for motion no input announced, the last still
 * frame before it. Channel keys are `<element>:<property>`; the property
 * decides how big a change counts as movement.
 */

export type Marker = {
	readonly t: number;
	readonly label: string;
};

export type Frame = {
	readonly t: number;
	/** Only the channels that existed this frame. */
	readonly values: Readonly<Record<string, number>>;
};

export type Recording = {
	readonly frames: readonly Frame[];
	readonly markers: readonly Marker[];
};

/** Idle frames kept ahead of a recording, so a motion already under way is seen starting. */
export const PREROLL_MS = 120;
/** Stillness, with no input, that ends a recording. */
export const QUIET_MS = 300;
/** Stillness kept after the last event, so the settle is on the record. */
export const TAIL_MS = 120;
/** A recording never runs longer than this: a held drag is cut here. */
export const MAX_MS = 10_000;
/** Recordings kept per specimen, newest last. */
export const KEEP = 8;

const GEOMETRY_EPSILON = 0.5;
const OPACITY_EPSILON = 0.005;

export function propertyOf(key: string): string {
	return key.slice(key.lastIndexOf(":") + 1);
}

/** The smallest change of a channel that is movement, not noise. */
export function epsilonFor(key: string): number {
	return propertyOf(key) === "opacity" ? OPACITY_EPSILON : GEOMETRY_EPSILON;
}

/** Whether anything watched moved, appeared or left between two frames. */
export function moved(previous: Frame | undefined, frame: Frame): boolean {
	if (!previous) return false;
	for (const key of Object.keys(frame.values)) {
		const before = previous.values[key];
		if (before === undefined) return true;
		if (Math.abs((frame.values[key] ?? 0) - before) > epsilonFor(key))
			return true;
	}
	for (const key of Object.keys(previous.values))
		if (!(key in frame.values)) return true;
	return false;
}

type Open = {
	readonly origin: number;
	readonly frames: readonly Frame[];
	readonly markers: readonly Marker[];
	readonly lastEvent: number;
};

export type RecorderState = {
	/** The trailing idle frames, absolute time; becomes the pre-roll. */
	readonly preroll: readonly Frame[];
	readonly open: Open | null;
	readonly done: readonly Recording[];
};

export const IDLE: RecorderState = { preroll: [], open: null, done: [] };

function rebase(frames: readonly Frame[], origin: number): Frame[] {
	return frames.map((frame) => ({ ...frame, t: frame.t - origin }));
}

function close(open: Open): Recording {
	const end = open.lastEvent + TAIL_MS;
	const kept = open.frames.filter((frame) => frame.t <= end);
	/* the frame that crossed the tail keeps the trace from ending short */
	const frames =
		kept.length < open.frames.length
			? [...kept, open.frames[kept.length] as Frame]
			: kept;
	return {
		frames: rebase(frames, open.origin),
		markers: open.markers.map((marker) => ({
			...marker,
			t: marker.t - open.origin,
		})),
	};
}

/**
 * One frame in, absolute time, with the input events that arrived since
 * the previous one. Returns the new state; a recording that this frame
 * finished is the last of `done`.
 */
export function feed(
	state: RecorderState,
	frame: Frame,
	markers: readonly Marker[] = [],
): RecorderState {
	if (state.open) {
		const active = markers.length > 0 || moved(state.open.frames.at(-1), frame);
		const open: Open = {
			...state.open,
			frames: [...state.open.frames, frame],
			markers: [...state.open.markers, ...markers],
			lastEvent: active ? frame.t : state.open.lastEvent,
		};
		const quiet = frame.t - open.lastEvent >= QUIET_MS;
		const long = frame.t - open.origin >= MAX_MS;
		if (!quiet && !long) return { ...state, open };
		return {
			preroll: [],
			open: null,
			done: [...state.done, close(open)].slice(-KEEP),
		};
	}
	const previous = state.preroll.at(-1);
	const active = markers.length > 0 || moved(previous, frame);
	if (!active) {
		const preroll = [...state.preroll, frame].filter(
			(kept) => frame.t - kept.t <= PREROLL_MS,
		);
		return { ...state, preroll };
	}
	const origin = markers[0]?.t ?? previous?.t ?? frame.t;
	return {
		preroll: [],
		open: {
			origin,
			frames: [...state.preroll, frame],
			markers: [...markers],
			lastEvent: frame.t,
		},
		done: state.done,
	};
}

export type ChannelSummary = {
	readonly key: string;
	readonly element: string;
	readonly property: string;
	/** When the element was first seen, if not from the first frame. */
	readonly appears: number | null;
	/** When the element was last seen, if it left before the end. */
	readonly leaves: number | null;
	/** The first frame that differs from the value at appearance. */
	readonly starts: number | null;
	/** The first frame from which the channel stays at its final value. */
	readonly settles: number | null;
	readonly from: number;
	readonly to: number;
	readonly min: number;
	readonly max: number;
	readonly points: readonly (readonly [number, number])[];
};

/** Every channel that moved, appeared or left, in first-event order. */
export function summarize(recording: Recording): ChannelSummary[] {
	const keys = new Set<string>();
	for (const frame of recording.frames)
		for (const key of Object.keys(frame.values)) keys.add(key);
	const first = recording.frames[0];
	const last = recording.frames.at(-1);
	const summaries: ChannelSummary[] = [];
	for (const key of keys) {
		const points = recording.frames.flatMap((frame) => {
			const value = frame.values[key];
			return value === undefined ? [] : [[frame.t, value] as const];
		});
		const head = points[0];
		const tail = points.at(-1);
		if (!head || !tail) continue;
		const epsilon = epsilonFor(key);
		const from = head[1];
		const to = tail[1];
		const starts =
			points.find(([, value]) => Math.abs(value - from) > epsilon)?.[0] ??
			null;
		let settles: number | null = null;
		for (let index = points.length - 1; index >= 0; index--) {
			const point = points[index] as readonly [number, number];
			if (Math.abs(point[1] - to) > epsilon) break;
			settles = point[0];
		}
		const appears = first && head[0] === first.t ? null : head[0];
		const leaves = last && tail[0] === last.t ? null : tail[0];
		if (starts === null && appears === null && leaves === null) continue;
		const values = points.map(([, value]) => value);
		const at = key.lastIndexOf(":");
		summaries.push({
			key,
			element: key.slice(0, at),
			property: key.slice(at + 1),
			appears,
			leaves,
			starts,
			settles: starts === null ? null : settles,
			from,
			to,
			min: Math.min(...values),
			max: Math.max(...values),
			points,
		});
	}
	const firstEvent = (summary: ChannelSummary) =>
		Math.min(
			summary.appears ?? Number.POSITIVE_INFINITY,
			summary.starts ?? Number.POSITIVE_INFINITY,
			summary.leaves ?? Number.POSITIVE_INFINITY,
		);
	return summaries.sort(
		(a, b) => firstEvent(a) - firstEvent(b) || a.key.localeCompare(b.key),
	);
}

export function durationOf(recording: Recording): number {
	const first = recording.frames[0];
	const last = recording.frames.at(-1);
	return first && last ? last.t - first.t : 0;
}

/** Mean frame interval; the sampler's own cadence, not the animation's. */
export function frameIntervalOf(recording: Recording): number | null {
	const count = recording.frames.length;
	return count < 2 ? null : durationOf(recording) / (count - 1);
}
