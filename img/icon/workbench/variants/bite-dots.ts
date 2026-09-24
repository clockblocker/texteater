import {
	creatureMask,
	EYE,
	edgeDistance,
	groundClip,
	n,
	rng,
	SIZE,
	svgDocument,
	type Variant,
	WORDS,
	type Word,
} from "../kit";

/**
 * Circles all the way down: six bites carve the creature, the creature is
 * a rosette of overlapping feather-scales ringed around its eye, the eaten
 * ground is a graded field of raised dots, and every word is braille.
 */

const GROUND = "#8c3f27";
const HALFTONE = "#b8623f";
const SHADOW = "#5f2515";
const PAPER = "#f2e6cc";
const SCALE_TONES = ["#f5ebd4", "#efe1c4", "#e8d5b2"];
const SCALE_LINE = "#b5804f";
const INK = "#2e211b";
const WORD_INK = {
	processed: "#f2dcae",
	unknown: "#3a221a",
	kept: INK,
} as const;

type Dot = { x: number; y: number; r: number };

/**
 * Dots as round-capped, near-zero-length strokes, one path per dot size.
 * Without a colour the paths inherit their stroke, so a `<use>` can recolour
 * them (the shadows under the raised dots).
 */
function dotPaths(dots: readonly Dot[], colour?: string): string {
	const bySize = new Map<string, string[]>();
	for (const { x, y, r } of dots) {
		const width = n(r * 2, 1);
		const list = bySize.get(width) ?? [];
		list.push(`M${n(x, 0)} ${n(y, 0)}h.01`);
		bySize.set(width, list);
	}
	const stroke = colour ? ` stroke="${colour}"` : "";
	return [...bySize]
		.map(
			([width, moves]) =>
				`<path${stroke} stroke-width="${width}" d="${moves.join("")}"/>`,
		)
		.join("");
}

function nearWord(x: number, y: number, margin: number): boolean {
	return WORDS.some(
		(word) =>
			x > word.x - margin &&
			x < word.x + word.w + margin &&
			y > word.y - margin &&
			y < word.y + word.h + margin,
	);
}

/** Dots grow with depth into the bite, so the bite rim stays darkest. */
function halftone(random: () => number): Dot[] {
	const pitch = 16;
	const rowStep = pitch * 0.866;
	const dots: Dot[] = [];
	for (let row = 0; row * rowStep < SIZE + pitch; row++) {
		const y = row * rowStep;
		for (let col = -1; col * pitch < SIZE + pitch; col++) {
			const x = col * pitch + (row % 2 ? pitch / 2 : 0);
			const depth = -edgeDistance(x, y);
			if (depth < 3 || nearWord(x, y, 5)) continue;
			const t = Math.min(1, depth / 170);
			const r = 1.1 + 3.6 * t * t * (3 - 2 * t) + (random() - 0.5) * 0.5;
			dots.push({
				x: x + (random() - 0.5) * 1.8,
				y: y + (random() - 0.5) * 1.8,
				r: Math.round(r * 4) / 4,
			});
		}
	}
	return dots;
}

/** A word as a run of braille cells (2 x 3 dots, 3 to 5 raised) filling its bar. */
function braille(word: Word, random: () => number): Dot[] {
	const dotPitch = 10;
	const cellPitch = 23;
	const cells = Math.max(
		1,
		Math.floor((word.w - 6 + cellPitch - dotPitch) / cellPitch),
	);
	const span = cells * cellPitch - (cellPitch - dotPitch);
	const left = word.x + (word.w - span) / 2;
	const middle = word.y + word.h / 2;
	const dots: Dot[] = [];
	for (let cell = 0; cell < cells; cell++) {
		let pattern = 0;
		let raised = 0;
		while (raised < 3 || raised > 5) {
			pattern = Math.floor(random() * 64);
			raised = [...pattern.toString(2)].filter((bit) => bit === "1").length;
		}
		for (let bit = 0; bit < 6; bit++) {
			if (!(pattern & (1 << bit))) continue;
			dots.push({
				x:
					left +
					cell * cellPitch +
					(bit < 3 ? 0 : dotPitch) +
					(random() - 0.5) * 1.2,
				y: middle + ((bit % 3) - 1) * dotPitch + (random() - 0.5) * 1.2,
				r: 3.9 + (random() - 0.5) * 0.5,
			});
		}
	}
	return dots;
}

/**
 * Feather-scales in rings around the eye, outermost first so each inner
 * scale overlaps the one outside it and only outward arcs show. Small at
 * the face, broad on the body.
 */
function feathers(random: () => number): string {
	const rings: string[] = [];
	let radius = 42;
	for (let ring = 0; radius < 620; ring++) {
		const scale = Math.min(26, 14 + ring * 1.2);
		const count = Math.ceil((2 * Math.PI * radius) / (scale * 1.55));
		const phase = random() * Math.PI * 2;
		const byTone = SCALE_TONES.map(() => [] as string[]);
		for (let i = 0; i < count; i++) {
			const angle = phase + (i / count) * Math.PI * 2;
			const cx = EYE.cx + Math.cos(angle) * radius + (random() - 0.5) * 3;
			const cy = EYE.cy + Math.sin(angle) * radius + (random() - 0.5) * 3;
			const r = scale + (random() - 0.5) * 2.4;
			const tone = Math.floor(random() * SCALE_TONES.length);
			if (cx < -r || cx > SIZE + r || cy < -r || cy > SIZE + r) continue;
			if (edgeDistance(cx, cy) < -r) continue;
			byTone[tone]?.push(
				`<circle cx="${n(cx, 0)}" cy="${n(cy, 0)}" r="${n(r)}"/>`,
			);
		}
		const width = n(1.6 + random() * 1);
		const groups = byTone
			.map((circles, tone) =>
				circles.length
					? `<g fill="${SCALE_TONES[tone]}">${circles.join("")}</g>`
					: "",
			)
			.join("");
		if (groups) rings.push(`<g stroke-width="${width}">${groups}</g>`);
		radius += scale * 0.95;
	}
	return rings.reverse().join("");
}

function render(): string {
	const random = rng(2024);

	const creature = feathers(random);
	const kept = WORDS.filter(({ eaten }) => !eaten).flatMap((word) =>
		braille(word, random),
	);
	const eaten = (state: "processed" | "unknown") =>
		WORDS.filter((word) => word.eaten === state).flatMap((word) =>
			braille(word, random),
		);
	const processed = eaten("processed");
	const unknown = eaten("unknown");

	// Kept braille sits in small wells of plain page, clear of the scale lines.
	const keptWords =
		dotPaths(
			kept.map((dot) => ({ ...dot, r: dot.r + 2.6 })),
			PAPER,
		) + dotPaths(kept, WORD_INK.kept);

	// Light dots are raised: each casts a shadow down and to the right.
	const groundDots = `<g stroke="${SHADOW}" transform="translate(1.3 1.8)"><use href="#halftone"/><use href="#processed"/></g><g stroke="${HALFTONE}"><g id="halftone">${dotPaths(halftone(random))}</g></g><g stroke="${WORD_INK.processed}"><g id="processed">${dotPaths(processed)}</g></g>${dotPaths(unknown, WORD_INK.unknown)}`;

	return svgDocument({
		title: "textfresser, bitten dots",
		desc: "Six circular bites eat the page down to a field of raised dots; what survives is a feathered textfresser of overlapping scales ringed around its eye, and every word is braille.",
		defs: `${groundClip("ground")}${creatureMask("creature")}`,
		body: `  <rect width="${SIZE}" height="${SIZE}" fill="${PAPER}"/>
  <g mask="url(#creature)"><g stroke="${SCALE_LINE}">${creature}</g><circle cx="${EYE.cx}" cy="${EYE.cy}" r="21" fill="${SCALE_TONES[0]}"/><g fill="none" stroke-linecap="round">${keptWords}</g></g>
  <g clip-path="url(#ground)"><rect width="${SIZE}" height="${SIZE}" fill="${GROUND}"/><g fill="none" stroke-linecap="round">${groundDots}</g></g>
  <circle cx="${EYE.cx}" cy="${EYE.cy}" r="${EYE.r}" fill="${INK}"/>`,
	});
}

export default {
	id: "bite-dots",
	title: "bitten dots: raised-dot ground, feather-scale rosette, braille words",
	render,
} satisfies Variant;
