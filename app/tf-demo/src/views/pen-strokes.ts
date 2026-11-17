/**
 * The explainer's pen strokes, as SVG path data in viewport pixels: a
 * hand-drawn loop around a word and a hand-drawn arrow between two words.
 * Each stroke wobbles by a seeded random, so it keeps its shape while the
 * page scrolls and differs from word to word.
 */

export type Point = { readonly x: number; readonly y: number };

/** A word's box on screen, as `getBoundingClientRect` gives it. */
export type Box = {
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
};

/** A seeded random in [0, 1), the same sequence for the same seed. */
function seededRandom(seed: string): () => number {
	let state = 2166136261;
	for (const char of seed)
		state = Math.imul(state ^ char.charCodeAt(0), 16777619);
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const round = (value: number) => Math.round(value * 10) / 10;

/** A smooth path through `points` (Catmull-Rom as cubic Béziers). */
function smoothPath(points: readonly Point[]): string {
	const [first] = points;
	if (!first) return "";
	let path = `M${round(first.x)} ${round(first.y)}`;
	for (let at = 0; at < points.length - 1; at += 1) {
		const p0 = points[Math.max(0, at - 1)] as Point;
		const p1 = points[at] as Point;
		const p2 = points[at + 1] as Point;
		const p3 = points[Math.min(points.length - 1, at + 2)] as Point;
		const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
		const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
		path += ` C${round(c1.x)} ${round(c1.y)} ${round(c2.x)} ${round(c2.y)} ${round(p2.x)} ${round(p2.y)}`;
	}
	return path;
}

/** The ellipse a loop around `box` follows, before its wobble. */
function loopEllipse(box: Box) {
	const width = box.right - box.left;
	const height = box.bottom - box.top;
	return {
		cx: (box.left + box.right) / 2,
		cy: (box.top + box.bottom) / 2,
		rx: width / 2 + 4 + height * 0.2,
		ry: height / 2 + 2,
	};
}

/**
 * A pen loop around `box`: an ellipse a little wider than the word, drawn
 * once round and a bit more, its end drifting outward past its start as
 * a quick hand-drawn circle does.
 */
export function loopAround(box: Box, seed: string): string {
	const random = seededRandom(seed);
	const { cx, cy, rx, ry } = loopEllipse(box);
	const start = Math.PI * (0.95 + random() * 0.25);
	const sweep = Math.PI * 2 * (1.1 + random() * 0.06);
	const tilt = (random() - 0.5) * 0.1;
	const steps = 26;
	let wobble = 0;
	const points: Point[] = [];
	for (let step = 0; step <= steps; step += 1) {
		const share = step / steps;
		const angle = start - sweep * share;
		wobble = wobble * 0.6 + (random() - 0.5) * 0.06;
		const scale = 1 + wobble + 0.08 * share;
		const x = rx * scale * Math.cos(angle);
		const y = ry * scale * Math.sin(angle);
		points.push({
			x: cx + x * Math.cos(tilt) - y * Math.sin(tilt),
			y: cy + x * Math.sin(tilt) + y * Math.cos(tilt),
		});
	}
	return smoothPath(points);
}

/** The point of the loop around `box` that faces `toward`, a little outside it. */
export function loopEdgeToward(box: Box, toward: Point): Point {
	const { cx, cy, rx, ry } = loopEllipse(box);
	const angle = Math.atan2((toward.y - cy) / ry, (toward.x - cx) / rx);
	return {
		x: cx + (rx + 3) * Math.cos(angle),
		y: cy + (ry + 3) * Math.sin(angle),
	};
}

/**
 * Where an arrow leaves the pronoun's `box` for `target`: from its top,
 * or its foot when the target sits wholly below it, a little toward the
 * target's side.
 */
export function arrowStart(box: Box, target: Point): Point {
	const cx = (box.left + box.right) / 2;
	const lean = Math.sign(target.x - cx) * (box.right - box.left) * 0.25;
	return {
		x: cx + lean,
		y: target.y > box.bottom ? box.bottom + 2 : box.top - 2,
	};
}

/**
 * A pen arrow from `from` to `to`: a shaft bowing upward, as a hand draws
 * one across text, and an open head of two short strokes along its end.
 */
export function arrowBetween(
	from: Point,
	to: Point,
	seed: string,
): { readonly shaft: string; readonly head: string } {
	const random = seededRandom(seed);
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const distance = Math.hypot(dx, dy) || 1;
	// The normal that points up the screen; a vertical shaft bows to the start side.
	let nx = -dy / distance;
	let ny = dx / distance;
	if (ny > 0 || (ny === 0 && nx > 0)) {
		nx = -nx;
		ny = -ny;
	}
	const bow =
		Math.min(70, Math.max(14, distance * 0.22)) * (0.85 + random() * 0.3);
	const control = {
		x: (from.x + to.x) / 2 + nx * bow,
		y: (from.y + to.y) / 2 + ny * bow,
	};
	const shaft = `M${round(from.x)} ${round(from.y)} Q${round(control.x)} ${round(control.y)} ${round(to.x)} ${round(to.y)}`;
	const back = Math.atan2(control.y - to.y, control.x - to.x);
	const spread = 0.45 + random() * 0.1;
	const length = 8;
	const wing = (side: number) => ({
		x: to.x + length * Math.cos(back + side * spread),
		y: to.y + length * Math.sin(back + side * spread),
	});
	const [left, right] = [wing(1), wing(-1)];
	const head = `M${round(left.x)} ${round(left.y)} L${round(to.x)} ${round(to.y)} L${round(right.x)} ${round(right.y)}`;
	return { shaft, head };
}

/**
 * A word's line boxes merged per line: a word, or a unit of several
 * Segments, broken across lines gets one box on each line.
 */
export function lineBoxes(rects: readonly Box[]): Box[] {
	const boxes: Box[] = [];
	for (const rect of [...rects].sort(
		(a, b) => a.top - b.top || a.left - b.left,
	)) {
		if (rect.right - rect.left <= 0) continue;
		const line = boxes.findIndex((box) => {
			const middle = (rect.top + rect.bottom) / 2;
			return middle > box.top && middle < box.bottom;
		});
		const box = boxes[line];
		if (box)
			boxes[line] = {
				left: Math.min(box.left, rect.left),
				top: Math.min(box.top, rect.top),
				right: Math.max(box.right, rect.right),
				bottom: Math.max(box.bottom, rect.bottom),
			};
		else boxes.push(rect);
	}
	return boxes;
}

/** The box nearest `point`, by its centre. */
export function nearestBox(
	boxes: readonly Box[],
	point: Point,
): Box | undefined {
	let nearest: Box | undefined;
	let best = Number.POSITIVE_INFINITY;
	for (const box of boxes) {
		const distance = Math.hypot(
			(box.left + box.right) / 2 - point.x,
			(box.top + box.bottom) / 2 - point.y,
		);
		if (distance < best) {
			best = distance;
			nearest = box;
		}
	}
	return nearest;
}
