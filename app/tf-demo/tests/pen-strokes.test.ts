import { expect, test } from "bun:test";
import {
	arrowBetween,
	arrowStart,
	lineBoxes,
	loopAround,
	loopEdgeToward,
	nearestBox,
} from "../src/views/pen-strokes";

const word = { left: 100, top: 40, right: 160, bottom: 60 };

/** The numbers of a path, as [x, y] pairs. */
const pointsOf = (path: string) => {
	const numbers = (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
	return numbers.flatMap((_, at) =>
		at % 2 === 0 ? [[numbers[at] ?? 0, numbers[at + 1] ?? 0] as const] : [],
	);
};

test("a loop goes round its word, keeping its shape for its seed", () => {
	const loop = loopAround(word, "s1:2");
	expect(loopAround(word, "s1:2")).toBe(loop);
	expect(loopAround(word, "s1:4")).not.toBe(loop);
	const points = pointsOf(loop);
	const xs = points.map(([x]) => x);
	const ys = points.map(([, y]) => y);
	expect(Math.min(...xs)).toBeLessThan(word.left);
	expect(Math.max(...xs)).toBeGreaterThan(word.right);
	expect(Math.min(...ys)).toBeLessThan(word.top);
	expect(Math.max(...ys)).toBeGreaterThan(word.bottom);
});

test("an arrow leaves the pronoun's top for a word above and bows up the screen", () => {
	const pronoun = { left: 300, top: 120, right: 330, bottom: 140 };
	const from = arrowStart(pronoun, { x: 130, y: 50 });
	expect(from.y).toBeLessThan(pronoun.top);
	expect(from.x).toBeLessThan(315);
	const to = loopEdgeToward(word, from);
	const { shaft, head } = arrowBetween(from, to, "seed");
	const [, control] = pointsOf(shaft);
	// The control point sits above the straight line between the ends.
	const lineY = (from.y + to.y) / 2;
	expect(control?.[1]).toBeLessThan(lineY);
	// The head's two strokes meet at the arrow's end.
	expect(pointsOf(head)[1]).toEqual([
		Math.round(to.x * 10) / 10,
		Math.round(to.y * 10) / 10,
	]);
});

test("a word broken across lines gets one box per line", () => {
	const boxes = lineBoxes([
		{ left: 400, top: 40, right: 440, bottom: 60 },
		{ left: 440, top: 41, right: 470, bottom: 59 },
		{ left: 20, top: 70, right: 60, bottom: 90 },
		{ left: 70, top: 70, right: 70, bottom: 90 },
	]);
	expect(boxes).toEqual([
		{ left: 400, top: 40, right: 470, bottom: 60 },
		{ left: 20, top: 70, right: 60, bottom: 90 },
	]);
	expect(nearestBox(boxes, { x: 30, y: 100 })).toEqual(boxes[1]);
});
