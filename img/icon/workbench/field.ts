/**
 * Signed distance fields: draw a shape as a function, then trace it to SVG.
 *
 * A Field is negative inside its shape and positive outside. For the
 * primitives its magnitude is the distance to the edge, so shapes can be
 * grown, blended, outlined and wobbled before `contour` (`trace.ts`)
 * traces them into path data. `biteOut` works the other way round: given
 * the silhouette that must survive, it finds circular bites that eat the
 * page down to it.
 *
 * Coordinates are canvas pixels (0–SIZE); angles are degrees, clockwise,
 * like SVG.
 */
import { type Circle, SIZE } from "./kit";
import { pathPoints } from "./svg-path";

export type Field = (x: number, y: number) => number;

export type Point = readonly [x: number, y: number];

// ── Primitives ────────────────────────────────────────────────────────────

export function circle(cx: number, cy: number, r: number): Field {
	return (x, y) => Math.hypot(x - cx, y - cy) - r;
}

/** Union of plain circles, such as bites. */
export function circles(list: readonly Circle[]): Field {
	return union(...list.map(({ cx, cy, r }) => circle(cx, cy, r)));
}

/** Ellipse centred on (cx, cy), rotated by `angle`. Distance is approximate. */
export function ellipse(
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	angle = 0,
): Field {
	const local = toLocal(cx, cy, angle);
	return (x, y) => {
		const [px, py] = local(x, y);
		const k0 = Math.hypot(px / rx, py / ry);
		const k1 = Math.hypot(px / (rx * rx), py / (ry * ry));
		return k1 === 0 ? -Math.min(rx, ry) : (k0 * (k0 - 1)) / k1;
	};
}

/** Axis-aligned box from its top-left corner, with rounded corners. */
export function box(
	x: number,
	y: number,
	w: number,
	h: number,
	radius = 0,
): Field {
	const hx = w / 2;
	const hy = h / 2;
	const cx = x + hx;
	const cy = y + hy;
	return (px, py) => {
		const qx = Math.abs(px - cx) - hx + radius;
		const qy = Math.abs(py - cy) - hy + radius;
		return (
			Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
			Math.min(Math.max(qx, qy), 0) -
			radius
		);
	};
}

/**
 * A stroke from a to b, radius `ra` at a and `rb` at b: a capsule, or a
 * tapering limb, tail, ear or antler tine when the radii differ.
 */
export function capsule(
	ax: number,
	ay: number,
	bx: number,
	by: number,
	ra: number,
	rb = ra,
): Field {
	const length = Math.hypot(bx - ax, by - ay);
	if (length <= Math.abs(ra - rb))
		return union(circle(ax, ay, ra), circle(bx, by, rb));
	const ux = (bx - ax) / length;
	const uy = (by - ay) / length;
	const slope = (ra - rb) / length;
	const rise = Math.sqrt(1 - slope * slope);
	return (x, y) => {
		const dx = x - ax;
		const dy = y - ay;
		const along = dx * ux + dy * uy;
		const across = Math.abs(dx * uy - dy * ux);
		const k = -slope * across + rise * along;
		if (k < 0) return Math.hypot(across, along) - ra;
		if (k > rise * length) return Math.hypot(across, along - length) - rb;
		return across * rise + along * slope - ra;
	};
}

/** Closed polygon through `points` (any winding). */
export function polygon(points: readonly Point[]): Field {
	const count = points.length;
	return (x, y) => {
		let nearest = (x - points[0][0]) ** 2 + (y - points[0][1]) ** 2;
		let sign = 1;
		for (let i = 0, j = count - 1; i < count; j = i, i++) {
			const [ix, iy] = points[i];
			const [jx, jy] = points[j];
			const ex = jx - ix;
			const ey = jy - iy;
			const wx = x - ix;
			const wy = y - iy;
			const t = Math.min(
				1,
				Math.max(0, (wx * ex + wy * ey) / (ex * ex + ey * ey || 1)),
			);
			nearest = Math.min(
				nearest,
				(wx - ex * t) ** 2 + (wy - ey * t) ** 2,
			);
			const above = y >= iy;
			const below = y < jy;
			const left = ex * wy > ey * wx;
			if ((above && below && left) || (!above && !below && !left))
				sign = -sign;
		}
		return sign * Math.sqrt(nearest);
	};
}

/**
 * The filled area of SVG path data (absolute or relative M L H V C S Q T A
 * Z). Subpaths combine even-odd, like `fill-rule="evenodd"`, so a subpath
 * inside another cuts a hole.
 */
export function path(d: string, tolerance = 0.25): Field {
	const shapes = pathPoints(d, tolerance).map(polygon);
	return (x, y) => {
		let nearest = Number.POSITIVE_INFINITY;
		let insideCount = 0;
		for (const shape of shapes) {
			const distance = shape(x, y);
			if (distance < 0) insideCount++;
			nearest = Math.min(nearest, Math.abs(distance));
		}
		return insideCount % 2 ? -nearest : nearest;
	};
}

/**
 * A bite with tooth marks: a disc whose rim is scalloped by `teeth` small
 * scoops, like the edge left in a biscuit. `from`/`to` (degrees) limit the
 * teeth to the part of the rim that shows.
 */
export function toothedBite({
	cx,
	cy,
	r,
	teeth = 9,
	depth = r * 0.07,
	from = 0,
	to = 360,
}: Circle & {
	teeth?: number;
	/** How far each scoop reaches past the rim. */
	depth?: number;
	from?: number;
	to?: number;
}): Field {
	const span = (((to - from) % 360) + 360) % 360 || 360;
	const whole = span === 360;
	const scoops: Field[] = [];
	const chord =
		((span / (whole ? teeth : teeth - 1 || 1)) * Math.PI * r) / 180;
	const scoopRadius = Math.max(depth, chord * 0.62);
	for (let index = 0; index < teeth; index++) {
		const share = whole ? index / teeth : index / (teeth - 1 || 1);
		const angle = ((from + share * span) * Math.PI) / 180;
		const reach = r + depth - scoopRadius;
		scoops.push(
			circle(
				cx + reach * Math.cos(angle),
				cy + reach * Math.sin(angle),
				scoopRadius,
			),
		);
	}
	return union(circle(cx, cy, r), ...scoops);
}

// ── Combining ─────────────────────────────────────────────────────────────

export function union(...fields: readonly Field[]): Field {
	return (x, y) => {
		let d = Number.POSITIVE_INFINITY;
		for (const field of fields) d = Math.min(d, field(x, y));
		return d;
	};
}

export function intersect(...fields: readonly Field[]): Field {
	return (x, y) => {
		let d = Number.NEGATIVE_INFINITY;
		for (const field of fields) d = Math.max(d, field(x, y));
		return d;
	};
}

/** `base` with every cut removed: what a bite leaves. */
export function subtract(base: Field, ...cuts: readonly Field[]): Field {
	return (x, y) => {
		let d = base(x, y);
		for (const cut of cuts) d = Math.max(d, -cut(x, y));
		return d;
	};
}

function smoothMin(a: number, b: number, k: number): number {
	const h = Math.max(k - Math.abs(a - b), 0) / k;
	return Math.min(a, b) - (h * h * k) / 4;
}

/** Union with seams rounded over about `k` px, for organic bodies. */
export function smoothUnion(k: number, ...fields: readonly Field[]): Field {
	return (x, y) => {
		let d = fields[0](x, y);
		for (let i = 1; i < fields.length; i++)
			d = smoothMin(d, fields[i](x, y), k);
		return d;
	};
}

/** Subtraction with the cut's corners rounded over about `k` px. */
export function smoothSubtract(
	k: number,
	base: Field,
	...cuts: readonly Field[]
): Field {
	return (x, y) => {
		let d = base(x, y);
		for (const cut of cuts) d = -smoothMin(-d, cut(x, y), k);
		return d;
	};
}

export function smoothIntersect(k: number, ...fields: readonly Field[]): Field {
	return (x, y) => {
		let d = fields[0](x, y);
		for (let i = 1; i < fields.length; i++)
			d = -smoothMin(-d, -fields[i](x, y), k);
		return d;
	};
}

/** Grows the shape by `by` px (shrinks when negative); also rounds corners. */
export function grow(field: Field, by: number): Field {
	return (x, y) => field(x, y) - by;
}

/** A band `width` px wide centred on the edge: an outline. */
export function band(field: Field, width: number): Field {
	return (x, y) => Math.abs(field(x, y)) - width / 2;
}

/** Moves, rotates (about `origin`) and scales a shape. */
export function transform(
	field: Field,
	{
		dx = 0,
		dy = 0,
		angle = 0,
		scale = 1,
		origin = [SIZE / 2, SIZE / 2],
	}: {
		dx?: number;
		dy?: number;
		angle?: number;
		scale?: number;
		origin?: Point;
	},
): Field {
	const local = toLocal(origin[0] + dx, origin[1] + dy, angle);
	return (x, y) => {
		const [px, py] = local(x, y);
		return field(origin[0] + px / scale, origin[1] + py / scale) * scale;
	};
}

/** Left–right mirror about the vertical line x = `axis`; draw the left half. */
export function mirror(field: Field, axis = SIZE / 2): Field {
	return (x, y) => field(axis - Math.abs(x - axis), y);
}

/** Rough, chewed or torn edges: displaces the edge by smooth noise. */
export function wobble(
	field: Field,
	{
		amplitude = 3,
		scale = 24,
		seed = 1,
	}: {
		/** Largest displacement in px. */
		amplitude?: number;
		/** Feature size in px. */
		scale?: number;
		seed?: number;
	} = {},
): Field {
	return (x, y) =>
		field(x, y) +
		amplitude *
			(0.7 * valueNoise(x / scale, y / scale, seed) +
				0.3 *
					valueNoise((2.1 * x) / scale, (2.1 * y) / scale, seed + 7));
}

// ── Measuring ─────────────────────────────────────────────────────────────

/** A point test for `kit.regions` and friends. */
export function inside(field: Field): (x: number, y: number) => boolean {
	return (x, y) => field(x, y) < 0;
}

/** Area (px²) of the shape inside the canvas. */
export function area(field: Field, step = 1): number {
	let count = 0;
	for (let y = step / 2; y < SIZE; y += step)
		for (let x = step / 2; x < SIZE; x += step)
			if (field(x, y) < 0) count++;
	return count * step * step;
}

// ── Eating ────────────────────────────────────────────────────────────────

/**
 * Circular bites that eat `page` down to `target`, biggest mouthful first.
 *
 * Every bite stays `gap` px clear of the target, so the target survives and
 * the bites' arcs become its outline. Page within `slack` px of the target
 * (crevices too tight for a `minRadius` bite) may survive; check the result
 * with `kit.regions` for detached crumbs. Bites may centre off the canvas.
 *
 * Bite sizes trust the target's distances: build it from primitives,
 * `union`, `subtract` and `grow`. `ellipse`, the smooth combinators and
 * `wobble` only approximate distance, so bites can graze such a target.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export function biteOut(
	target: Field,
	{
		page = box(0, 0, SIZE, SIZE),
		maxRadius = 170,
		minRadius = 24,
		gap = 0,
		slack = 4,
		limit = 40,
		step = 4,
		leftover = 0.002,
	}: {
		/** What there is to eat; defaults to the whole canvas. */
		page?: Field;
		maxRadius?: number;
		minRadius?: number;
		gap?: number;
		slack?: number;
		/** Most bites to take. */
		limit?: number;
		/** Sampling grid, px. */
		step?: number;
		/** Stop once less than this share of what must go is left. */
		leftover?: number;
	} = {},
): Circle[] {
	const columns = Math.ceil(SIZE / step);
	const due: number[] = [];
	for (let row = 0; row < columns; row++) {
		for (let column = 0; column < columns; column++) {
			const x = (column + 0.5) * step;
			const y = (row + 0.5) * step;
			if (page(x, y) < 0 && target(x, y) > gap + slack)
				due.push(row * columns + column);
		}
	}
	const eaten = new Uint8Array(columns * columns);
	const owed = new Uint8Array(columns * columns);
	for (const cell of due) owed[cell] = 1;

	const candidates: Circle[] = [];
	const spacing = step * 2;
	for (let y = -maxRadius / 2; y <= SIZE + maxRadius / 2; y += spacing) {
		for (let x = -maxRadius / 2; x <= SIZE + maxRadius / 2; x += spacing) {
			const r = Math.min(maxRadius, target(x, y) - gap);
			if (r >= minRadius) candidates.push({ cx: x, cy: y, r });
		}
	}
	const gain = ({ cx, cy, r }: Circle): number => {
		let count = 0;
		const top = Math.max(0, Math.floor((cy - r) / step));
		const bottom = Math.min(columns - 1, Math.ceil((cy + r) / step));
		for (let row = top; row <= bottom; row++) {
			const y = (row + 0.5) * step - cy;
			const half = Math.sqrt(Math.max(0, r * r - y * y));
			const left = Math.max(0, Math.ceil((cx - half) / step - 0.5));
			const right = Math.min(
				columns - 1,
				Math.floor((cx + half) / step - 0.5),
			);
			for (let column = left; column <= right; column++) {
				const cell = row * columns + column;
				if (owed[cell] && !eaten[cell]) count++;
			}
		}
		return count;
	};
	const mark = ({ cx, cy, r }: Circle) => {
		for (let row = 0; row < columns; row++) {
			const y = (row + 0.5) * step - cy;
			if (Math.abs(y) > r) continue;
			const half = Math.sqrt(r * r - y * y);
			const left = Math.max(0, Math.ceil((cx - half) / step - 0.5));
			const right = Math.min(
				columns - 1,
				Math.floor((cx + half) / step - 0.5),
			);
			for (let column = left; column <= right; column++)
				eaten[row * columns + column] = 1;
		}
	};

	// Lazy greedy: a stale gain only ever overestimates, so re-score the
	// leader until it stays ahead.
	let scores = candidates.map((candidate, index) => ({
		index,
		gain: gain(candidate),
	}));
	const bites: Circle[] = [];
	let remaining = due.length;
	while (bites.length < limit && remaining > due.length * leftover) {
		scores.sort((a, b) => b.gain - a.gain);
		let best = scores[0];
		while (best && best.gain > 0) {
			const fresh = gain(candidates[best.index]);
			if (fresh >= (scores[1]?.gain ?? 0)) {
				best = { index: best.index, gain: fresh };
				break;
			}
			scores[0] = { index: best.index, gain: fresh };
			scores.sort((a, b) => b.gain - a.gain);
			best = scores[0];
		}
		if (!best || best.gain === 0) break;
		const bite = candidates[best.index];
		bites.push(bite);
		mark(bite);
		remaining -= best.gain;
		scores = scores.filter(({ index }) => index !== best.index);
	}
	return bites;
}

// ── Internals ─────────────────────────────────────────────────────────────

function toLocal(
	cx: number,
	cy: number,
	angle: number,
): (x: number, y: number) => Point {
	const radians = (-angle * Math.PI) / 180;
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);
	return (x, y) => {
		const dx = x - cx;
		const dy = y - cy;
		return [dx * cos - dy * sin, dx * sin + dy * cos];
	};
}

function hash(x: number, y: number, seed: number): number {
	let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return (((h ^ (h >>> 16)) >>> 0) / 4294967295) * 2 - 1;
}

function valueNoise(x: number, y: number, seed: number): number {
	const x0 = Math.floor(x);
	const y0 = Math.floor(y);
	const fx = x - x0;
	const fy = y - y0;
	const sx = fx * fx * (3 - 2 * fx);
	const sy = fy * fy * (3 - 2 * fy);
	const top =
		hash(x0, y0, seed) + (hash(x0 + 1, y0, seed) - hash(x0, y0, seed)) * sx;
	const bottom =
		hash(x0, y0 + 1, seed) +
		(hash(x0 + 1, y0 + 1, seed) - hash(x0, y0 + 1, seed)) * sx;
	return top + (bottom - top) * sy;
}
