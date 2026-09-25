import { expect, test } from "bun:test";
import type { SentenceAnalysis } from "dumgen/types";
import { selectAnalysisTarget } from "../server/sentenceAnalysisSelection";
import {
	assertPiecesStored,
	assertStoredSentence,
	encounterSentenceOf,
	storedSegmentsOf,
	storedSegmentsWithoutAnalysis,
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

test("the Encounter holds a fused word as its stored pieces, so its indices are the stored ones", () => {
	const sentence = encounterSentenceOf({
		segmentedSentenceId: "sentence-1",
		segments: storedSegmentsOf(analysis).map((segment, index) => ({
			...segment,
			index,
		})),
	});
	expect(sentence.segments.slice(0, 4)).toEqual([
		{ kind: "ResolvableText", text: "I" },
		{ kind: "ResolvableText", text: "m" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "Haus" },
	]);
	expect(sentence.segments.map(({ text }) => text).join("")).toBe(
		analysis.stitchedText,
	);
});

test("a German Sentence stored without an analysis still holds the pieces", () => {
	const segments = storedSegmentsWithoutAnalysis({
		language: "de",
		segments: [
			{ kind: "ResolvableText", text: "im" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "Wald" },
		],
	});
	expect(segments).toEqual([
		{ kind: "ResolvableText", text: "i", surface: "in" },
		{ kind: "ResolvableText", text: "m", surface: "dem" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "Wald" },
	]);
	expect(() =>
		assertPiecesStored({ language: "de", segments }),
	).not.toThrow();
});

test("a stored German Sentence with an unsplit fused word fails loudly", () => {
	const segments = [
		{ index: 0, kind: "ResolvableText" as const, text: "im" },
		{ index: 1, kind: "Whitespace" as const, text: " " },
		{ index: 2, kind: "ResolvableText" as const, text: "Wald" },
	];
	expect(() =>
		assertStoredSentence({
			language: "de",
			stitchedText: "im Wald",
			segments,
		}),
	).toThrow('fused word "im" unsplit');
	expect(() =>
		assertStoredSentence({
			language: "en",
			stitchedText: "im Wald",
			segments,
		}),
	).not.toThrow();
});

test("an analysis selects the stored pieces; a stored Sentence that does not match it fails loudly", () => {
	const stored = {
		stitchedText: "Im Haus",
		segments: [
			{ index: 0, kind: "ResolvableText" as const, text: "Im" },
			{ index: 1, kind: "Whitespace" as const, text: " " },
			{ index: 2, kind: "ResolvableText" as const, text: "Haus" },
		],
	};
	const split = {
		...analysis,
		stitchedText: "Im Haus",
		segments: analysis.segments.slice(0, 4),
	} as SentenceAnalysis;
	expect(() => selectAnalysisTarget(split, stored, 0)).toThrow(
		"a fused word must be stored as its pieces",
	);
});
