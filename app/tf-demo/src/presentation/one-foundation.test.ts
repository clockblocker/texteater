import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A Presentation is drawn from one set of components (#1344). These fail
 * when a surface writes the paper skin out again, or computes a pile from
 * the battery's raw sizes instead of reading the foundation's.
 */

/** tf-demo's `src`. */
const SRC = new URL("../", import.meta.url).pathname;

const SOURCES = readdirSync(SRC, { recursive: true, encoding: "utf8" })
	.filter(
		(file) =>
			/\.tsx?$/.test(file) && !/\.(test|type-test)\.tsx?$/.test(file),
	)
	.sort();

const read = (file: string) => readFileSync(join(SRC, file), "utf8");

/** The paper's elevation skin or legacy 0.9rem corners: the mark of a box skinned by hand. */
const PAPER_CORNERS =
	/rounded-\[(calc\()?0\.9rem|bg-paper-elevated|shadow-card-(?:rest|lift|tail)|shadow-cover|rounded-t-2xl/;

/**
 * The sizes a pile is built from. The app's renderer and its gestures read
 * them from the Compass battery; a Playground entry reads the finished
 * pile from `presentation/deck-geometry` instead.
 */
const PILE_SIZES =
	/\b(CARD_WIDTH_REM|HEADER_REM|PILE_HEIGHT_REM|DECK_TOP_REM|cardHeightPx|deckPlacements)\b/;

/**
 * Surfaces that still skin a Card of their own. Each is a prototype on
 * another engine; moving one onto the foundation takes it off this list.
 */
const OWN_SKIN: readonly string[] = [
	"playground/entries/tabletop/note-body.tsx",
];

describe("one foundation draws every Presentation", () => {
	test("the scan reaches the three surfaces", () => {
		expect(SOURCES).toContain("workspace/compass/presentation-view.tsx");
		expect(SOURCES).toContain("playground/entries/notes-gallery.tsx");
		expect(SOURCES).toContain(
			"playground/entries/deck-interactions/card-view.tsx",
		);
		expect(SOURCES).toContain(
			"playground/entries/deck-interactions/layout.ts",
		);
	});

	test("the paper skin is written once, in the foundation", () => {
		const skinned = SOURCES.filter((file) =>
			PAPER_CORNERS.test(read(file)),
		);
		expect(skinned).toEqual(["presentation/skin.ts", ...OWN_SKIN].sort());
	});

	test("no Playground entry builds a pile from the battery's sizes", () => {
		const piled = SOURCES.filter(
			(file) =>
				file.startsWith("playground/") && PILE_SIZES.test(read(file)),
		);
		expect(piled).toEqual([]);
	});

	test("the foundation holds no motion engine", () => {
		const moving = SOURCES.filter(
			(file) =>
				file.startsWith("presentation/") &&
				/from "(motion|tabletop)(\/[\w-]+)?"/.test(read(file)),
		);
		expect(moving).toEqual([]);
	});
});
