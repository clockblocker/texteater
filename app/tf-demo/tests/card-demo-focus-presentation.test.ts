import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

test("suppresses focus outlines throughout the card playground", async () => {
	const css = await readFile(
		new URL("../src/playground/card-demo/card-demo.css", import.meta.url),
		"utf8",
	);

	expect(css).toMatch(/\.card-demo-page :focus\s*\{\s*outline: none;\s*\}/);
	expect(css).not.toMatch(
		/\.card-demo-(?:segment|card|link|close):focus-visible/,
	);
});
