import { expect, test } from "bun:test";
import {
	CONTEXT_MAX_WORDS,
	type ExplainedSentence,
	explanationRequest,
	precedingContext,
} from "../server/pronounExplanation";

/** A Sentence of `count` words `w0 w1 …`, then a full stop; each word its own Segment. */
function words(sentenceId: string, count: number): ExplainedSentence {
	type Kind = ExplainedSentence["segments"][number]["kind"];
	const segments = Array.from({ length: count }, (_, at) => [
		{ kind: "ResolvableText" as Kind, text: `w${at}` },
		{ kind: "Whitespace" as Kind, text: " " },
	])
		.flat()
		.slice(0, -1)
		.concat([{ kind: "Punctuation", text: "." }])
		.map((segment, index) => ({ ...segment, index }));
	return {
		sentenceId,
		stitchedText: segments.map(({ text }) => text).join(""),
		segments,
	};
}

const wordCount = (part: { pieces: readonly { kind: string }[] }) =>
	part.pieces.filter(({ kind }) => kind === "ResolvableText").length;

test("the context reaches three Sentences back when they fit in 50 words", () => {
	const preceding = ["p1", "p2", "p3", "p4"].map((id) => words(id, 5));
	const context = precedingContext(preceding);
	// Reading order: the farthest first, and never the fourth.
	expect(context.map(({ sentence }) => sentence.sentenceId)).toEqual([
		"p3",
		"p2",
		"p1",
	]);
	expect(context.every(({ cut }) => !cut)).toBe(true);
});

test("the Sentence that would pass 50 words is cut to its last words, and the walk ends", () => {
	const context = precedingContext([
		words("p1", 30),
		words("p2", 30),
		words("p3", 2),
	]);
	expect(
		context.map(({ sentence, cut }) => [sentence.sentenceId, cut]),
	).toEqual([
		["p2", true],
		["p1", false],
	]);
	expect(context.map(wordCount)).toEqual([CONTEXT_MAX_WORDS - 30, 30]);
	// The cut keeps the Sentence's end and starts on a word.
	expect(context[0]?.pieces[0]?.text).toBe("w10");
	expect(context[0]?.pieces.at(-1)?.text).toBe(".");
});

test("one long Sentence before the pronoun gives its last 50 words", () => {
	const [only, ...rest] = precedingContext([words("p1", 80), words("p2", 3)]);
	expect(rest).toEqual([]);
	expect(only?.cut).toBe(true);
	expect(only && wordCount(only)).toBe(CONTEXT_MAX_WORDS);
});

test("exactly 50 words fit whole, and nothing more is taken", () => {
	const context = precedingContext([
		words("p1", 20),
		words("p2", 30),
		words("p3", 1),
	]);
	expect(
		context.map(({ sentence, cut }) => [sentence.sentenceId, cut]),
	).toEqual([
		["p2", false],
		["p1", false],
	]);
});

test("a Sentence with no Segments counts its words from its text", () => {
	const plain: ExplainedSentence = {
		sentenceId: "plain",
		stitchedText: "One two three.",
		segments: [],
	};
	const [part] = precedingContext([plain]);
	expect(part && wordCount(part)).toBe(3);
});

test("the request marks noun units wholly kept, never one the cut split", () => {
	const before: ExplainedSentence = {
		...words("p1", 60),
		units: [
			{
				segments: [0],
				route: { language: "de", family: "Lexeme", kind: "NOUN" },
			},
			{
				segments: [116, 118],
				route: { language: "de", family: "Lexeme", kind: "PROPN" },
			},
			{
				segments: [114],
				route: { language: "de", family: "Lexeme", kind: "VERB" },
			},
		],
	};
	const sentence: ExplainedSentence = {
		...words("s", 2),
		units: [
			{
				segments: [0],
				route: { language: "de", family: "Lexeme", kind: "PRON" },
			},
		],
	};
	const { input, sentenceIds } = explanationRequest({
		sentence,
		pronoun: [0],
		preceding: [before],
	});
	expect(sentenceIds).toEqual(["p1", "s"]);
	expect(input.pronoun).toEqual([0]);
	expect(input.passage[0]).toMatchObject({
		cut: true,
		candidates: [[116, 118]],
	});
	expect(input.passage[1]).toMatchObject({ candidates: [] });
	expect(input.passage[1]?.segments).toHaveLength(sentence.segments.length);
});
