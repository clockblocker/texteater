import type { Point, Rect } from "./geometry";
import type { Frame } from "./layout";

/**
 * D's carry, pure, in the frame's logical px: a lifted Card trails the
 * hand freely in 2D with the spot it was lifted by kept under the hand,
 * at whatever scale it is drawn, either 1:1 or on a stiff spring. A
 * release puts it back; under reduced motion a move home of more than
 * `REDUCED_TWEEN_MAX_PX` dissolves instead of travelling.
 */

export const CARRY_FOLLOWS = ["1:1", "stiff"] as const;
export type CarryFollow = (typeof CARRY_FOLLOWS)[number];

/** Under reduced motion, a move of this many px or fewer may still tween; a longer one dissolves. */
export const REDUCED_TWEEN_MAX_PX = 24;

/** A Card's box as its values place it: scaled by `s` about its centre. */
export type Box = Rect & { readonly s: number };

/**
 * Where the hand holds the Card: its offset from the Card's centre, in
 * the Card's own px, before its scale, so it scales with the Card.
 */
export function grabOf(hand: Point, box: Box): Point {
	const s = box.s || 1;
	return {
		u: (hand.u - (box.u + box.w / 2)) / s,
		v: (hand.v - (box.v + box.h / 2)) / s,
	};
}

/**
 * Where the Card's box goes so that its grabbed spot, at scale `s`, is
 * under `hand`: as the lift grows the Card, it grows about the hand.
 */
export function boxUnder(
	hand: Point,
	grab: Point,
	size: { readonly w: number; readonly h: number },
	s: number,
): Point {
	return {
		u: hand.u - grab.u * s - size.w / 2,
		v: hand.v - grab.v * s - size.h / 2,
	};
}

/** One axis of a follow: where it is and how fast it goes, in px and px/s. */
export type Follow = { readonly x: number; readonly velocity: number };

/**
 * One step of a critically damped spring of `stiffness` (per s², mass 1)
 * toward `to`, `ms` long, solved exactly rather than integrated: it never
 * overshoots and stays stable however long a frame is.
 */
export function followStep(
	from: Follow,
	to: number,
	stiffness: number,
	ms: number,
): Follow {
	const t = Math.max(0, ms) / 1000;
	const w = Math.sqrt(Math.max(0, stiffness));
	const e = from.x - to;
	const c = from.velocity + w * e;
	const decay = Math.exp(-w * t);
	return {
		x: to + (e + c * t) * decay,
		velocity: (from.velocity - w * c * t) * decay,
	};
}

/**
 * The stand-in drop target, a Pane's inline-end edge: a strip down the
 * frame's inline-end side, a sixth of its width, kept between 120 and
 * 220 px, inset 16 px.
 */
export function padRect(frame: Frame): Rect {
	const inset = 16;
	const w = Math.min(220, Math.max(120, frame.w / 6));
	return {
		u: frame.w - inset - w,
		v: inset,
		w,
		h: Math.max(0, frame.h - 2 * inset),
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

/** How a reduced release takes the Card home from `from` to `to`: a short tween when it is near, a dissolve otherwise. */
export function reducedHomeOf(from: Point, to: Point): "tween" | "dissolve" {
	return Math.hypot(to.u - from.u, to.v - from.v) <= REDUCED_TWEEN_MAX_PX
		? "tween"
		: "dissolve";
}
