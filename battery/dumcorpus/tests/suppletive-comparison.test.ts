import { expect, test } from "bun:test";
import { germanSuppletiveComparisons } from "../src/inventories.js";

test("each suppletive comparison names a distinct positive and an am-superlative", () => {
	const positives = germanSuppletiveComparisons.map(
		({ positive }) => positive,
	);
	expect(new Set(positives).size).toBe(positives.length);
	for (const { superlative } of germanSuppletiveComparisons)
		expect(superlative).toMatch(/^am \p{L}+$/u);
});

test("every compared form is lowercase NFC", () => {
	for (const {
		positive,
		comparative,
		superlative,
	} of germanSuppletiveComparisons)
		for (const word of [positive, comparative, superlative])
			expect(word).toBe(word.normalize("NFC").toLocaleLowerCase("de"));
});
