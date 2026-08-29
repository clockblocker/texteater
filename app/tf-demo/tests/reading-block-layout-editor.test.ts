import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	moveReadingBlock,
	ReadingBlockLayoutEditor,
} from "../src/components/reading-block-layout-editor";

const ORDER = [
	"Header",
	"SourceContexts",
	"Relations",
	"Translations",
	"Definition",
] as const;

test("moves one Reading Block by one deterministic position", () => {
	expect(moveReadingBlock(ORDER, "Relations", -1)).toEqual([
		"Header",
		"Relations",
		"SourceContexts",
		"Translations",
		"Definition",
	]);
	expect(moveReadingBlock(ORDER, "Relations", 1)).toEqual([
		"Header",
		"SourceContexts",
		"Translations",
		"Relations",
		"Definition",
	]);
});

test("keeps the confirmed order at sequence boundaries", () => {
	expect(moveReadingBlock(ORDER, "Header", -1)).toBe(ORDER);
	expect(moveReadingBlock(ORDER, "Definition", 1)).toBe(ORDER);
});

test("renders hidden Blocks in their retained sequence with accessible controls", () => {
	const layout = {
		order: ORDER,
		hidden: ["Relations"],
	} as const;
	const markup = renderToStaticMarkup(
		createElement(ReadingBlockLayoutEditor, {
			layout,
			onOrderChange: async () => layout,
			onVisibilityChange: async () => layout,
		}),
	);

	expect(markup).toContain('aria-label="Reading Block order"');
	expect(markup).toContain('aria-label="Move Relations up"');
	expect(markup).toContain('aria-label="Move Relations down"');
	expect(markup).toContain('aria-label="Show Relations"');
	expect(markup).toContain("Hidden");
	expect(markup.indexOf("02")).toBeLessThan(markup.indexOf("Relations"));
	expect(markup.indexOf("Relations")).toBeLessThan(markup.indexOf("04"));
});
