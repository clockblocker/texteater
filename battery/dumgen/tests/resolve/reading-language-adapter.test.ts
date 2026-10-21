import { expect, test } from "bun:test";
import { markedSentence } from "../../src/resolve/de/reading.js";
import type { Segment } from "../../src/segment/segmented-sentence.js";

const segments: readonly Segment[] = [
	{ kind: "ResolvableText", text: "a" },
	{ kind: "ResolvableText", text: "m" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "Feuer" },
];

test("language-owned German Reading marks an isolated fusion piece written out", () => {
	expect(markedSentence(segments, [0])).toBe("<TARGET>an</TARGET> dem Feuer");
});

test("language-owned German Reading preserves a whole fusion and kindless fixtures", () => {
	expect(markedSentence(segments, [0, 1, 3])).toBe(
		"<TARGET>am</TARGET> <TARGET>Feuer</TARGET>",
	);
	expect(
		markedSentence(
			segments.map(({ text }) => ({ text })),
			[0],
		),
	).toBe("<TARGET>a</TARGET>m Feuer");
});
