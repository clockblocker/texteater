import { expect, test } from "bun:test";
import { authoredMembers, germanSplitAdverbParts } from "../src/inventories.js";

const authoredAdverbs = new Set(
	authoredMembers
		.filter(
			({ lemma }) =>
				lemma.language === "de" &&
				lemma.family === "Lexeme" &&
				lemma.kind === "ADV",
		)
		.map(({ lemma }) => lemma.canonicalForm),
);

test("every split-adverb part pair forms an authored German ADV", () => {
	expect(
		germanSplitAdverbParts.filter(({ form }) => !authoredAdverbs.has(form)),
	).toEqual([]);
});

test("a split-adverb form is its head, maybe a linking r, and its tail", () => {
	for (const { head, tail, form } of germanSplitAdverbParts)
		expect([`${head}${tail}`, `${head}r${tail}`]).toContain(form);
});

test("no split-adverb part pair is listed twice", () => {
	const pairs = germanSplitAdverbParts.map(
		({ head, tail }) => `${head} ${tail}`,
	);
	expect(new Set(pairs).size).toBe(pairs.length);
});
