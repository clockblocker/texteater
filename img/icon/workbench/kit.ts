/**
 * Shared geometry for textfresser icon variants.
 *
 * The creature is whatever survives of the page after six equal circular
 * bites (from `img/code/optimal_circles.json`). A variant may restyle the
 * page, the bitten ground, the words and the eye, but the silhouette and the
 * eye come from here.
 */
import circles from "../../code/optimal_circles.json";

export const SIZE = 640;

export type BiteRole = keyof typeof circles.circles_by_role;

export type Bite = {
	readonly role: BiteRole;
	/** Landing order, the rainbow colour the original sequence gave it. */
	readonly colour: "red" | "orange" | "yellow" | "green" | "blue" | "violet";
	readonly cx: number;
	readonly cy: number;
	readonly r: number;
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
export type Word = {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
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

/** True inside any bite: the ground, not the creature. */
export function isEaten(x: number, y: number): boolean {
	return BITES.some(
		({ cx, cy, r }) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r,
	);
}

/** Distance from a point to the silhouette edge; negative inside the bites. */
export function edgeDistance(x: number, y: number): number {
	let nearest = Number.POSITIVE_INFINITY;
	for (const { cx, cy, r } of BITES) {
		nearest = Math.min(nearest, Math.hypot(x - cx, y - cy) - r);
	}
	return nearest;
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

/** `<clipPath>` covering the bitten ground. */
export function groundClip(id: string): string {
	const shapes = BITES.map(
		({ cx, cy, r }) =>
			`<circle cx="${n(cx, 2)}" cy="${n(cy, 2)}" r="${n(r, 2)}"/>`,
	).join("");
	return `<clipPath id="${id}">${shapes}</clipPath>`;
}

/** `<mask>` showing only the creature (the page minus the bites). */
export function creatureMask(id: string): string {
	const bites = BITES.map(
		({ cx, cy, r }) =>
			`<circle cx="${n(cx, 2)}" cy="${n(cy, 2)}" r="${n(r, 2)}" fill="#000"/>`,
	).join("");
	return `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${SIZE}" height="${SIZE}"><rect width="${SIZE}" height="${SIZE}" fill="#fff"/>${bites}</mask>`;
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
