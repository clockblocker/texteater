import {
	BITES,
	type Bite,
	type BiteRole,
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
 * Metro lines: the page is pale grid paper crossed by a sparse transit map;
 * the creature is a dense trunk of coloured lines running up through it.
 * Its surviving words are interchange capsules, its eye a station ring.
 */

const PAPER = "#eef0e6";
const GRID = "#d8ded0";
const INK = "#1d1b20";

/** Deep metro colours for the trunk: dark enough to hold tone when small. */
const TRUNK = [
	"#b8352b",
	"#b8352b",
	"#2a4c98",
	"#2a4c98",
	"#1c2649",
	"#1c2649",
	"#1d1b20",
	"#1d1b20",
	"#24734c",
	"#24734c",
	"#c8741c",
	"#5d4191",
	"#1b6479",
	"#6e3824",
	"#b38a26",
];

type Point = readonly [number, number];

/** A polyline with rounded corners, the way transit maps turn. */
function roundedPath(points: readonly Point[], radius: number): string {
	const [first, ...rest] = points;
	if (!first) return "";
	let d = `M${n(first[0])} ${n(first[1])}`;
	for (let i = 0; i < rest.length; i++) {
		const corner = rest[i] as Point;
		const next = rest[i + 1];
		if (!next) {
			d += `L${n(corner[0])} ${n(corner[1])}`;
			break;
		}
		const previous = (i === 0 ? first : rest[i - 1]) as Point;
		const inLength = Math.hypot(corner[0] - previous[0], corner[1] - previous[1]);
		const outLength = Math.hypot(next[0] - corner[0], next[1] - corner[1]);
		const r = Math.min(radius, inLength / 2, outLength / 2);
		const a: Point = [
			corner[0] - ((corner[0] - previous[0]) / inLength) * r,
			corner[1] - ((corner[1] - previous[1]) / inLength) * r,
		];
		const b: Point = [
			corner[0] + ((next[0] - corner[0]) / outLength) * r,
			corner[1] + ((next[1] - corner[1]) / outLength) * r,
		];
		d += `L${n(a[0])} ${n(a[1])}Q${n(corner[0])} ${n(corner[1])} ${n(b[0])} ${n(b[1])}`;
	}
	return d;
}

function gridPaper(): string {
	let d = "";
	for (let v = 16; v < SIZE; v += 16) d += `M${v} 0V${SIZE}M0 ${v}H${SIZE}`;
	return `<path d="${d}" stroke="${GRID}" stroke-width="1" fill="none"/>`;
}

/** The sparse map left in the bitten ground; horizontals sit on the eaten rows. */
const ROUTES: readonly { colour: string; points: readonly Point[] }[] = [
	{ colour: "#c9463a", points: [[-10, 166], [232, 166], [328, 70], [650, 70]] },
	{ colour: "#e08a2c", points: [[96, -10], [96, 262], [180, 346], [180, 420]] },
	{ colour: "#3c8a58", points: [[560, -10], [560, 118], [592, 150], [592, 420]] },
	{ colour: "#2f62a8", points: [[-10, 262], [300, 262]] },
	{ colour: "#7a55a3", points: [[-10, 346], [120, 346], [200, 426]] },
	{ colour: "#c9a02e", points: [[410, -10], [410, 118], [448, 156], [650, 156]] },
];

const STATIONS: readonly Point[] = [
	[96, 166],
	[96, 262],
	[410, 70],
	[560, 70],
	[40, 346],
	[592, 262],
];

function groundMap(random: () => number): string {
	const lines = ROUTES.map(
		({ colour, points }) =>
			`<path d="${roundedPath(points, 18)}" stroke="${colour}"/>`,
	).join("");
	const ticks: string[] = [];
	for (const { colour, points } of ROUTES) {
		for (let i = 0; i + 1 < points.length; i++) {
			const [x0, y0] = points[i] as Point;
			const [x1, y1] = points[i + 1] as Point;
			const length = Math.hypot(x1 - x0, y1 - y0);
			for (let s = 40 + random() * 30; s < length - 20; s += 60 + random() * 50) {
				const x = x0 + ((x1 - x0) * s) / length;
				const y = y0 + ((y1 - y0) * s) / length;
				if (!isEaten(x, y)) continue;
				const nx = -(y1 - y0) / length;
				const ny = (x1 - x0) / length;
				ticks.push(
					`<path d="M${n(x)} ${n(y)}l${n(nx * 8)} ${n(ny * 8)}" stroke="${colour}"/>`,
				);
			}
		}
	}
	const rings = STATIONS.map(
		([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5"/>`,
	).join("");
	return `<g fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${lines}${ticks.join("")}</g><g fill="${PAPER}" stroke="${INK}" stroke-width="3">${rings}</g>`;
}

/** Which way a line steps when it nears a bite: toward that bite, sideways. */
const STEP: Record<BiteRole, -1 | 0 | 1> = {
	"upper-left": -1,
	"lower-left": -1,
	"left-of-head": -1,
	"above-head": 0,
	"upper-right": 1,
	"right-of-head": 1,
};

function nearestBite(x: number, y: number): Bite {
	let best = BITES[0] as Bite;
	let bestDistance = Number.POSITIVE_INFINITY;
	for (const bite of BITES) {
		const distance = Math.hypot(x - bite.cx, y - bite.cy) - bite.r;
		if (distance < bestDistance) {
			best = bite;
			bestDistance = distance;
		}
	}
	return best;
}

/**
 * One trunk line rising from the bottom edge. Where it comes within `front`
 * of a bite's edge it jogs one pitch sideways toward the bite at 45 degrees,
 * so the jogs stack into bands that follow the bitten outline. Kink heights
 * come from the line's base column, which keeps neighbours from crossing.
 */
function strandPoints(x0: number, fronts: readonly number[], jog: number): Point[] {
	const kinks: { y: number; step: number }[] = [];
	for (const front of fronts) {
		for (let y = SIZE + 10; y > 120; y -= 1) {
			if (edgeDistance(x0, y) > front) continue;
			const step = STEP[nearestBite(x0, y).role];
			if (step !== 0) kinks.push({ y, step });
			break;
		}
	}
	kinks.sort((a, b) => b.y - a.y);
	const points: Point[] = [[x0, SIZE + 10]];
	let x = x0;
	let floor = SIZE + 10;
	for (const { y, step } of kinks) {
		const at = Math.min(y, floor);
		points.push([x, at], [x + step * jog, at - jog]);
		x += step * jog;
		floor = at - jog;
	}
	points.push([x, 120]);
	return points;
}

function trunk(random: () => number): string {
	const pitch = 8;
	const fronts = [16, 52];
	const strands: string[] = [];
	const marks: string[] = [];
	for (let i = -4; i * pitch < SIZE + 4 * pitch; i++) {
		const x0 = i * pitch + 4;
		const colour = TRUNK[Math.floor(random() * TRUNK.length)] as string;
		const width = 5.6 + random() * 1.3;
		const points = strandPoints(x0, fronts, pitch).map(
			([x, y]) => [x + (random() - 0.5) * 0.8, y] as const,
		);
		strands.push(
			`<path d="${roundedPath(points, 5)}" stroke="${colour}" stroke-width="${n(width, 2)}"/>`,
		);
		const count = Math.floor(random() * 3);
		for (let k = 0; k < count; k++) {
			const y = 420 + random() * 220;
			marks.push(`M${n(x0 - 3)} ${n(y)}h6`);
		}
	}
	return `<g fill="none" stroke-linejoin="round">${strands.join("")}</g><path d="${marks.join("")}" stroke="${PAPER}" stroke-width="1.6"/>`;
}

function interchanges(): string {
	return WORDS.filter(({ eaten }) => eaten === null)
		.map(({ x, y, w, h }) => {
			const height = 18;
			const cy = y + h / 2;
			return `<rect x="${n(x + 4)}" y="${n(cy - height / 2)}" width="${n(w - 8)}" height="${height}" rx="${height / 2}"/>`;
		})
		.join("");
}

function render(): string {
	const random = rng(41);
	return svgDocument({
		title: "textfresser, metro lines",
		desc: "Grid paper with a sparse transit map; six circular bites leave a dense trunk of coloured lines standing, the textfresser. Its words are interchange capsules and its eye is a station ring.",
		defs: `${groundClip("ground")}${creatureMask("creature")}`,
		body: `  <rect width="${SIZE}" height="${SIZE}" fill="${PAPER}"/>
  ${gridPaper()}
  <g clip-path="url(#ground)">${groundMap(random)}</g>
  <g mask="url(#creature)">${trunk(random)}<g fill="${PAPER}" stroke="${INK}" stroke-width="4.5">${interchanges()}</g></g>
  <circle cx="${EYE.cx}" cy="${EYE.cy}" r="${EYE.r - 2.5}" fill="${PAPER}" stroke="${INK}" stroke-width="5"/>`,
	});
}

export default {
	id: "metro-lines",
	title: "metro lines: a trunk of coloured lines on grid paper",
	render,
} satisfies Variant;
