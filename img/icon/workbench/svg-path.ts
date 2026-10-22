/**
 * SVG path data flattened into point lists, for `field.ts`'s `path`.
 */
import type { Point } from "./field";

/** Flattens SVG path data into one closed point list per subpath. */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export function pathPoints(d: string, tolerance = 0.25): Point[][] {
	const tokens =
		d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
	const shapes: Point[][] = [];
	let current: Point[] = [];
	let x = 0;
	let y = 0;
	let startX = 0;
	let startY = 0;
	let command = "";
	let lastControl: Point | null = null;
	let index = 0;
	const number = () => Number(tokens[index++]);
	const close = () => {
		if (current.length >= 3) shapes.push(current);
		current = [];
	};
	const curve = (points: Point[], degree: 2 | 3) => {
		const [p0, p1, p2, p3] = points;
		const span = points.reduce(
			(sum, point, i) =>
				i
					? sum +
						Math.hypot(
							point[0] - points[i - 1][0],
							point[1] - points[i - 1][1],
						)
					: 0,
			0,
		);
		const segments = Math.max(
			2,
			Math.ceil(Math.sqrt(span / tolerance) / 2),
		);
		for (let s = 1; s <= segments; s++) {
			const t = s / segments;
			const u = 1 - t;
			if (degree === 2)
				current.push([
					u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
					u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
				]);
			else
				current.push([
					u ** 3 * p0[0] +
						3 * u * u * t * p1[0] +
						3 * u * t * t * p2[0] +
						t ** 3 * p3[0],
					u ** 3 * p0[1] +
						3 * u * u * t * p1[1] +
						3 * u * t * t * p2[1] +
						t ** 3 * p3[1],
				]);
		}
	};
	while (index < tokens.length) {
		if (/[a-zA-Z]/.test(tokens[index])) command = tokens[index++];
		else if (command === "M") command = "L";
		else if (command === "m") command = "l";
		const relative = command === command.toLowerCase();
		const ox = relative ? x : 0;
		const oy = relative ? y : 0;
		const upper = command.toUpperCase();
		let control: Point | null = null;
		switch (upper) {
			case "M":
				close();
				x = ox + number();
				y = oy + number();
				startX = x;
				startY = y;
				current.push([x, y]);
				break;
			case "L":
				x = ox + number();
				y = oy + number();
				current.push([x, y]);
				break;
			case "H":
				x = ox + number();
				current.push([x, y]);
				break;
			case "V":
				y = oy + number();
				current.push([x, y]);
				break;
			case "C":
			case "S": {
				const first: Point =
					upper === "C"
						? [ox + number(), oy + number()]
						: lastControl
							? [2 * x - lastControl[0], 2 * y - lastControl[1]]
							: [x, y];
				const second: Point = [ox + number(), oy + number()];
				const end: Point = [ox + number(), oy + number()];
				curve([[x, y], first, second, end], 3);
				control = second;
				[x, y] = end;
				break;
			}
			case "Q":
			case "T": {
				const middle: Point =
					upper === "Q"
						? [ox + number(), oy + number()]
						: lastControl
							? [2 * x - lastControl[0], 2 * y - lastControl[1]]
							: [x, y];
				const end: Point = [ox + number(), oy + number()];
				curve([[x, y], middle, end], 2);
				control = middle;
				[x, y] = end;
				break;
			}
			case "A": {
				const rx = Math.abs(number());
				const ry = Math.abs(number());
				const rotation = number();
				const large = number() !== 0;
				const sweep = number() !== 0;
				const end: Point = [ox + number(), oy + number()];
				current.push(
					...arcPoints(
						[x, y],
						end,
						rx,
						ry,
						rotation,
						large,
						sweep,
						tolerance,
					),
				);
				[x, y] = end;
				break;
			}
			case "Z":
				x = startX;
				y = startY;
				close();
				break;
			default:
				throw new Error(`unsupported path command "${command}"`);
		}
		lastControl = control;
	}
	close();
	return shapes;
}

function arcPoints(
	[x1, y1]: Point,
	[x2, y2]: Point,
	rx: number,
	ry: number,
	rotation: number,
	large: boolean,
	sweep: boolean,
	tolerance: number,
): Point[] {
	if (rx === 0 || ry === 0) return [[x2, y2]];
	const phi = (rotation * Math.PI) / 180;
	const cos = Math.cos(phi);
	const sin = Math.sin(phi);
	const dx = (x1 - x2) / 2;
	const dy = (y1 - y2) / 2;
	const px = cos * dx + sin * dy;
	const py = -sin * dx + cos * dy;
	const scale = Math.max(
		1,
		Math.sqrt((px * px) / (rx * rx) + (py * py) / (ry * ry)),
	);
	const sx = rx * scale;
	const sy = ry * scale;
	const numerator = sx * sx * sy * sy - sx * sx * py * py - sy * sy * px * px;
	const denominator = sx * sx * py * py + sy * sy * px * px;
	const root =
		(large === sweep ? -1 : 1) *
		Math.sqrt(Math.max(0, numerator / denominator));
	const cxp = (root * sx * py) / sy;
	const cyp = (-root * sy * px) / sx;
	const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
	const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
	const angle = (ux: number, uy: number, vx: number, vy: number) =>
		Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
	const start = angle(1, 0, (px - cxp) / sx, (py - cyp) / sy);
	let delta = angle(
		(px - cxp) / sx,
		(py - cyp) / sy,
		(-px - cxp) / sx,
		(-py - cyp) / sy,
	);
	if (!sweep && delta > 0) delta -= 2 * Math.PI;
	if (sweep && delta < 0) delta += 2 * Math.PI;
	const segments = Math.max(
		2,
		Math.ceil(
			Math.abs(delta) /
				(2 * Math.acos(Math.max(0, 1 - tolerance / Math.max(sx, sy)))),
		),
	);
	const points: Point[] = [];
	for (let s = 1; s <= segments; s++) {
		const theta = start + (delta * s) / segments;
		const ex = sx * Math.cos(theta);
		const ey = sy * Math.sin(theta);
		points.push([cos * ex - sin * ey + cx, sin * ex + cos * ey + cy]);
	}
	return points;
}
