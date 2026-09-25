import { expect, test } from "bun:test";
import {
	germanFusionOneLiner,
	isGermanFusedWord,
	splitGermanFusedWords,
} from "../src/authored.js";
import { segmentGerman } from "../src/concrete-lang/de/segmentation/segment.js";

test("a stored German Sentence holds the pieces of each fused word", () => {
	expect(
		splitGermanFusedWords([
			{ kind: "ResolvableText", text: "Im" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "Wald" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "'ne" },
		]),
	).toEqual([
		{ kind: "ResolvableText", text: "I", surface: "in" },
		{ kind: "ResolvableText", text: "m", surface: "dem" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "Wald" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "'ne" },
	]);
	expect(isGermanFusedWord("aufs")).toBe(true);
	expect(isGermanFusedWord("auf")).toBe(false);
});

test("a Fusion value finds its authored one-liner", () => {
	expect(
		germanFusionOneLiner({
			spelling: "im",
			components: [{ span: "i" }, { span: "m" }],
		}),
	).toContain("„im“ ist „in dem“");
	expect(
		germanFusionOneLiner({
			spelling: "geht's",
			components: [{ span: "geht" }, { span: "'s" }],
		}),
	).toBeString();
	expect(
		germanFusionOneLiner({
			spelling: "xy",
			components: [{ span: "x" }, { span: "y" }],
		}),
	).toBeUndefined();
});

test("Segments from Dumgen's segmenter already hold the pieces and pass through", () => {
	const segmented = segmentGerman("Im Wald und aufs Dach").segments;
	expect(
		segmented
			.filter((segment) => "surface" in segment)
			.map(({ text, surface }) => [text, surface]),
	).toEqual([
		["I", "in"],
		["m", "dem"],
		["auf", "auf"],
		["s", "das"],
	]);
	expect(splitGermanFusedWords(segmented)).toEqual(segmented);
	// Pieces that lost their surface gain it back.
	expect(
		splitGermanFusedWords(
			segmented.map(({ kind, text }) => ({ kind, text })),
		),
	).toEqual(segmented);
});
