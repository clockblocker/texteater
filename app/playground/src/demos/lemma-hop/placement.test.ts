import { describe, expect, test } from "bun:test";
import { type Box, covered, placeBeside, type Scene } from "./placement";

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
	...overrides,
});

const coversSentence = (scene: Scene) =>
	covered(placeBeside(scene).box, scene.lines, scene.view).length > 0;

describe("never-cover-word placement", () => {
	test("on a phone it keeps clear of the whole sentence", () => {
		expect(coversSentence(phone(100))).toBe(false);
		expect(coversSentence(phone(500))).toBe(false);
	});

	test("it takes a side column when the frame is wide", () => {
		const wide = phone(100, {
			view: { width: 1400, height: 800 },
			lines: [line(100, 400, 600), line(130, 400, 600)],
			column: { start: 400, top: 0, width: 600, height: 2000 },
		});
		const placement = placeBeside(wide);
		expect(placement.where).toContain("end side");
		expect(placement.box.start).toBeGreaterThanOrEqual(1000);
	});

	test("it scrolls the text when neither side of the sentence has room", () => {
		const cramped = phone(160, {
			view: { width: 390, height: 400 },
			lines: [line(160), line(190), line(220)],
		});
		const placement = placeBeside(cramped);
		expect(placement.scrollBy).toBeGreaterThan(0);
		expect(placement.where).toContain("scrolled");
	});

	test("with no room to scroll it clamps the stack's height instead", () => {
		const stuck = phone(160, {
			view: { width: 390, height: 400 },
			lines: [line(160), line(190), line(220)],
			scrollRoom: { back: 0, forward: 0 },
		});
		const placement = placeBeside(stuck);
		expect(placement.scrollBy).toBe(0);
		expect(placement.box.height).toBeLessThan(stuck.stack.height);
	});

	test("a word at the inline-end edge keeps the stack inside", () => {
		const scene = phone(100, {
			word: { start: 340, top: 130, width: 40, height: 30 },
		});
		const placement = placeBeside(scene);
		expect(placement.box.start).toBeGreaterThanOrEqual(8);
		expect(placement.box.start + placement.box.width).toBeLessThanOrEqual(
			382,
		);
	});
});
