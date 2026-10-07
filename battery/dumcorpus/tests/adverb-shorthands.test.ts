import { expect, test } from "bun:test";
import { authoredMembers, germanAdverbShorthands } from "../src/inventories.js";

const authoredAdverbs = new Set(
	authoredMembers
		.filter(({ lemma }) => lemma.kind === "ADV")
		.map(({ lemma }) => lemma.canonicalForm),
);

test("every adverb shorthand expands to authored ADVs", () => {
	const missing = Object.values(germanAdverbShorthands)
		.flatMap(({ expansions }) => expansions)
		.filter((expansion) => !authoredAdverbs.has(expansion));
	expect(missing).toEqual([]);
});

test("a shorthand is no authored ADV of its own, and expands to its series", () => {
	for (const [shorthand, { series, expansions }] of Object.entries(
		germanAdverbShorthands,
	)) {
		expect(authoredAdverbs.has(shorthand)).toBe(false);
		expect(expansions.length).toBeGreaterThan(0);
		for (const expansion of expansions)
			expect(`${shorthand}: ${expansion}`).toMatch(
				series === "da" ? /: dar/u : /: h(er|in)/u,
			);
	}
});

test("every shorthand and expansion is lowercase NFC", () => {
	for (const [shorthand, { expansions }] of Object.entries(
		germanAdverbShorthands,
	))
		for (const word of [shorthand, ...expansions])
			expect(word).toBe(word.normalize("NFC").toLocaleLowerCase("de"));
});
