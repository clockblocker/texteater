import {
	creatureMask,
	EYE,
	edgeDistance,
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
 * Night, speckle, crackle. The bites are a night sky dusted with crumbs: the
 * eaten words have crumbled into rows of teal flecks. The creature is a raku
 * glaze, turquoise crazed with ink cracks; its surviving words are the
 * primary cracks, and the finer crackle branches off them.
 */

type Point = [number, number];

const CRACKLE_SEED = Number(process.env.SEED ?? 11);
const NIGHT = "#0a1316";
const DUST = "#2b6468";
const TEAL = "#3ec8bf";
const PINHOLE = "#2b9e97";
const CRUMB = { processed: "#7fe6dc", unknown: "#2f8f8a" } as const;

function pathOf(points: readonly Point[], digits = 0): string {
	return `M${points.map(([x, y]) => `${n(x, digits)} ${n(y, digits)}`).join("L")}`;
}

/**
 * A crack that has opened: pointed ends, the two lips torn independently.
 * `half` is the half-width in the middle.
 */
function fissure(points: readonly Point[], half: number, random: () => number): string {
	const top: Point[] = [];
	const bottom: Point[] = [];
	const last = points.length - 1;
	points.forEach(([x, y], i) => {
		const t = i / last;
		const envelope = Math.min(1, t / 0.14, (1 - t) / 0.14) ** 0.7;
		top.push([x, y - half * envelope * (0.7 + random() * 0.55)]);
		bottom.push([x, y + half * envelope * (0.7 + random() * 0.55)]);
	});
	return `${pathOf([...top, ...bottom.reverse()], 1)}Z`;
}

/** Substrate-style crackle: cracks grow until they meet another crack or the rim. */
function crackle(random: () => number): { primaries: string; secondaries: string[] } {
	const CELL = 4;
	/** Open glaze needed before a new crack may start; sets the cell size. */
	const ROOM = 25;
	const GRID = SIZE / CELL;
	const owner = new Int32Array(GRID * GRID);
	const cellOf = (x: number, y: number) =>
		Math.floor(y / CELL) * GRID + Math.floor(x / CELL);
	const nearEye = (x: number, y: number) =>
		Math.hypot(x - EYE.cx, y - EYE.cy) < EYE.r + 14;

	type Crack = { id: number; parent: number; generation: number; points: Point[]; headings: number[] };
	const cracks: Crack[] = [];
	const sites: { crack: Crack; index: number }[] = [];

	let claimed: number[] = [];
	const claim = (crack: Crack, x: number, y: number) => {
		const cell = cellOf(x, y);
		if (owner[cell] !== 0) return;
		owner[cell] = crack.id;
		claimed.push(cell);
	};
	const keep = (crack: Crack, x: number, y: number, heading: number) => {
		crack.points.push([x, y]);
		crack.headings.push(heading);
		if (crack.generation < 4) sites.push({ crack, index: crack.points.length - 1 });
	};

	/** Nearest foreign crack cell within two cells, or null. */
	const neighbour = (crack: Crack, x: number, y: number, ignoreParent: boolean): Point | null => {
		const cx = Math.floor(x / CELL);
		const cy = Math.floor(y / CELL);
		let best: Point | null = null;
		let bestDistance = Number.POSITIVE_INFINITY;
		for (let dy = -2; dy <= 2; dy++) {
			for (let dx = -2; dx <= 2; dx++) {
				const gx = cx + dx;
				const gy = cy + dy;
				if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) continue;
				const id = owner[gy * GRID + gx];
				if (id === 0 || id === crack.id || (ignoreParent && id === crack.parent)) continue;
				const px = (gx + 0.5) * CELL;
				const py = (gy + 0.5) * CELL;
				const distance = Math.hypot(px - x, py - y);
				if (distance < bestDistance) {
					bestDistance = distance;
					best = [px, py];
				}
			}
		}
		return best;
	};

	// Primaries: the surviving words, cracked in along their lines.
	const primaries: string[] = [];
	for (const word of WORDS) {
		if (word.eaten) continue;
		const crack: Crack = { id: cracks.length + 1, parent: 0, generation: 0, points: [], headings: [] };
		const cy = word.y + word.h / 2;
		const steps = Math.max(3, Math.round((word.w - 4) / 7));
		let drift = 0;
		for (let i = 0; i <= steps; i++) {
			drift = Math.max(-4, Math.min(4, drift + (random() - 0.5) * 3));
			const zig = (i % 2 ? 1 : -1) * random() * 2.2;
			keep(crack, word.x + 2 + ((word.w - 4) * i) / steps, cy + drift + zig, 0);
		}
		crack.points.forEach(([x, y], i) => {
			const [nx, ny] = crack.points[Math.min(i + 1, crack.points.length - 1)];
			for (let t = 0; t < 1; t += 0.25) claim(crack, x + (nx - x) * t, y + (ny - y) * t);
		});
		cracks.push(crack);
		primaries.push(fissure(crack.points, (5.5 + 2 * Math.min(1, word.w / 150)) * (0.9 + random() * 0.2), random));
	}

	/** True when no crack cell lies within `radius` px of (x, y). */
	const empty = (x: number, y: number, radius: number) => {
		const reach = Math.ceil(radius / CELL);
		const cx = Math.floor(x / CELL);
		const cy = Math.floor(y / CELL);
		for (let dy = -reach; dy <= reach; dy++) {
			for (let dx = -reach; dx <= reach; dx++) {
				const gx = cx + dx;
				const gy = cy + dy;
				if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) continue;
				if (owner[gy * GRID + gx] !== 0) return false;
			}
		}
		return true;
	};

	const lines: string[][] = [[], [], [], [], []];
	const grow = (parent: number, generation: number, start: Point, direction: number): Crack | null => {
		let heading = direction;
		const crack: Crack = {
			id: cracks.length + 1,
			parent,
			generation,
			points: [start],
			headings: [heading],
		};
		const maxLength = 30 + random() * 90;
		const bend = (random() - 0.5) * 0.03;
		let [x, y] = start;
		let travelled = 0;
		let end: Point | null = null;
		let crowded = false;
		claimed = [];
		while (travelled < maxLength) {
			heading += bend + (random() - 0.5) * 0.16;
			x += Math.cos(heading) * 2;
			y += Math.sin(heading) * 2;
			travelled += 2;
			if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || edgeDistance(x, y) < -2) {
				end = [x, y];
				break;
			}
			if (nearEye(x, y)) break;
			const near = travelled > 6 ? neighbour(crack, x, y, travelled < 16) : null;
			if (near) {
				if (travelled < 16) crowded = true;
				else end = near;
				break;
			}
			claim(crack, x, y);
			if (Math.round(travelled) % 10 === 0) keep(crack, x, y, heading);
		}
		if (crowded || travelled < 14 || (!end && travelled < 26)) {
			for (const cell of claimed) owner[cell] = 0;
			sites.splice(sites.length - (crack.points.length - 1));
			return null;
		}
		keep(crack, ...(end ?? [x, y]), heading);
		cracks.push(crack);
		lines[generation].push(pathOf(crack.points));
		return crack;
	};

	// Secondaries: branch off existing cracks into open glaze, or start fresh
	// in open glaze, and grow until they meet another crack or the rim.
	for (let attempt = 0; attempt < 5000; attempt++) {
		if (random() < 0.3) {
			const x = random() * SIZE;
			const y = 180 + random() * (SIZE - 180);
			if (edgeDistance(x, y) < 12 || nearEye(x, y) || !empty(x, y, ROOM)) continue;
			const heading = random() * Math.PI * 2;
			const first = grow(0, 1, [x, y], heading);
			if (first) grow(first.id, 1, [x, y], heading + Math.PI);
			continue;
		}
		const { crack: parent, index } = sites[Math.floor(random() * sites.length)];
		const [sx, sy] = parent.points[index];
		const side = random() < 0.5 ? -1 : 1;
		const heading = parent.headings[index] + side * (Math.PI / 2 + (random() - 0.5) * 0.9);
		const open = [0.7, 1.5].every((ahead) =>
			empty(sx + Math.cos(heading) * ROOM * ahead, sy + Math.sin(heading) * ROOM * ahead, ROOM * 0.75),
		);
		if (!open) continue;
		grow(parent.id, parent.generation + 1, [sx, sy], heading);
	}

	return { primaries: primaries.join(""), secondaries: lines.map((paths) => paths.join("")) };
}

/** Tiny round dots, one zero-length subpath each. */
function dots(points: readonly Point[]): string {
	return points.map(([x, y]) => `M${n(x, 0)} ${n(y, 0)}h0`).join("");
}

function groundPoint(random: () => number): Point {
	for (;;) {
		const x = random() * SIZE;
		const y = random() * SIZE;
		if (isEaten(x, y)) return [x, y];
	}
}

function render(): string {
	const random = rng(20260924);

	// The night: fine dust everywhere in the bites.
	const fine: Point[] = [];
	const coarse: Point[] = [];
	for (let i = 0; i < 900; i++) fine.push(groundPoint(random));
	for (let i = 0; i < 220; i++) coarse.push(groundPoint(random));

	// Pinholes in the glaze.
	const pinholes: Point[] = [];
	while (pinholes.length < 160) {
		const x = random() * SIZE;
		const y = 190 + random() * (SIZE - 190);
		if (edgeDistance(x, y) > 3) pinholes.push([x, y]);
	}

	// Eaten words, crumbled into flecks along their old lines.
	const crumbs = { processed: [] as string[], unknown: [] as string[] };
	for (const word of WORDS) {
		if (!word.eaten) continue;
		const count = Math.round((word.w * word.h) / 45);
		for (let i = 0; i < count; i++) {
			const x = word.x + 3 + random() * (word.w - 6);
			const y = word.y + word.h / 2 + (random() + random() - 1) * word.h * 0.45;
			if (!isEaten(x, y)) continue;
			const angle = (random() - 0.5) * 0.5;
			const length = random() < 0.35 ? 0 : 2 + random() * 6;
			crumbs[word.eaten].push(
				`M${n(x)} ${n(y)}l${n(Math.cos(angle) * length)} ${n(Math.sin(angle) * length)}`,
			);
		}
	}

	// Chips of glaze the bites broke off, lying just outside the rims.
	const chips: string[] = [];
	for (let i = 0; i < 4000 && chips.length < 46; i++) {
		const [x, y] = groundPoint(random);
		const depth = -edgeDistance(x, y);
		if (y < 170 || depth < 9 || random() > Math.exp(-(depth - 9) / 14)) continue;
		const corners = 3 + Math.floor(random() * 2);
		const turn = random() * Math.PI * 2;
		const size = 2.5 + random() * 3.5;
		const outline: Point[] = [];
		for (let c = 0; c < corners; c++) {
			const angle = turn + (c / corners) * Math.PI * 2 + (random() - 0.5) * 0.8;
			const radius = size * (0.6 + random() * 0.6);
			outline.push([x + Math.cos(angle) * radius, y + Math.sin(angle) * radius]);
		}
		chips.push(`${pathOf(outline)}Z`);
	}

	const { primaries, secondaries } = crackle(rng(CRACKLE_SEED));
	const widths = [0, 2.8, 2, 1.4, 1];

	return svgDocument({
		title: "textfresser, night crackle",
		desc: "Six circular bites turn the page into a night sky full of word crumbs; what survives is a turquoise textfresser crazed with ink cracks, its last words cracked into the glaze.",
		defs: `${groundClip("ground")}${creatureMask("creature")}`,
		body: `  <rect width="${SIZE}" height="${SIZE}" fill="${TEAL}"/>
  <g clip-path="url(#ground)">
    <rect width="${SIZE}" height="${SIZE}" fill="${NIGHT}"/>
    <path d="${dots(fine)}" stroke="${DUST}" stroke-width="2" stroke-linecap="round"/>
    <path d="${dots(coarse)}" stroke="${DUST}" stroke-width="3.4" stroke-linecap="round"/>
    <path d="${chips.join("")}" fill="${TEAL}"/>
    <path d="${crumbs.unknown.join("")}" stroke="${CRUMB.unknown}" stroke-width="3.6" stroke-linecap="round" fill="none"/>
    <path d="${crumbs.processed.join("")}" stroke="${CRUMB.processed}" stroke-width="3.6" stroke-linecap="round" fill="none"/>
  </g>
  <g mask="url(#creature)" fill="none" stroke="${NIGHT}" stroke-linecap="round" stroke-linejoin="round">
    <path d="${dots(pinholes)}" stroke="${PINHOLE}" stroke-width="2.4"/>
${secondaries
	.map((d, generation) =>
		d ? `    <path d="${d}" stroke-width="${widths[generation]}"/>\n` : "",
	)
	.join("")}    <path d="${primaries}" fill="${NIGHT}" stroke="none"/>
  </g>
  <circle cx="${EYE.cx}" cy="${EYE.cy}" r="${EYE.r}" fill="${NIGHT}"/>`,
	});
}

export default {
	id: "night-speckle",
	title: "night speckle: word crumbs in the dark, raku crackle creature",
	render,
} satisfies Variant;
