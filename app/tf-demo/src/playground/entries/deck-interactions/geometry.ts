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

/** A slot's box as drawn: scaled about its centre, as its Card is. */
export function drawn(slot: Slot): Rect {
	const w = slot.w * slot.s;
	const h = slot.h * slot.s;
	return { u: slot.u - (w - slot.w) / 2, v: slot.v - (h - slot.h) / 2, w, h };
}

/**
 * How fast a straight move from `from` to `to` starts, as a share of the
 * way per second: the part of `velocity` (px/s) that runs along the line
 * toward `to`. None of it carries across the line, and none away from `to`.
 */
export function approachRate(from: Point, to: Point, velocity: Point): number {
	const way = { u: to.u - from.u, v: to.v - from.v };
	const squared = way.u * way.u + way.v * way.v;
	if (squared < 0.25) return 0;
	return Math.max(0, (velocity.u * way.u + velocity.v * way.v) / squared);
}
