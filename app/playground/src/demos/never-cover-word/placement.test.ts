import { describe, expect, test } from "bun:test";
import { type Box, covered, type Scene, strategies } from "./placement";

const line = (top: number, start = 16, width = 358): Box => ({
	start,
	top,
	width,
	height: 30,
});

/** A phone-sized viewport with a two-line sentence around `top`. */
const phone = (top: number, overrides: Partial<Scene> = {}): Scene => ({
	view: { width: 390, height: 700 },
	word: { start: 120, top: top + 30, width: 50, height: 30 },
	lines: [line(top), line(top + 30)],
	column: { start: 16, top: 0, width: 358, height: 2000 },
	stack: { width: 360, height: 340 },
	scrollRoom: { back: 0, forward: 600 },
	makeRoom: true,
	...overrides,
});

const coversSentence = (scene: Scene, name: keyof typeof strategies) =>
	covered(strategies[name](scene).box, scene.lines, scene.view).length > 0;

describe("never-cover-word placement", () => {
	test("under the word covers the sentence's next line", () => {
		const scene = phone(100, {
			word: { start: 120, top: 100, width: 50, height: 30 },
		});
		expect(coversSentence(scene, "under")).toBe(true);
		expect(coversSentence(scene, "beside")).toBe(false);
	});

	test("the opposite half follows the word's half", () => {
		expect(strategies.opposite(phone(100)).where).toBe("bottom half");
		expect(strategies.opposite(phone(560)).where).toBe("top half");
	});

	test("beside takes a side column when the frame is wide", () => {
		const wide = phone(100, {
			view: { width: 1400, height: 800 },
			lines: [line(100, 400, 600), line(130, 400, 600)],
			column: { start: 400, top: 0, width: 600, height: 2000 },
		});
		const placement = strategies.beside(wide);
		expect(placement.where).toContain("end side");
		expect(placement.box.start).toBeGreaterThanOrEqual(1000);
	});

	test("beside scrolls the text when neither side of the sentence has room", () => {
		const cramped = phone(160, {
			view: { width: 390, height: 400 },
			lines: [line(160), line(190), line(220)],
		});
		const placement = strategies.beside(cramped);
		expect(placement.scrollBy).toBeGreaterThan(0);
		expect(placement.where).toContain("scrolled");
		const clamped = strategies.beside({ ...cramped, makeRoom: false });
		expect(clamped.scrollBy).toBe(0);
		expect(clamped.box.height).toBeLessThan(cramped.stack.height);
	});

	test("a word at the inline-end edge keeps the stack inside", () => {
		const scene = phone(100, {
			word: { start: 340, top: 130, width: 40, height: 30 },
		});
		const placement = strategies.under(scene);
		expect(placement.box.start).toBeGreaterThanOrEqual(8);
		expect(placement.box.start + placement.box.width).toBeLessThanOrEqual(
			382,
		);
	});
});
