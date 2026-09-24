import {
	creatureMask,
	edgeDistance,
	EYE,
	groundClip,
	isEaten,
	n,
	rng,
	SIZE,
	svgDocument,
	type Variant,
	WORDS,
} from "../kit";

/**
 * Woven glyphs: the bites are an ochre page of unreadable maze script; the
 * textfresser is woven from what it ate, a patchwork of dark satin-stitch
 * pieces, each stitched in its own direction, with one ochre eye.
 */

type Point = readonly [number, number];

const OCHRE = "#d89a2c";
const INK = "#2a190c";
const SEAM = "#7a4f1a";
const WORD_THREAD = "#171009";
const RING_THREAD = "#b27a28";
const THREADS = ["#1d130b", "#271a0e", "#221710", "#2f1f10"];

const SEED = 20260924;
let random = rng(SEED);
const jitter = (amount: number) => (random() - 0.5) * 2 * amount;

/** How far a ground point is from the creature (0 on the creature). */
function groundDepth(x: number, y: number): number {
	return isEaten(x, y) ? -edgeDistance(x, y) : 0;
}

/**
 * One word of maze script: a single line that meanders left to right over a
 * grid of `cells` columns and `rows` rows, sometimes ending in a square spiral.
 */
function meander(cells: number, rows: number): Point[] {
	const line: Point[] = [];
	let c = 0;
	let r = random() < 0.5 ? 0 : rows;
	line.push([c, r]);
	const spiral = cells >= 4 && random() < 0.38;
	const end = spiral ? cells - 3 : cells;
	let turns = 0;
	while (c < end) {
		if (random() < 0.7 || (turns < 2 && c >= end - 2) || c === 0) {
			turns += 1;
			let next = Math.floor(random() * rows);
			if (next >= r) next += 1;
			line.push([c, next]);
			r = next;
		}
		c = Math.min(end, c + (random() < 0.8 ? 1 : 2));
		line.push([c, r]);
	}
	if (spiral) {
		// Square spiral inward over the last three columns.
		const top = r === 0;
		if (!top && r !== rows) {
			line.push([c, rows]);
			r = rows;
		}
		const y = (level: number) => (top ? level : rows - level);
		line.push(
			[c + 3, y(0)],
			[c + 3, y(rows)],
			[c + 1, y(rows)],
			[c + 1, y(1)],
			[c + 2, y(1)],
			[c + 2, y(rows - 1)],
		);
	}
	return line;
}

function polyline(points: readonly Point[]): string {
	let d = "";
	let previous: Point | null = null;
	for (const [x, y] of points) {
		if (previous && previous[0] === x && previous[1] === y) continue;
		d += `${previous ? "L" : "M"}${n(x)} ${n(y)}`;
		previous = [x, y];
	}
	return d;
}

/** Lines of maze script across the page, kept clear of the creature. */
function script(): { tubes: string; solid: string } {
	const cell = 15;
	const rows = 3;
	const pitch = 78;
	const moat = 16;
	let tubes = "";
	let solid = "";
	const clear = (points: readonly Point[]) =>
		points.every((p, i) => {
			const q = points[i + 1] ?? p;
			const steps = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 4));
			for (let k = 0; k <= steps; k++) {
				const t = k / steps;
				if (groundDepth(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t) < moat) return false;
			}
			return true;
		});
	for (let top = 16; top < SIZE; top += pitch) {
		let x = -24 + random() * 30;
		while (x < SIZE) {
			const y0 = top + jitter(3);
			let placed = 0;
			for (let cells = 3 + Math.floor(random() * 7); cells >= 3 && placed === 0; cells--) {
				const mirror = random() < 0.5;
				const points = meander(cells, rows).map(([c, r]): Point => {
					const u = mirror ? cells - c : c;
					return [x + u * cell + jitter(1.3), y0 + r * cell + jitter(1.3)];
				});
				if (!clear(points)) continue;
				const d = polyline(points);
				if (random() < 0.72) tubes += d;
				else solid += d;
				placed = cells;
			}
			x += placed ? placed * cell + 22 + random() * 16 : cell;
		}
	}
	return { tubes, solid };
}

/** Straight stitch lines across a convex patch, all in one direction. */
function satin(patch: readonly Point[], angle: number, spacing: number): string {
	const d: Point = [Math.cos(angle), Math.sin(angle)];
	const m: Point = [-d[1], d[0]];
	const across = (p: Point) => p[0] * m[0] + p[1] * m[1];
	const along = (p: Point) => p[0] * d[0] + p[1] * d[1];
	const offsets = patch.map(across);
	const lo = Math.min(...offsets);
	const hi = Math.max(...offsets);
	const inset = 3.4;
	let out = "";
	for (let s = lo + spacing * (0.4 + random() * 0.3); s < hi; s += spacing * (0.9 + random() * 0.2)) {
		const hits: Point[] = [];
		for (let i = 0; i < patch.length; i++) {
			const a = patch[i] as Point;
			const b = patch[(i + 1) % patch.length] as Point;
			const sa = across(a);
			const sb = across(b);
			if ((sa - s) * (sb - s) > 0 || sa === sb) continue;
			const t = (s - sa) / (sb - sa);
			hits.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
		}
		if (hits.length < 2) continue;
		hits.sort((a, b) => along(a) - along(b));
		const p = hits[0] as Point;
		const q = hits[hits.length - 1] as Point;
		const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
		if (length < inset * 2 + 1.5) continue;
		const ux = (q[0] - p[0]) / length;
		const uy = (q[1] - p[1]) / length;
		out += `M${n(p[0] + ux * inset + jitter(0.9))} ${n(p[1] + uy * inset + jitter(0.9))}L${n(q[0] - ux * inset + jitter(0.9))} ${n(q[1] - uy * inset + jitter(0.9))}`;
	}
	return out;
}

/** The creature as a jittered patchwork, each piece satin-stitched. */
function weave(): string {
	const cell = 70;
	const x0 = -40;
	const y0 = 172;
	const columns = Math.ceil((SIZE + 40 - x0) / cell);
	const rowsCount = Math.ceil((SIZE + 40 - y0) / cell);
	const grid: Point[][] = [];
	for (let j = 0; j <= rowsCount; j++) {
		const row: Point[] = [];
		for (let i = 0; i <= columns; i++) {
			row.push([x0 + i * cell + jitter(19), y0 + j * cell + jitter(19)]);
		}
		grid.push(row);
	}
	const angles = [90, 35, -35, 0, 65, -65].map((a) => (a * Math.PI) / 180);
	const byThread = new Map<string, string>();
	const stitch = (patch: Point[]) => {
		const probes = patch.flatMap((p, k) => {
			const q = patch[(k + 1) % patch.length] as Point;
			return [p, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] as Point];
		});
		probes.push([
			patch.reduce((sum, [x]) => sum + x, 0) / patch.length,
			patch.reduce((sum, [, y]) => sum + y, 0) / patch.length,
		]);
		const inside = probes.some(([x, y]) => !isEaten(x, y));
		if (!inside) return;
		const angle = (angles[Math.floor(random() * angles.length)] as number) + jitter(0.12);
		const thread = THREADS[Math.floor(random() * THREADS.length)] as string;
		byThread.set(thread, (byThread.get(thread) ?? "") + satin(patch, angle, 5.9));
	};
	for (let j = 0; j < rowsCount; j++) {
		for (let i = 0; i < columns; i++) {
			const a = grid[j]?.[i] as Point;
			const b = grid[j]?.[i + 1] as Point;
			const c = grid[j + 1]?.[i + 1] as Point;
			const d = grid[j + 1]?.[i] as Point;
			const split = random();
			if (split < 0.1) {
				stitch([a, b, c]);
				stitch([a, c, d]);
			} else if (split < 0.2) {
				stitch([a, b, d]);
				stitch([b, c, d]);
			} else {
				stitch([a, b, c, d]);
			}
		}
	}
	return [...byThread]
		.map(
			([thread, d]) =>
				`<path d="${d}" stroke="${thread}" stroke-width="4.9" stroke-linecap="round"/>`,
		)
		.join("");
}

/** The words that survive on the creature, embroidered across the grain. */
function words(): string {
	let cover = "";
	let stitches = "";
	for (const { x, y, w, h, eaten } of WORDS) {
		if (eaten) continue;
		const patch: Point[] = [
			[x + jitter(2), y + jitter(2)],
			[x + w + jitter(2), y + jitter(2)],
			[x + w + jitter(2), y + h + jitter(2)],
			[x + jitter(2), y + h + jitter(2)],
		];
		cover += `M${patch.map(([px, py]) => `${n(px)} ${n(py)}`).join("L")}Z`;
		stitches += satin(patch, jitter(0.05), 5.9);
	}
	return `<path d="${cover}" fill="${SEAM}" stroke="${SEAM}" stroke-width="5" stroke-linejoin="round"/><path d="${stitches}" stroke="${WORD_THREAD}" stroke-width="4.9" stroke-linecap="round"/>`;
}

/** Radial stitches around the eye, like an embroidered owl's facial ring. */
function eyeRing(): string {
	let d = "";
	const count = 26;
	for (let k = 0; k < count; k++) {
		const a = (k / count) * Math.PI * 2 + jitter(0.04);
		const inner = EYE.r + 5.5 + jitter(0.8);
		const outer = EYE.r + 13 + jitter(1.5);
		d += `M${n(EYE.cx + Math.cos(a) * inner)} ${n(EYE.cy + Math.sin(a) * inner)}L${n(EYE.cx + Math.cos(a) * outer)} ${n(EYE.cy + Math.sin(a) * outer)}`;
	}
	return `<path d="${d}" stroke="${RING_THREAD}" stroke-width="2.6" stroke-linecap="round"/>`;
}

function render(): string {
	random = rng(SEED);
	const { tubes, solid } = script();
	const eye = `<circle cx="${EYE.cx}" cy="${EYE.cy}" r="${EYE.r + 7}" fill="${THREADS[0]}"/><circle cx="${EYE.cx}" cy="${EYE.cy}" r="${EYE.r}" fill="${OCHRE}"/>${eyeRing()}`;
	return svgDocument({
		title: "textfresser, woven glyphs",
		desc: "Six circular bites leave an ochre page of maze script; what survives is the textfresser, a dark satin-stitch patchwork with one ochre eye.",
		defs: `${groundClip("ground")}${creatureMask("creature")}<path id="tubes" d="${tubes}"/>`,
		body: `  <rect width="${SIZE}" height="${SIZE}" fill="${OCHRE}"/>
  <g clip-path="url(#ground)" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <use href="#tubes" stroke="${INK}" stroke-width="11"/>
    <use href="#tubes" stroke="${OCHRE}" stroke-width="4.2"/>
    <path d="${solid}" stroke="${INK}" stroke-width="6.5"/>
  </g>
  <g mask="url(#creature)"><rect width="${SIZE}" height="${SIZE}" fill="${SEAM}"/>${weave()}${words()}</g>
  ${eye}`,
	});
}

export default {
	id: "woven-glyphs",
	title: "woven glyphs: ochre maze script, stitched creature",
	render,
} satisfies Variant;
