import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
	buildReadme,
	collectExampleBlocks,
} from "../../generate-readme/generate-readme";

test("README examples expose all named blocks used by the template", () => {
	const blocks = collectExampleBlocks();
	const templateText = readFileSync(
		new URL("../../generate-readme/README.template.md", import.meta.url),
		"utf8",
	);
	const templateBlockNames = [
		...templateText.matchAll(/<!-- README_BLOCK:([a-z0-9-]+) -->/g),
	].map((match) => match[1]);

	expect(blocks.size).toBeGreaterThan(0);
	expect(templateBlockNames.length).toBeGreaterThan(0);

	for (const blockName of templateBlockNames) {
		expect(blockName).toBeDefined();
		if (blockName === undefined) {
			throw new Error(
				"template block match did not include a block name",
			);
		}
		expect(blocks.has(blockName)).toBe(true);
	}
});

test("generated README matches the committed README", () => {
	const generatedReadme = buildReadme();
	const committedReadme = readFileSync(
		new URL("../../README.md", import.meta.url),
		"utf8",
	);

	expect(generatedReadme).toBe(committedReadme);
});
