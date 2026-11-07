/** A point or a velocity in physical CSS px (px/s for a velocity). */
export type Point = { readonly x: number; readonly y: number };

/** A box in physical CSS px, from its top-left corner. */
export type Box = {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
};

/** The size of a Card, in rem. */
export type CardSize = { readonly w: number; readonly h: number };

/** A point in rem, logical: `u` runs inline (mirrored in RTL), `v` down. */
export type Logical = { readonly u: number; readonly v: number };

/** Where the hand is headed: `point` plus `velocity` (px/s) over `ms`. */
export function project(point: Point, velocity: Point, ms: number): Point {
	return {
		x: point.x + (velocity.x * ms) / 1000,
		y: point.y + (velocity.y * ms) / 1000,
	};
}

export function contains(box: Box, point: Point): boolean {
	return (
		point.x >= box.x &&
		point.x <= box.x + box.width &&
		point.y >= box.y &&
		point.y <= box.y + box.height
	);
}
