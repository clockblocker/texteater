import { expect, test } from "bun:test";
import {
	germanFusionOneLiner,
	splitFusedWords,
	unsplitFusedWordIn,
} from "../src/authored.js";
import { segmentGerman } from "../src/concrete-lang/de/segmentation/segment.js";
import { segmentEnglish } from "../src/concrete-lang/en/segmentation/segment.js";

test("a stored German Sentence holds the pieces of each fused word", () => {
	expect(
		splitFusedWords("de", [
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
	expect(
		unsplitFusedWordIn("de", [{ kind: "ResolvableText", text: "aufs" }]),
	).toBe(0);
	expect(
		unsplitFusedWordIn("de", [{ kind: "ResolvableText", text: "auf" }]),
	).toBeUndefined();
});

test("a stored English Sentence holds the pieces of each fused word", () => {
	expect(
		splitFusedWords("en", [
			{ kind: "ResolvableText", text: "I'll" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "won't" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "Mr." },
		]),
	).toEqual([
		{ kind: "ResolvableText", text: "I" },
		{ kind: "ResolvableText", text: "'ll" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "wo", surface: "will" },
		{ kind: "ResolvableText", text: "n't", surface: "not" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "Mr." },
	]);
	for (const whole of ["I'll", "won't", "England's", "boys'", "gonna"])
		expect(
			unsplitFusedWordIn("en", [{ kind: "ResolvableText", text: whole }]),
			whole,
		).toBe(0);
	expect(
		unsplitFusedWordIn("en", [
			{ kind: "ResolvableText", text: "I" },
			{ kind: "ResolvableText", text: "'ll" },
		]),
	).toBeUndefined();
	// A language without a fusion table keeps its Segments.
	const hebrew = [{ kind: "ResolvableText", text: "בבית" }];
	expect(splitFusedWords("he", hebrew)).toEqual(hebrew);
	expect(unsplitFusedWordIn("he", hebrew)).toBeUndefined();
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
	expect(splitFusedWords("de", segmented)).toEqual(segmented);
	// Pieces that lost their surface gain it back.
	expect(
		splitFusedWords(
			"de",
			segmented.map(({ kind, text }) => ({ kind, text })),
		),
	).toEqual(segmented);
	const english = segmentEnglish("I'll say we can't, let's go.").segments;
	expect(splitFusedWords("en", english)).toEqual(english);
	expect(
		splitFusedWords(
			"en",
			english.map(({ kind, text }) => ({ kind, text })),
		),
	).toEqual(english);
});
