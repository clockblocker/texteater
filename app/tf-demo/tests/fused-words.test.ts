import { expect, test } from "bun:test";
import type { SentenceAnalysis } from "dumgen/types";
import {
	encounterSentenceOf,
	storedSegmentsOf,
} from "../server/storedSegments";

const piece = (
	offset: number,
	kind: "ResolvableText" | "Whitespace" | "Punctuation",
	text: string,
	surface = text,
) => ({ offset, kind, text, surface });

const analysis = {
	sentenceId: "sentence-1",
	language: "de",
	stitchedText: "Im Haus, z.B. hier.",
	segments: [
		piece(0, "ResolvableText", "I", "in"),
		piece(1, "ResolvableText", "m", "dem"),
		piece(2, "Whitespace", " "),
		piece(3, "ResolvableText", "Haus"),
		piece(7, "Punctuation", ","),
		piece(8, "Whitespace", " "),
		piece(9, "ResolvableText", "z.B.", "zum Beispiel"),
		piece(13, "Whitespace", " "),
		piece(14, "ResolvableText", "hier"),
		piece(18, "Punctuation", "."),
	],
	targets: [],
	phrasemes: [],
	fusions: [
		{
			offset: 0,
			form: "Im",
			components: [
				{ offset: 0, span: "I", surface: "in", role: "Adposition" },
				{ offset: 1, span: "m", surface: "dem", role: "Article" },
			],
		},
	],
	slots: [],
} as unknown as SentenceAnalysis;

test("a fused word is stored split, each component keeping its surface; an abbreviation stays the word it is", () => {
	const segments = storedSegmentsOf(analysis);
	expect(segments.map(({ text }) => text).join("")).toBe(
		analysis.stitchedText,
	);
	expect(segments.slice(0, 2)).toEqual([
		{ kind: "ResolvableText", text: "I", surface: "in" },
		{ kind: "ResolvableText", text: "m", surface: "dem" },
	]);
	expect(segments[6]).toEqual({ kind: "ResolvableText", text: "z.B." });
});

test("the Encounter reads a fused word as its spaced surfaces and maps indices both ways", () => {
	const view = encounterSentenceOf({
		segmentedSentenceId: "sentence-1",
		segments: storedSegmentsOf(analysis).map((segment, index) => ({
			...segment,
			index,
		})),
	});
	expect(view.sentence.segments.map(({ text }) => text).join("")).toBe(
		"in dem Haus, z.B. hier.",
	);
	expect([0, 1, 2, 3].map(view.encounterIndex)).toEqual([0, 2, 3, 4]);
	expect([0, 1, 2, 3, 4].map(view.storedIndex)).toEqual([
		0,
		undefined,
		1,
		2,
		3,
	]);
});

test("a Sentence without fused words keeps its stored indices", () => {
	const view = encounterSentenceOf({
		segmentedSentenceId: "sentence-1",
		segments: [
			{ index: 0, kind: "ResolvableText", text: "im" },
			{ index: 1, kind: "Whitespace", text: " " },
			{ index: 2, kind: "ResolvableText", text: "Haus" },
		],
	});
	expect(view.sentence.segments).toEqual([
		{ kind: "ResolvableText", text: "im" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "Haus" },
	]);
	expect([0, 1, 2].map(view.encounterIndex)).toEqual([0, 1, 2]);
});
