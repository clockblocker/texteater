import {
	BITES,
	creatureMask,
	EYE,
	edgeDistance,
	groundClip,
	n,
	rng,
	SIZE,
	svgDocument,
	type Variant,
} from "../kit";

/**
 * Brushed mosaic / crumbs: the bitten ground is a crazy-paving of chewed
 * crumbs, painted in ultramarine and ochre with visible brush streaks. The
 * crumbs along each bite are laid in a row that follows the arc, the way
 * tesserae follow a contour. The creature is plain paper written over with
 * wavy lines that follow its own outline: every line keeps one distance
 * from the bites, so the lines are rings of the bites and fold into
 * chevrons where two bites meet. The lines part around the eye.
 */

type Point = readonly [number, number];

const PAPER = "#f4ecda";
const BLUES = ["#1d3a8a", "#22449a", "#183276"];
const OCHRES = ["#d49a26", "#dca735", "#c98d1c"];
const STREAKS = {
	blue: { light: "#3d62b8", dark: "#122a66" },
	ochre: { light: "#efc45e", dark: "#ad7512" },
};
const LINE_INKS = ["#1d3a8a", "#c98d1c", "#86a8d8"];
const EYE_INK = "#15286a";

/** Crumb spacing and the paper gap between crumbs. */
const SPACING = 50;
const GROUT = 5;

/** Line spacing on the creature. */
const LINE_STEP = 12.5;

function polygonPath(points: readonly Point[], radius: number): string {
	const count = points.length;
	const corners = points.map((vertex, index) => {
		const before = points[(index + count - 1) % count] as Point;
		const after = points[(index + 1) % count] as Point;
		const toward = (target: Point): Point => {
			const length = Math.hypot(target[0] - vertex[0], target[1] - vertex[1]);
			const t = Math.min(radius, length * 0.42) / length;
			return [
				vertex[0] + (target[0] - vertex[0]) * t,
				vertex[1] + (target[1] - vertex[1]) * t,
			];
		};
		return { entry: toward(before), vertex, exit: toward(after) };
	});
	const [first] = corners;
	if (!first) return "";
	let d = `M${n(first.entry[0], 0)} ${n(first.entry[1], 0)}`;
	corners.forEach(({ entry, vertex, exit }, index) => {
		if (index > 0) d += `L${n(entry[0], 0)} ${n(entry[1], 0)}`;
		d += `Q${n(vertex[0], 0)} ${n(vertex[1], 0)} ${n(exit[0], 0)} ${n(exit[1], 0)}`;
	});
	return `${d}Z`;
}

/** Keeps the part of a convex polygon where `x*ux + y*uy <= limit`. */
function clipHalfPlane(
	polygon: readonly Point[],
	ux: number,
	uy: number,
	limit: number,
): Point[] {
	const kept: Point[] = [];
	polygon.forEach((a, index) => {
		const b = polygon[(index + 1) % polygon.length] as Point;
		const da = a[0] * ux + a[1] * uy - limit;
		const db = b[0] * ux + b[1] * uy - limit;
		if (da <= 0) kept.push(a);
		if (da <= 0 !== db <= 0) {
			const t = da / (da - db);
			kept.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
		}
	});
	return kept;
}

function area(polygon: readonly Point[]): number {
	let sum = 0;
	polygon.forEach((a, index) => {
		const b = polygon[(index + 1) % polygon.length] as Point;
		sum += a[0] * b[1] - b[0] * a[1];
	});
	return Math.abs(sum) / 2;
}

/** Where the line `x*nx + y*ny = t` crosses a convex polygon. */
function chord(
	polygon: readonly Point[],
	nx: number,
	ny: number,
	t: number,
): [Point, Point] | null {
	const hits: Point[] = [];
	polygon.forEach((a, index) => {
		const b = polygon[(index + 1) % polygon.length] as Point;
		const da = a[0] * nx + a[1] * ny - t;
		const db = b[0] * nx + b[1] * ny - t;
		if (da <= 0 !== db <= 0) {
			const k = da / (da - db);
			hits.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
		}
	});
	const [start, end] = hits;
	return start && end ? [start, end] : null;
}

/** Crumb centres: a row along every bite, then random fill behind it. */
function crumbSites(random: () => number): Point[] {
	const sites: Point[] = [];
	const clear = (x: number, y: number, gap: number) =>
		sites.every(([sx, sy]) => (sx - x) ** 2 + (sy - y) ** 2 >= gap * gap);
	const inCanvas = (x: number, y: number, margin: number) =>
		x > -margin && x < SIZE + margin && y > -margin && y < SIZE + margin;

	const inset = SPACING * 0.5;
	for (const bite of BITES) {
		const radius = bite.r - inset;
		const steps = Math.ceil((2 * Math.PI * radius) / 2);
		for (let step = 0; step < steps; step++) {
			const angle = (step / steps) * 2 * Math.PI;
			const x = bite.cx + radius * Math.cos(angle);
			const y = bite.cy + radius * Math.sin(angle);
			if (!inCanvas(x, y, inset)) continue;
			const buried = BITES.some(
				(other) =>
					other !== bite &&
					Math.hypot(x - other.cx, y - other.cy) < other.r - inset,
			);
			if (!buried && clear(x, y, SPACING * 0.92)) sites.push([x, y]);
		}
	}
	for (let attempt = 0; attempt < 6000; attempt++) {
		const x = -inset + random() * (SIZE + 2 * inset);
		const y = -inset + random() * (SIZE + 2 * inset);
		if (edgeDistance(x, y) > -inset * 0.9) continue;
		if (clear(x, y, SPACING)) sites.push([x, y]);
	}
	return sites;
}

/** Voronoi cells of the sites, each shrunk by half the grout. */
function crumbCells(sites: readonly Point[]): Point[][] {
	return sites.flatMap(([x, y], index) => {
		const reach = SPACING * 2;
		let cell: Point[] = [
			[x - reach, y - reach],
			[x + reach, y - reach],
			[x + reach, y + reach],
			[x - reach, y + reach],
		];
		sites.forEach(([ox, oy], other) => {
			if (other === index) return;
			const distance = Math.hypot(ox - x, oy - y);
			if (distance > reach * 2) return;
			const ux = (ox - x) / distance;
			const uy = (oy - y) / distance;
			const limit = ((x + ox) / 2) * ux + ((y + oy) / 2) * uy - GROUT / 2;
			cell = clipHalfPlane(cell, ux, uy, limit);
		});
		cell = clipHalfPlane(cell, -1, 0, 3);
		cell = clipHalfPlane(cell, 1, 0, SIZE + 3);
		cell = clipHalfPlane(cell, 0, -1, 3);
		cell = clipHalfPlane(cell, 0, 1, SIZE + 3);
		return cell.length >= 3 && area(cell) > 80 ? [cell] : [];
	});
}

function renderGround(random: () => number): string {
	const cells = crumbCells(crumbSites(random));
	const fills = new Map<string, string[]>();
	const streaks = new Map<string, string[]>();
	const add = (map: Map<string, string[]>, key: string, value: string) => {
		const list = map.get(key) ?? [];
		list.push(value);
		map.set(key, list);
	};

	for (const cell of cells) {
		const family = random() < 0.62 ? "blue" : "ochre";
		const palette = family === "blue" ? BLUES : OCHRES;
		const fill = palette[Math.floor(random() * palette.length)] as string;
		const wobbly = cell.map(
			([x, y]): Point => [x + (random() - 0.5) * 2.4, y + (random() - 0.5) * 2.4],
		);
		add(fills, fill, polygonPath(wobbly, 7 + random() * 6));

		// Brush streaks run one way across each crumb, inside its outline.
		const cx = cell.reduce((sum, [x]) => sum + x, 0) / cell.length;
		const cy = cell.reduce((sum, [, y]) => sum + y, 0) / cell.length;
		const inner = cell.map(([x, y]): Point => {
			const distance = Math.hypot(x - cx, y - cy);
			const k = Math.max(0, 1 - 6 / distance);
			return [cx + (x - cx) * k, cy + (y - cy) * k];
		});
		const angle = random() * Math.PI;
		const nx = -Math.sin(angle);
		const ny = Math.cos(angle);
		const projections = inner.map(([x, y]) => x * nx + y * ny);
		const low = Math.min(...projections);
		const high = Math.max(...projections);
		for (let t = low + 1.5 + random() * 3; t < high - 1; t += 2.6 + random() * 3.2) {
			const hit = chord(inner, nx, ny, t);
			if (!hit) continue;
			const [[ax, ay], [bx, by]] = hit;
			const length = Math.hypot(bx - ax, by - ay);
			if (length < 6) continue;
			const trimStart = random() * length * 0.25;
			const trimEnd = random() * length * 0.25;
			const sx = ax + ((bx - ax) * trimStart) / length;
			const sy = ay + ((by - ay) * trimStart) / length;
			const ex = bx - ((bx - ax) * trimEnd) / length;
			const ey = by - ((by - ay) * trimEnd) / length;
			const bend = (random() - 0.5) * 3;
			const tone = random() < 0.55 ? "light" : "dark";
			add(
				streaks,
				STREAKS[family][tone],
				`M${n(sx, 0)} ${n(sy, 0)}q${n((ex - sx) / 2 + nx * bend)} ${n((ey - sy) / 2 + ny * bend)} ${n(ex - sx)} ${n(ey - sy)}`,
			);
		}
	}

	const fillPaths = [...fills]
		.map(([colour, paths]) => `<path fill="${colour}" d="${paths.join("")}"/>`)
		.join("");
	const streakPaths = [...streaks]
		.map(
			([colour, paths]) =>
				`<path stroke="${colour}" d="${paths.join("")}"/>`,
		)
		.join("");
	return `<g clip-path="url(#ground)">${fillPaths}<g fill="none" stroke-width="1.8" stroke-linecap="round" opacity=".85">${streakPaths}</g></g>`;
}

/** Arcs where every point is exactly `level` away from the nearest bite. */
function contour(level: number): Point[][] {
	const runs: Point[][] = [];
	for (const bite of BITES) {
		const radius = bite.r + level;
		const steps = Math.ceil(2 * Math.PI * radius);
		const kept = Array.from({ length: steps }, (_, step): Point | null => {
			const angle = (step / steps) * 2 * Math.PI;
			const x = bite.cx + radius * Math.cos(angle);
			const y = bite.cy + radius * Math.sin(angle);
			if (x < -4 || x > SIZE + 4 || y < -4 || y > SIZE + 4) return null;
			const covered = BITES.some(
				(other) =>
					other !== bite &&
					Math.hypot(x - other.cx, y - other.cy) < other.r + level,
			);
			return covered ? null : [x, y];
		});
		const start = kept.indexOf(null);
		if (start < 0) continue;
		let run: Point[] = [];
		for (let step = 1; step <= steps; step++) {
			const point = kept[(start + step) % steps];
			if (point) run.push(point);
			else {
				if (run.length > 1) runs.push(run);
				run = [];
			}
		}
	}

	// Arcs of neighbouring bites meet in a fold; join them there.
	const chains: Point[][] = [];
	while (runs.length) {
		let chain = runs.shift() as Point[];
		for (let joined = true; joined; ) {
			joined = false;
			const tail = chain[chain.length - 1] as Point;
			const head = chain[0] as Point;
			for (let index = 0; index < runs.length; index++) {
				const run = runs[index] as Point[];
				const runHead = run[0] as Point;
				const runTail = run[run.length - 1] as Point;
				if (Math.hypot(runHead[0] - tail[0], runHead[1] - tail[1]) < 3) {
					chain = [...chain, ...run];
				} else if (Math.hypot(runTail[0] - head[0], runTail[1] - head[1]) < 3) {
					chain = [...run, ...chain];
				} else continue;
				runs.splice(index, 1);
				joined = true;
				break;
			}
		}
		chains.push(chain);
	}
	return chains;
}

function resample(chain: readonly Point[], spacing: number): Point[] {
	const out: Point[] = [chain[0] as Point];
	let carried = 0;
	for (let index = 1; index < chain.length; index++) {
		const [ax, ay] = chain[index - 1] as Point;
		const [bx, by] = chain[index] as Point;
		const length = Math.hypot(bx - ax, by - ay);
		let along = spacing - carried;
		while (along <= length) {
			out.push([ax + ((bx - ax) * along) / length, ay + ((by - ay) * along) / length]);
			along += spacing;
		}
		carried = length - (along - spacing);
	}
	const last = chain[chain.length - 1] as Point;
	const end = out[out.length - 1] as Point;
	if (Math.hypot(last[0] - end[0], last[1] - end[1]) > spacing * 0.3) out.push(last);
	return out;
}

function renderLines(random: () => number): string {
	const waves = Array.from({ length: 5 }, () => {
		const angle = random() * 2 * Math.PI;
		const wavelength = 45 + random() * 90;
		return {
			kx: (Math.cos(angle) * 2 * Math.PI) / wavelength,
			ky: (Math.sin(angle) * 2 * Math.PI) / wavelength,
			phase: random() * 2 * Math.PI,
			amp: 0.5 + random() * 0.5,
		};
	});
	const field = (x: number, y: number) =>
		waves.reduce((sum, w) => sum + w.amp * Math.sin(w.kx * x + w.ky * y + w.phase), 0);

	// Lines part around the eye like grain around a knot.
	const knot = 58;
	const push = 22;
	const lens = ([x, y]: Point): Point => {
		const dx = x - EYE.cx;
		const dy = y - EYE.cy;
		const distance = Math.hypot(dx, dy);
		if (distance >= knot || distance === 0) return [x, y];
		const scale = (distance + push * (1 - distance / knot) ** 2) / distance;
		return [EYE.cx + dx * scale, EYE.cy + dy * scale];
	};

	const eyeLevel = edgeDistance(EYE.cx, EYE.cy);
	const firstLevel = (eyeLevel - LINE_STEP / 2) % LINE_STEP;
	const byInk = new Map<string, string[]>();
	for (let level = firstLevel, index = 0; level < 420; level += LINE_STEP, index++) {
		const ink =
			index % 2 === 0
				? (LINE_INKS[0] as string)
				: (LINE_INKS[random() < 0.6 ? 1 : 2] as string);
		const phase = random() * 100;
		for (const chain of contour(level)) {
			const points = resample(chain, 5);
			if (points.length < 3) continue;
			const moved = points.map(([x, y], index): Point => {
				const before = points[Math.max(0, index - 1)] as Point;
				const after = points[Math.min(points.length - 1, index + 1)] as Point;
				const tx = after[0] - before[0];
				const ty = after[1] - before[1];
				const length = Math.hypot(tx, ty) || 1;
				const offset =
					field(x, y) * 2.2 + Math.sin(index * 0.35 + phase) * 0.6;
				return lens([x - (ty / length) * offset, y + (tx / length) * offset]);
			});
			let d = `M${n(moved[0]?.[0] ?? 0)} ${n(moved[0]?.[1] ?? 0)}`;
			let [px, py] = [Number(n(moved[0]?.[0] ?? 0)), Number(n(moved[0]?.[1] ?? 0))];
			d += "l";
			for (const [x, y] of moved.slice(1)) {
				const rx = Number(n(x));
				const ry = Number(n(y));
				d += `${n(rx - px)} ${n(ry - py)} `;
				[px, py] = [rx, ry];
			}
			const list = byInk.get(ink) ?? [];
			list.push(d.trimEnd());
			byInk.set(ink, list);
		}
	}
	const paths = [...byInk]
		.map(([ink, list]) => `<path stroke="${ink}" d="${list.join("")}"/>`)
		.join("");
	return `<g mask="url(#creature)" fill="none" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">${paths}</g>`;
}

function render(): string {
	const random = rng(20260924);
	return svgDocument({
		title: "textfresser, brushed crumbs",
		desc: "Six circular bites chew the page into a mosaic of blue and ochre crumbs; the paper that survives, written over with lines that follow its outline, is the textfresser.",
		defs: `${groundClip("ground")}${creatureMask("creature")}`,
		body: `  <rect width="${SIZE}" height="${SIZE}" fill="${PAPER}"/>
  ${renderGround(random)}
  ${renderLines(random)}
  <circle cx="${EYE.cx}" cy="${EYE.cy}" r="${EYE.r}" fill="${EYE_INK}"/>`,
	});
}

export default {
	id: "mosaic-crumbs",
	title: "brushed crumbs, written paper",
	render,
} satisfies Variant;
