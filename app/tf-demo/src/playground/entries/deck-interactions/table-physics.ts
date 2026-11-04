/**
 * B's pure carry physics, in logical px: which target the hand is over,
 * how hard it pulls, where a Card hangs from the hand at a given scale,
 * and the upward kick that makes a return spring arc.
 */
import type { Target } from "./decide";
import {
	clamp,
	distanceToRect,
	HYSTERESIS_PX,
	type Point,
	type Rect,
} from "./geometry";

/** Hermite smoothstep: 0 at the edge of the reach, 1 at its middle. */
function smooth(t: number): number {
	const k = clamp(t, 0, 1);
	return k * k * (3 - 2 * k);
}

/** A tray strip taller than it is wide stands at inline-start; a wide one lies along the foot. */
export function stripEdge(strip: Rect): "start" | "bottom" {
	return strip.h > strip.w ? "start" : "bottom";
}

/** The way a Deck dropped into `strip` leaves: through the frame edge the strip lies on. */
export function stripExit(strip: Rect): Point {
	return stripEdge(strip) === "start" ? { u: -1, v: 0 } : { u: 0, v: 1 };
}

/** The point on a strip's long middle line nearest `point`: a strip pulls across, never along. */
function stripAnchor(strip: Rect, point: Point): Point {
	const half = Math.min(strip.w, strip.h) / 2;
	return {
		u: clamp(point.u, strip.u + half, strip.u + strip.w - half),
		v: clamp(point.v, strip.v + half, strip.v + strip.h - half),
	};
}

export type Live = {
	readonly target: Target | null;
	/** Where the hand is drawn to, in the hand's own coordinates. */
	readonly anchor: Point | null;
	/** 0 at the edge of the reach, 1 over the target. */
	readonly closeness: number;
	/** The tray strip the hand is over, when the target is the tray. */
	readonly strip: Rect | null;
};

const NONE: Live = { target: null, anchor: null, closeness: 0, strip: null };

/**
 * The one target the hand is over, or none. The slot is a circle of
 * `slotReach` around home, and only once the hand has left it: a Card
 * just lifted is not pulled back into the place it came from. The tray
 * and the pad reach `radius` past their edges. The target already lit keeps
 * 12 px more reach, so the highlight never flickers on its edge.
 */
export function liveTarget({
	point,
	home,
	tray,
	pad,
	radius,
	slotReach,
	previous,
	slotArmed,
}: {
	readonly point: Point;
	readonly home: Point | null;
	readonly tray: readonly Rect[];
	readonly pad: Rect;
	readonly radius: number;
	readonly slotReach: number;
	readonly previous: Target | null;
	readonly slotArmed: boolean;
}): Live {
	const reach = (target: Target) =>
		(target === "slot" ? slotReach : radius) +
		(target === previous ? HYSTERESIS_PX : 0);
	let best = NONE;
	let bestDistance = Number.POSITIVE_INFINITY;
	const consider = (
		target: Target,
		distance: number,
		anchor: Point,
		strip: Rect | null,
		closeness: number,
	) => {
		if (distance > reach(target) || distance >= bestDistance) return;
		bestDistance = distance;
		best = { target, anchor, closeness, strip };
	};
	if (home && slotArmed) {
		const distance = Math.hypot(point.u - home.u, point.v - home.v);
		consider(
			"slot",
			distance,
			home,
			null,
			smooth(1 - distance / slotReach),
		);
	}
	for (const strip of tray) {
		const distance = distanceToRect(strip, point);
		consider(
			"tray",
			distance,
			stripAnchor(strip, point),
			strip,
			smooth(1 - distance / radius),
		);
	}
	const padDistance = distanceToRect(pad, point);
	consider(
		"pad",
		padDistance,
		{ u: pad.u + pad.w / 2, v: pad.v + pad.h / 2 },
		null,
		smooth(1 - padDistance / radius),
	);
	return best;
}

/** The hand drawn toward its target's anchor: `strength` over the target, fading to 0 at the reach. */
export function pulled(point: Point, live: Live, strength: number): Point {
	if (!live.anchor) return point;
	const k = strength * live.closeness;
	return {
		u: point.u + (live.anchor.u - point.u) * k,
		v: point.v + (live.anchor.v - point.v) * k,
	};
}

/**
 * Where a Card's box goes so the spot it was grabbed by stays under the
 * hand as it scales about its middle. `grab` is that spot's offset from
 * the box corner at `pressScale`; `size` is the box's unscaled size.
 */
export function boxUnderHand({
	point,
	grab,
	size,
	pressScale,
	scale,
}: {
	readonly point: Point;
	readonly grab: Point;
	readonly size: { readonly w: number; readonly h: number };
	readonly pressScale: number;
	readonly scale: number;
}): Point {
	const k = scale / pressScale;
	return {
		u: point.u - size.w / 2 - (grab.u - size.w / 2) * k,
		v: point.v - size.h / 2 - (grab.v - size.h / 2) * k,
	};
}

/** The inverse of `boxUnderHand`: where the hand is when the box is at `box`. */
export function handOverBox({
	box,
	grab,
	size,
	pressScale,
	scale,
}: {
	readonly box: Point;
	readonly grab: Point;
	readonly size: { readonly w: number; readonly h: number };
	readonly pressScale: number;
	readonly scale: number;
}): Point {
	const k = scale / pressScale;
	return {
		u: box.u + size.w / 2 + (grab.u - size.w / 2) * k,
		v: box.v + size.h / 2 + (grab.v - size.h / 2) * k,
	};
}

/** The lowest point a critically damped spring reaches from `x0` px at `v0` px/s. */
function lowest(x0: number, v0: number, omega: number): number {
	const b = v0 + omega * x0;
	if (b >= 0) return Math.min(x0, 0);
	const at = 1 / omega - x0 / b;
	if (at <= 0) return Math.min(x0, 0);
	return Math.min(x0, 0, (b / omega) * Math.exp(-omega * at));
}

/**
 * The block-axis velocity (px/s, up is negative) that makes a critically
 * damped spring of `stiffness` rise `height` px above the higher of its
 * start and its target before it settles, as a Card tossed back onto the
 * Deck does. A hand already throwing it higher keeps its own velocity.
 */
export function hopVelocity({
	from,
	to,
	height,
	stiffness,
	hand,
}: {
	readonly from: number;
	readonly to: number;
	readonly height: number;
	readonly stiffness: number;
	/** The hand's block velocity at release, px/s. */
	readonly hand: number;
}): number {
	const x0 = from - to;
	if (height <= 0) return hand;
	const omega = Math.sqrt(stiffness);
	const goal = Math.min(x0, 0) - height;
	if (lowest(x0, hand, omega) <= goal) return hand;
	let low = -100_000;
	let high = Math.min(hand, 0);
	for (let step = 0; step < 40; step++) {
		const middle = (low + high) / 2;
		if (lowest(x0, middle, omega) <= goal) low = middle;
		else high = middle;
	}
	return low;
}
