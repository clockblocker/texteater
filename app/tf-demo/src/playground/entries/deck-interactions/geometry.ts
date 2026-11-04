/**
 * The prototype's pure geometry, in logical coordinates: `u` runs along the
 * inline axis from the frame's inline-start edge, `v` down the block axis.
 * Only the Card's transform turns `u` into a physical x, so every rule here
 * reads the same in LTR and RTL.
 */

export type Point = { readonly u: number; readonly v: number };

export type Rect = {
	readonly u: number;
	readonly v: number;
	readonly w: number;
	readonly h: number;
};

/** Where a Card rests: its box, its rotation in degrees and its scale. */
export type Slot = Rect & { readonly r: number; readonly s: number };

/** How far ahead a release reads the hand: `project(v, 0.99)`. */
const PROJECTION_MS = 99;
/** A zone is left only this far past the line that entered it. */
export const HYSTERESIS_PX = 12;
/** How far past the Deck's resting box a drop still counts as back. */
export const FOOTPRINT_PAD_PX = 24;
/** The least travel a flick needs. */
const FLICK_TRAVEL_PX = 24;

export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function lerp(from: number, to: number, t: number): number {
	return from + (to - from) * t;
}

export function centre(rect: Rect): Point {
	return { u: rect.u + rect.w / 2, v: rect.v + rect.h / 2 };
}

export function inflate(rect: Rect, by: number): Rect {
	return {
		u: rect.u - by,
		v: rect.v - by,
		w: rect.w + 2 * by,
		h: rect.h + 2 * by,
	};
}

export function contains(rect: Rect, point: Point): boolean {
	return (
		point.u >= rect.u &&
		point.u <= rect.u + rect.w &&
		point.v >= rect.v &&
		point.v <= rect.v + rect.h
	);
}

/** The smallest box around `rects`, or null when there are none. */
export function union(rects: readonly Rect[]): Rect | null {
	if (rects.length === 0) return null;
	const u = Math.min(...rects.map((rect) => rect.u));
	const v = Math.min(...rects.map((rect) => rect.v));
	const right = Math.max(...rects.map((rect) => rect.u + rect.w));
	const bottom = Math.max(...rects.map((rect) => rect.v + rect.h));
	return { u, v, w: right - u, h: bottom - v };
}

/** How far `point` lies outside `rect`; 0 inside it. */
export function distanceToRect(rect: Rect, point: Point): number {
	const du = Math.max(rect.u - point.u, 0, point.u - (rect.u + rect.w));
	const dv = Math.max(rect.v - point.v, 0, point.v - (rect.v + rect.h));
	return Math.hypot(du, dv);
}

/** Where the hand is headed: the point plus its velocity over `ms`. */
export function project(
	point: Point,
	velocity: Point,
	ms = PROJECTION_MS,
): Point {
	return { u: point.u + velocity.u * ms, v: point.v + velocity.v * ms };
}

export function magnitude(point: Point): number {
	return Math.hypot(point.u, point.v);
}

/** Which axis leads, and by how much: the main axis must dominate. */
export function dominantAxis(point: Point): "inline" | "block" {
	return Math.abs(point.u) >= Math.abs(point.v) ? "inline" : "block";
}

export type Flick = {
	readonly axis: "inline" | "block";
	readonly sign: 1 | -1;
	readonly speed: number;
};

/**
 * A flick: fast enough, far enough, and along one axis. The main axis must
 * carry at least 1.5 times the cross axis's speed.
 */
export function flickOf({
	travel,
	velocity,
	minSpeed,
}: {
	readonly travel: Point;
	readonly velocity: Point;
	readonly minSpeed: number;
}): Flick | null {
	const speed = magnitude(velocity);
	if (speed < minSpeed || magnitude(travel) < FLICK_TRAVEL_PX) return null;
	const axis = dominantAxis(velocity);
	const main = axis === "inline" ? velocity.u : velocity.v;
	const cross = axis === "inline" ? velocity.v : velocity.u;
	if (Math.abs(main) < 1.5 * Math.abs(cross)) return null;
	return { axis, sign: main < 0 ? -1 : 1, speed };
}

/** A unit vector along a flick, in logical coordinates. */
export function flickVector(flick: Flick): Point {
	return flick.axis === "inline"
		? { u: flick.sign, v: 0 }
		: { u: 0, v: flick.sign };
}

/** `point` scaled to length 1; straight down when it has none. */
export function unit(point: Point): Point {
	const length = magnitude(point);
	return length === 0
		? { u: 0, v: 1 }
		: { u: point.u / length, v: point.v / length };
}

/**
 * Whether a Card is coming home: inside the footprint and moving toward its
 * middle, so a fast release onto the Deck never reads as a throw.
 */
export function returning(
	footprint: Rect,
	point: Point,
	velocity: Point,
): boolean {
	if (!contains(footprint, point)) return false;
	const middle = centre(footprint);
	const away = { u: point.u - middle.u, v: point.v - middle.v };
	return away.u * velocity.u + away.v * velocity.v < 0;
}

/**
 * The Card's lean: a share of its offset plus a share of its speed, each
 * clamped, and turned over when it hangs from a grab in its bottom half.
 * Physical: `dx` and `vx` are screen x, so it leans the same way in RTL.
 */
export function tiltOf({
	dx,
	vx,
	perPx,
	max,
	velocityGain,
	velocityMax,
	hinge,
}: {
	readonly dx: number;
	readonly vx: number;
	readonly perPx: number;
	readonly max: number;
	readonly velocityGain: number;
	readonly velocityMax: number;
	readonly hinge: boolean;
}): number {
	const lean =
		clamp(dx * perPx, -max, max) +
		clamp(vx * velocityGain, -velocityMax, velocityMax);
	return hinge ? -lean : lean;
}

/** iOS's rubber band: the further past, the less each pixel moves it. */
export function rubberBand(offset: number, limit: number): number {
	if (limit <= 0) return 0;
	const sign = offset < 0 ? -1 : 1;
	const past = Math.abs(offset);
	return sign * limit * (1 - 1 / ((past * 0.55) / limit + 1));
}

/**
 * A detent felt under the hand: within `band` px either side of `detent`,
 * each pixel moves the Card `1 - resistance` px; elsewhere 1:1.
 */
export function detentOffset(
	offset: number,
	detent: number,
	resistance: number,
	band = 16,
): number {
	const sign = offset < 0 ? -1 : 1;
	const past = Math.abs(offset);
	const start = Math.max(0, detent - band);
	const end = detent + band;
	const give = 1 - resistance;
	if (past <= start) return offset;
	if (past <= end) return sign * (start + (past - start) * give);
	return sign * (start + (end - start) * give + (past - end));
}

/** A point on the quadratic arc from `from` to `to`, `height` px above. */
export function arcPoint(
	from: Point,
	to: Point,
	height: number,
	t: number,
): Point {
	const control = {
		u: (from.u + to.u) / 2,
		v: Math.min(from.v, to.v) - height,
	};
	const a = (1 - t) * (1 - t);
	const b = 2 * (1 - t) * t;
	const c = t * t;
	return {
		u: a * from.u + b * control.u + c * to.u,
		v: a * from.v + b * control.v + c * to.v,
	};
}

/** Rotates `point` by `degrees` around `pivot`. */
export function rotateAround(
	point: Point,
	pivot: Point,
	degrees: number,
): Point {
	const radians = (degrees * Math.PI) / 180;
	const du = point.u - pivot.u;
	const dv = point.v - pivot.v;
	return {
		u: pivot.u + du * Math.cos(radians) - dv * Math.sin(radians),
		v: pivot.v + du * Math.sin(radians) + dv * Math.cos(radians),
	};
}
