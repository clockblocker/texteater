import { expect, test } from "bun:test";
import { segmentInstructions } from "../../src/segment/he/segment-instructions.js";

// he14/he15 frozen raw source choices stayed below the acceptance floor;
// their stored units never received route questions. This guards wording,
// not a claim that an actual judge now chooses either noun confidently.
test("Hebrew source question distinguishes root-initial ב in absolute and construct house from a preposition", () => {
	const instructions = segmentInstructions(4);
	expect(instructions).toContain(
		"In 'הם בנו בַּיִת קטן', בַּיִת is one whole noun",
	);
	expect(instructions).toContain(
		"in 'בֵּית האבן עומד ליד הנהר', בֵּית is the whole construct noun",
	);
	expect(instructions).toContain(
		"Their initial ב is a root letter, not a preposition",
	);
	expect(instructions).toContain("Contrast 'גרתי בבית קטן': בבית = ב + בית");
});
