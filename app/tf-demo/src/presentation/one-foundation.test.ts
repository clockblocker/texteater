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

/** The paper's corners: the mark of a box skinned by hand. */
const PAPER_CORNERS = "rounded-[0.9rem]";

/**
 * The sizes a pile is built from. The app's renderer and its gestures read
 * them from the Compass battery; a Playground entry reads the finished
 * pile from `presentation/deck-geometry` instead.
 */
const PILE_SIZES =
	/\b(CARD_WIDTH_REM|HEADER_REM|PILE_HEIGHT_REM|DECK_TOP_REM|cardHeightPx|deckPlacements)\b/;

/**
 * Surfaces that still draw a Card of their own. Each is a prototype with
 * its own face; moving one onto the foundation takes it off this list.
 */
const OWN_SKIN: readonly string[] = [
	"playground/entries/card-to-cover/cover-stage.tsx",
	"playground/entries/deck-interactions/card-view.tsx",
	"playground/entries/deck-interactions/targets.tsx",
	"playground/entries/frames.tsx",
	"playground/entries/tabletop/note-body.tsx",
];
const OWN_PILE: readonly string[] = [
	"playground/entries/deck-interactions/layout.ts",
	"playground/entries/frames.tsx",
];

describe("one foundation draws every Presentation", () => {
	test("the scan reaches the three surfaces", () => {
		expect(SOURCES).toContain("workspace/compass/presentation-view.tsx");
		expect(SOURCES).toContain("playground/entries/notes-gallery.tsx");
		expect(SOURCES).toContain(
			"playground/entries/deck-interactions/card-view.tsx",
		);
	});

	test("the paper skin is written once, in the foundation", () => {
		const skinned = SOURCES.filter((file) =>
			read(file).includes(PAPER_CORNERS),
		);
		expect(skinned).toEqual(["presentation/skin.ts", ...OWN_SKIN].sort());
	});

	test("no Playground entry builds a pile from the battery's sizes", () => {
		const piled = SOURCES.filter(
			(file) =>
				file.startsWith("playground/") && PILE_SIZES.test(read(file)),
		);
		expect(piled).toEqual([...OWN_PILE].sort());
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
