/**
 * Shared geometry for textfresser icon variants.
 *
 * Generic helpers (Circle, insideAny, circlesClip, circlesHole, textLines,
 * regions) work for any composition. BITES, EYE and WORDS are the shipped
 * composition: the creature is whatever survives of the page after six equal
 * circular bites (from `img/code/optimal_circles.json`).
 */
import circles from "../../code/optimal_circles.json";

export const SIZE = 640;

export type BiteRole = keyof typeof circles.circles_by_role;

export type Circle = {
	readonly cx: number;
	readonly cy: number;
	readonly r: number;
};

export type Bar = {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
};

export type Bite = Circle & {
	readonly role: BiteRole;
	/** Landing order, the rainbow colour the original sequence gave it. */
	readonly colour: "red" | "orange" | "yellow" | "green" | "blue" | "violet";
};

const LANDING_ORDER = [
	["red", "upper-left"],
	["orange", "above-head"],
	["yellow", "upper-right"],
	["green", "lower-left"],
	["blue", "left-of-head"],
	["violet", "right-of-head"],
] as const;

export const BITES: readonly Bite[] = LANDING_ORDER.map(([colour, role]) => {
	const [cx, cy, r] = circles.circles_by_role[role];
	return { role, colour, cx, cy, r };
});

export const EYE = { cx: 407.5, cy: 262, r: 15 } as const;

/**
 * `processed` and `unknown` words sit in the bitten ground (the original
 * shades them light and dark blue); `null` words survive on the creature.
 */
export type Word = Bar & {
	readonly eaten: "processed" | "unknown" | null;
};

export const WORDS: readonly Word[] = (
	[
		[178, 54, 117, 31, "processed"],
		[334, 54, 121, 31, "unknown"],
		[72, 150, 187, 31, "unknown"],
		[299, 149, 57, 32, "processed"],
		[398, 150, 76, 31, "unknown"],
		[521, 148, 40, 31, "processed"],
		[31, 246, 122, 32, "processed"],
		[192, 247, 144, 30, "unknown"],
		[28, 331, 99, 31, "unknown"],
		[159, 330, 112, 32, "processed"],
		[68, 442, 44, 31, "unknown"],
		[194, 441, 174, 31, null],
		[405, 441, 153, 31, null],
		[152, 529, 93, 31, null],
		[285, 529, 106, 31, null],
		[432, 529, 51, 31, null],
	] as const
).map(([x, y, w, h, eaten]) => ({ x, y, w, h, eaten }));

export function insideAny(
	circles: readonly Circle[],
	x: number,
	y: number,
): boolean {
	return circles.some(
		({ cx, cy, r }) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r,
	);
}

/** Distance to the edge of the union of `circles`; negative inside it. */
export function distanceToEdge(
	circles: readonly Circle[],
	x: number,
	y: number,
): number {
	let nearest = Number.POSITIVE_INFINITY;
	for (const { cx, cy, r } of circles) {
		nearest = Math.min(nearest, Math.hypot(x - cx, y - cy) - r);
	}
	return nearest;
}

/** True inside any shipped bite: the ground, not the creature. */
export function isEaten(x: number, y: number): boolean {
	return insideAny(BITES, x, y);
}

/** Distance to the shipped silhouette edge; negative inside the bites. */
export function edgeDistance(x: number, y: number): number {
	return distanceToEdge(BITES, x, y);
}

/**
 * Ragged lines of word bars filling a box, like a page of text.
 * Bars never cross the box's right edge.
 */
export function textLines({
	seed,
	x = 40,
	y = 40,
	width = SIZE - 80,
	height = SIZE - 80,
	lineGap = 44,
	barHeight = 18,
	minWord = 18,
	maxWord = 110,
	wordGap = 14,
	rag = 0.18,
}: {
	seed: number;
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	lineGap?: number;
	barHeight?: number;
	minWord?: number;
	maxWord?: number;
	wordGap?: number;
	/** Largest share of a line left empty at its end. */
	rag?: number;
}): Bar[] {
	const random = rng(seed);
	const bars: Bar[] = [];
	for (let top = y; top + barHeight <= y + height; top += lineGap) {
		const end = x + width * (1 - random() * rag);
		let left = x;
		while (left + minWord <= end) {
			const w = Math.min(
				minWord + random() * (maxWord - minWord),
				end - left,
			);
			bars.push({ x: left, y: top, w, h: barHeight });
			left += w + wordGap;
		}
	}
	return bars;
}

/**
 * Areas (px², largest first) of the connected regions where `inside` holds,
 * sampled every `step` px across the canvas. More than one entry usually
 * means a stray sliver.
 */
export function regions(
	inside: (x: number, y: number) => boolean,
	step = 1,
): number[] {
	const cells = Math.ceil(SIZE / step);
	const filled = new Uint8Array(cells * cells);
	for (let row = 0; row < cells; row++) {
		for (let column = 0; column < cells; column++) {
			if (inside((column + 0.5) * step, (row + 0.5) * step)) {
				filled[row * cells + column] = 1;
			}
		}
	}
	const areas: number[] = [];
	const stack: number[] = [];
	for (let start = 0; start < filled.length; start++) {
		if (filled[start] !== 1) continue;
		filled[start] = 2;
		stack.push(start);
		let count = 0;
		while (stack.length) {
			const index = stack.pop() as number;
			count++;
			const column = index % cells;
			const neighbours = [
				index - cells,
				index + cells,
				column > 0 ? index - 1 : -1,
				column < cells - 1 ? index + 1 : -1,
			];
			for (const next of neighbours) {
				if (next >= 0 && next < filled.length && filled[next] === 1) {
					filled[next] = 2;
					stack.push(next);
				}
			}
		}
		areas.push(count * step * step);
	}
	return areas.sort((a, b) => b - a);
}

/** Deterministic PRNG (mulberry32) so every render of a variant is identical. */
export function rng(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Short numbers keep generated SVGs small. */
export function n(value: number, digits = 1): string {
	return String(Number(value.toFixed(digits)));
}

function circleElements(circles: readonly Circle[], fill = ""): string {
	const paint = fill ? ` fill="${fill}"` : "";
	return circles
		.map(
			({ cx, cy, r }) =>
				`<circle cx="${n(cx, 2)}" cy="${n(cy, 2)}" r="${n(r, 2)}"${paint}/>`,
		)
		.join("");
}

/** `<clipPath>` of the union of `circles`. */
export function circlesClip(id: string, circles: readonly Circle[]): string {
	return `<clipPath id="${id}">${circleElements(circles)}</clipPath>`;
}

/** `<mask>` showing everything except the union of `circles`. */
export function circlesHole(id: string, circles: readonly Circle[]): string {
	return `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${SIZE}" height="${SIZE}"><rect width="${SIZE}" height="${SIZE}" fill="#fff"/>${circleElements(circles, "#000")}</mask>`;
}

/** `<clipPath>` covering the shipped bitten ground. */
export function groundClip(id: string): string {
	return circlesClip(id, BITES);
}

/** `<mask>` showing only the shipped creature (the page minus the bites). */
export function creatureMask(id: string): string {
	return circlesHole(id, BITES);
}

export function svgDocument({
	title,
	desc,
	defs = "",
	body,
}: {
	title: string;
	desc: string;
	defs?: string;
	body: string;
}): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
  <title>${title}</title>
  <desc>${desc}</desc>
  <defs>${defs}</defs>
${body}
</svg>
`;
}

export type Variant = {
	/** Kebab-case, unique; also the output file name. */
	readonly id: string;
	readonly title: string;
	/** Returns a complete SVG document. */
	render(): string;
};
