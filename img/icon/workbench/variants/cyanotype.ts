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
	type Word,
} from "../kit";

/**
 * Cyanotype: every line of the page is a pressed fern frond, its words leaf
 * clusters and its spaces bare stem. On the page the lines lie straight,
 * Prussian ink on cream. Where a bite lands the print turns to its negative
 * and the lines come loose: the deeper in the bite, the more they wave, and
 * they roll up into fiddleheads. Processed words are fully exposed (cream),
 * unknown ones only half (pale blue). The eye sits on a line, like its full stop.
 */

const PAPER = "#f0e7d2";
const PRUSSIAN = "#173a6f";
const DEEP = "#0d2850";
const WASH = "#3868a8";
const HALF = "#8eaad3";
const INK = "#1b3f78";

type Point = readonly [number, number];
type Random = () => number;
type Row = { readonly y: number; readonly words: readonly Word[] };

/** Smooth path through points (quadratic midpoints). */
function smooth(points: readonly Point[]): string {
	const [first, ...rest] = points;
	if (!first) return "";
	let d = `M${n(first[0])} ${n(first[1])}`;
	for (let i = 0; i < rest.length - 1; i++) {
		const [x, y] = rest[i] as Point;
		const [nx, ny] = rest[i + 1] as Point;
		d += `Q${n(x)} ${n(y)} ${n((x + nx) / 2)} ${n((y + ny) / 2)}`;
	}
	const last = rest.at(-1);
	if (last) d += `L${n(last[0])} ${n(last[1])}`;
	return d;
}

/** Almond leaf from its base along `angle` (radians, 0 = +x, y down). */
function leaf([bx, by]: Point, angle: number, length: number, width: number): string {
	const dx = Math.cos(angle);
	const dy = Math.sin(angle);
	const mx = bx + dx * length * 0.42;
	const my = by + dy * length * 0.42;
	const px = -dy * width;
	const py = dx * width;
	return `M${n(bx)} ${n(by)}Q${n(mx + px)} ${n(my + py)} ${n(bx + dx * length)} ${n(by + dy * length)}Q${n(mx - px)} ${n(my - py)} ${n(bx)} ${n(by)}Z`;
}

/**
 * Fiddlehead leaving `end` along `heading`, rolling towards `side`
 * (-1 turns left on screen, i.e. up when heading right).
 */
function curl(end: Point, heading: number, side: 1 | -1, radius: number, turns: number): Point[] {
	const toCentre = heading + (side * Math.PI) / 2;
	const cx = end[0] + Math.cos(toCentre) * radius;
	const cy = end[1] + Math.sin(toCentre) * radius;
	const start = toCentre + Math.PI;
	const total = turns * Math.PI * 2;
	const points: Point[] = [];
	for (let t = 0.4; t <= total; t += 0.4) {
		const rho = radius * (1 - (0.72 * t) / total);
		const a = start + side * t;
		points.push([cx + Math.cos(a) * rho, cy + Math.sin(a) * rho]);
	}
	return points;
}

/** Words grouped into the page's lines. */
function rows(): Row[] {
	const result: { y: number; words: Word[] }[] = [];
	for (const word of WORDS) {
		const cy = word.y + word.h / 2;
		const row = result.find((candidate) => Math.abs(candidate.y - cy) < 10);
		if (row) row.words.push(word);
		else result.push({ y: cy, words: [word] });
	}
	for (const row of result) row.words.sort((a, b) => a.x - b.x);
	return result;
}

/** 0 on the page, rising to 1 deep inside the bites: the further eaten, the looser. */
function looseness(x: number, y: number): number {
	const depth = Math.min(1, Math.max(0, -edgeDistance(x, y) / 130));
	return depth * (2 - depth);
}

type Ink = { stem: string; leaves: string };
type Prints = { page: Ink; processed: Ink; unknown: Ink; stems: string };

/** One line of text as a frond: straight on the page, waving and curling where eaten. */
function line(random: Random, { y: cy, words }: Row, prints: Prints): void {
	const first = words[0] as Word;
	const last = words.at(-1) as Word;
	const x0 = first.x + 3;
	const x1 = last.x + last.w - 3;
	const h = first.h;
	const phase = random() * Math.PI * 2;
	const period = 24 + random() * 10;
	const drift = random() * Math.PI * 2;
	const stemY = (x: number) => {
		const loose = looseness(x, cy);
		return (
			cy +
			Math.sin(phase + x / period) * 4.5 * loose +
			Math.sin(drift + x / 75) * 5 * loose +
			Math.sin(phase * 3 + x / 47) * 1.1
		);
	};

	const points: Point[] = [];
	const steps = Math.max(3, Math.round((x1 - x0) / 11));
	for (let i = 0; i <= steps; i++) {
		const x = x0 + ((x1 - x0) * i) / steps;
		points.push([x, stemY(x)]);
	}
	const side = () => (random() < 0.5 ? 1 : -1);
	const radius = h * (0.28 + random() * 0.08);
	if (isEaten(x1, cy)) {
		const [ax, ay] = points.at(-2) as Point;
		const [bx, by] = points.at(-1) as Point;
		points.push(...curl([bx, by], Math.atan2(by - ay, bx - ax), side(), radius, 0.9 + random() * 0.15));
	}
	if (isEaten(x0, cy)) {
		const [ax, ay] = points[1] as Point;
		const [bx, by] = points[0] as Point;
		points.unshift(...curl([bx, by], Math.atan2(by - ay, bx - ax), side(), radius * 0.85, 0.85 + random() * 0.15).reverse());
	}
	const stem = smooth(points);
	const inGround = points.some(([x, y]) => isEaten(x, y));
	const onPage = points.some(([x, y]) => !isEaten(x, y));
	if (inGround) prints.stems += stem;
	if (onPage) prints.page.stem += stem;

	for (const word of words) {
		const curled = (x: number) => isEaten(x, cy) && (x === x0 || x === x1);
		const start = word.x + (curled(x0) && word === first ? 12 : 6);
		const end = word.x + word.w - (curled(x1) && word === last ? 12 : 5);
		let up = random() < 0.5;
		for (let x = start + random() * 2; x < end; ) {
			const ascender = random() < 0.16 ? 1.28 : 1;
			const length = h * (0.4 + random() * 0.15) * ascender;
			const lean = 0.55 + (random() - 0.5) * 0.35 + looseness(x, cy) * (random() - 0.5) * 0.5;
			const angle = up ? -Math.PI / 2 + lean : Math.PI / 2 - lean;
			const base: Point = [x, stemY(x)];
			const shape = leaf(base, angle, length, length * 0.3);
			const edge = edgeDistance(x, cy);
			if (edge < length) prints[word.eaten ?? "processed"].leaves += shape;
			if (edge > -length) prints.page.leaves += shape;
			up = !up;
			x += random() < 0.1 ? 10 + random() * 4 : 6 + random() * 2.5;
		}
	}
}

type Coat = { wide: string; narrow: string; shadow: string; streaks: string };

/**
 * The emulsion coat: broad, faint diagonal brush sweeps with short dry-brush
 * striations, the way a cyanotype sheet shows the strokes it was painted with.
 */
function brush(random: Random): Coat {
	const coat: Coat = { wide: "", narrow: "", shadow: "", streaks: "" };
	const reach = 480;
	for (let offset = -470; offset < 470; offset += 14 + random() * 16) {
		const a = -0.55 + (random() - 0.5) * 0.1;
		const ux = Math.cos(a);
		const uy = Math.sin(a);
		const ox = SIZE / 2 - uy * offset;
		const oy = SIZE / 2 + ux * offset;
		const sag = (random() - 0.5) * 18;
		const band = `M${n(ox - ux * reach)} ${n(oy - uy * reach)}Q${n(ox - uy * sag)} ${n(oy + ux * sag)} ${n(ox + ux * reach)} ${n(oy + uy * reach)}`;
		const pick = random();
		if (pick < 0.4) coat.wide += band;
		else if (pick < 0.75) coat.narrow += band;
		else coat.shadow += band;
		const count = 3 + Math.floor(random() * 4);
		for (let i = 0; i < count; i++) {
			const shift = (random() - 0.5) * 20;
			const t = (random() - 0.5) * 2 * reach * 0.8;
			const length = 50 + random() * 220;
			const tilt = (random() - 0.5) * 0.03;
			const sx = ox - uy * shift + ux * t;
			const sy = oy + ux * shift + uy * t;
			coat.streaks += `M${n(sx)} ${n(sy)}l${n((ux - uy * tilt) * length)} ${n((uy + ux * tilt) * length)}`;
		}
	}
	return coat;
}

function render(): string {
	const random = rng(1842);
	const prints: Prints = {
		page: { stem: "", leaves: "" },
		processed: { stem: "", leaves: "" },
		unknown: { stem: "", leaves: "" },
		stems: "",
	};
	for (const row of rows()) line(random, row, prints);
	const coat = brush(random);

	return svgDocument({
		title: "textfresser, cyanotype",
		desc: "A cyanotype page whose lines are pressed fern fronds, words as leaf clusters. Six circular bites expose the page to light: there the print turns Prussian blue and the eaten lines loosen and curl as pale photograms. What stays cream is the textfresser; its eye is the full stop of a line.",
		defs: `${groundClip("ground")}${creatureMask("creature")}`,
		body: `  <rect width="${SIZE}" height="${SIZE}" fill="${PAPER}"/>
  <g clip-path="url(#ground)">
    <rect width="${SIZE}" height="${SIZE}" fill="${PRUSSIAN}"/>
    <g fill="none" stroke-linecap="round">
      <path d="${coat.wide}" stroke="${WASH}" stroke-width="22" opacity=".13"/>
      <path d="${coat.narrow}" stroke="${WASH}" stroke-width="9" opacity=".18"/>
      <path d="${coat.shadow}" stroke="${DEEP}" stroke-width="16" opacity=".35"/>
      <path d="${coat.streaks}" stroke="${DEEP}" stroke-width="1.5" opacity=".6"/>
    </g>
    <path d="${prints.stems}" fill="none" stroke="${HALF}" stroke-width="2.3" stroke-linecap="round"/>
    <path d="${prints.unknown.leaves}" fill="${HALF}"/>
    <path d="${prints.processed.leaves}" fill="${PAPER}"/>
  </g>
  <g mask="url(#creature)">
    <path d="${prints.page.stem}" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <path d="${prints.page.leaves}" fill="${INK}"/>
  </g>
  <circle cx="${EYE.cx}" cy="${EYE.cy}" r="${EYE.r}" fill="${INK}"/>
  <circle cx="${n(EYE.cx - EYE.r * 0.35)}" cy="${n(EYE.cy - EYE.r * 0.35)}" r="${n(EYE.r * 0.26)}" fill="${PAPER}"/>`,
	});
}

export default { id: "cyanotype", title: "cyanotype: fern-frond lines, eaten into negative", render } satisfies Variant;
