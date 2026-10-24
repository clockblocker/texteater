/**
 * Tracing a Field (`field.ts`) to SVG path data: its edge loops on a grid,
 * simplified, as straight or curved path segments.
 */
import type { Field, Point } from "./field";
import { itemAt, n, SIZE } from "./kit";

/**
 * SVG path data for the edge of `field`, traced on a `step` px grid. Parts
 * beyond the canvas are closed off just outside it. Loops come back
 * clockwise and counter-clockwise, so fill with `fill-rule="evenodd"`.
 */
export function contour(
	field: Field,
	{
		step = 1,
		tolerance = 0.3,
		smooth = true,
		corner = 50,
		margin = 4,
		digits = 1,
	}: {
		step?: number;
		/** Largest distance (px) simplification may move the edge. */
		tolerance?: number;
		/** Fit curves through the simplified points instead of lines. */
		smooth?: boolean;
		/** Turns sharper than this many degrees stay sharp when smoothing. */
		corner?: number;
		/** How far past the canvas the trace runs before closing off. */
		margin?: number;
		digits?: number;
	} = {},
): string {
	return loops(field, { step, margin })
		.map((loop) => simplifyLoop(loop, tolerance))
		.filter((loop) => loop.length >= 3)
		.map((loop) =>
			smooth ? curvePath(loop, corner, digits) : linePath(loop, digits),
		)
		.join("");
}

/** Closed edge loops of `field` as point lists (see `contour`). */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export function loops(
	field: Field,
	{ step = 1, margin = 4 }: { step?: number; margin?: number } = {},
): Point[][] {
	const origin = -margin;
	const columns = Math.ceil((SIZE + 2 * margin) / step) + 1;
	const rows = columns;
	const values = new Float64Array(columns * rows);
	for (let row = 0; row < rows; row++) {
		for (let column = 0; column < columns; column++) {
			let value = field(origin + column * step, origin + row * step);
			const border =
				row === 0 ||
				column === 0 ||
				row === rows - 1 ||
				column === columns - 1;
			if (border) value = Math.max(value, step);
			values[row * columns + column] = value === 0 ? 1e-9 : value;
		}
	}
	const at = (column: number, row: number) =>
		itemAt(values, row * columns + column);
	const horizontal = (column: number, row: number) =>
		(row * columns + column) * 2;
	const vertical = (column: number, row: number) =>
		(row * columns + column) * 2 + 1;

	const points = new Map<number, Point>();
	const crossing = (edge: number): number => {
		if (points.has(edge)) return edge;
		const cell = edge >> 1;
		const column = cell % columns;
		const row = (cell - column) / columns;
		const nextColumn = edge & 1 ? column : column + 1;
		const nextRow = edge & 1 ? row + 1 : row;
		const a = at(column, row);
		const b = at(nextColumn, nextRow);
		const t = a / (a - b);
		points.set(edge, [
			origin + (column + t * (nextColumn - column)) * step,
			origin + (row + t * (nextRow - row)) * step,
		]);
		return edge;
	};

	const links = new Map<number, number[]>();
	const link = (from: number, to: number) => {
		const a = crossing(from);
		const b = crossing(to);
		links.set(a, [...(links.get(a) ?? []), b]);
		links.set(b, [...(links.get(b) ?? []), a]);
	};

	for (let row = 0; row < rows - 1; row++) {
		for (let column = 0; column < columns - 1; column++) {
			const a = at(column, row);
			const b = at(column + 1, row);
			const c = at(column + 1, row + 1);
			const d = at(column, row + 1);
			const kind =
				(a < 0 ? 8 : 0) |
				(b < 0 ? 4 : 0) |
				(c < 0 ? 2 : 0) |
				(d < 0 ? 1 : 0);
			if (kind === 0 || kind === 15) continue;
			const top = horizontal(column, row);
			const bottom = horizontal(column, row + 1);
			const left = vertical(column, row);
			const right = vertical(column + 1, row);
			const centreInside = a + b + c + d < 0;
			switch (kind) {
				case 1:
				case 14:
					link(left, bottom);
					break;
				case 2:
				case 13:
					link(bottom, right);
					break;
				case 3:
				case 12:
					link(left, right);
					break;
				case 4:
				case 11:
					link(top, right);
					break;
				case 6:
				case 9:
					link(top, bottom);
					break;
				case 7:
				case 8:
					link(top, left);
					break;
				case 5:
					if (centreInside) {
						link(top, left);
						link(right, bottom);
					} else {
						link(top, right);
						link(left, bottom);
					}
					break;
				case 10:
					if (centreInside) {
						link(top, right);
						link(left, bottom);
					} else {
						link(top, left);
						link(right, bottom);
					}
					break;
			}
		}
	}

	const result: Point[][] = [];
	const seen = new Set<number>();
	for (const start of links.keys()) {
		if (seen.has(start)) continue;
		const loop: Point[] = [];
		let previous = -1;
		let current = start;
		while (!seen.has(current)) {
			seen.add(current);
			loop.push(points.get(current) as Point);
			const [first, second] = links.get(current) as number[];
			const next = first !== previous ? first : second;
			if (next === undefined) break;
			previous = current;
			current = next;
		}
		if (loop.length >= 3) result.push(loop);
	}
	return result;
}

function simplifyLoop(loop: Point[], tolerance: number): Point[] {
	const [start] = loop;
	if (start === undefined || loop.length < 4) return loop;
	let far = 0;
	let farthest = -1;
	for (const [i, [x, y]] of loop.entries()) {
		if (i === 0) continue;
		const d = Math.hypot(x - start[0], y - start[1]);
		if (d > farthest) {
			farthest = d;
			far = i;
		}
	}
	const first = simplifyChain(loop.slice(0, far + 1), tolerance);
	const second = simplifyChain([...loop.slice(far), start], tolerance);
	return [...first.slice(0, -1), ...second.slice(0, -1)];
}

function simplifyChain(chain: Point[], tolerance: number): Point[] {
	const keep = new Uint8Array(chain.length);
	keep[0] = 1;
	keep[chain.length - 1] = 1;
	const stack: [number, number][] = [[0, chain.length - 1]];
	while (stack.length) {
		const [start, end] = stack.pop() as [number, number];
		const [ax, ay] = itemAt(chain, start);
		const [bx, by] = itemAt(chain, end);
		const length = Math.hypot(bx - ax, by - ay) || 1;
		let worst = -1;
		let index = -1;
		for (let i = start + 1; i < end; i++) {
			const [px, py] = itemAt(chain, i);
			const d =
				Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) /
				length;
			if (d > worst) {
				worst = d;
				index = i;
			}
		}
		if (worst > tolerance) {
			keep[index] = 1;
			stack.push([start, index], [index, end]);
		}
	}
	return chain.filter((_, i) => keep[i]);
}

function linePath(loop: Point[], digits: number): string {
	return `M${loop.map(([x, y]) => `${n(x, digits)} ${n(y, digits)}`).join("L")}Z`;
}

function curvePath(loop: Point[], corner: number, digits: number): string {
	const count = loop.length;
	const point = (i: number) => itemAt(loop, ((i % count) + count) % count);
	const sharp = loop.map((_, i) => {
		const [px, py] = point(i - 1);
		const [x, y] = point(i);
		const [nx, ny] = point(i + 1);
		const turn = Math.abs(
			Math.atan2(
				(x - px) * (ny - y) - (y - py) * (nx - x),
				(x - px) * (nx - x) + (y - py) * (ny - y),
			),
		);
		return (turn * 180) / Math.PI > corner;
	});
	const f = (value: number) => n(value, digits);
	const [startX, startY] = point(0);
	let d = `M${f(startX)} ${f(startY)}`;
	for (let i = 0; i < count; i++) {
		const [x0, y0] = point(i - 1);
		const [x1, y1] = point(i);
		const [x2, y2] = point(i + 1);
		const [x3, y3] = point(i + 2);
		const c1: Point = sharp[i]
			? [x1, y1]
			: [x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6];
		const c2: Point = sharp[(i + 1) % count]
			? [x2, y2]
			: [x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6];
		d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(x2)} ${f(y2)}`;
	}
	return `${d}Z`;
}
