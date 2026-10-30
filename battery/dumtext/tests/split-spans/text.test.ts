import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { splitTextSpans } from "../../src/split-spans.js";
import { splitText } from "../../src/split-text.js";
import {
	ends,
	expectOrderedSpans,
	generator,
	pick,
	sentenceLists,
	sentencesOf,
	slices,
	visible,
	words,
} from "./support.js";

const breaks = [
	" ",
	" ",
	" ",
	"  ",
	"\t",
	"\n",
	"\r\n",
	"\n\n",
	" \n  ",
	"\n \n",
];

/** A random text: words, Sentence ends and every kind of whitespace. */
function randomText(random: () => number): string {
	let text = pick(random, ["", " ", "\n"]);
	const length = 1 + Math.floor(random() * 40);
	for (let word = 0; word < length; word++) {
		text += pick(random, words);
		if (random() < 0.3) text += pick(random, ends);
		text += pick(random, breaks);
	}
	return text;
}

describe("splitTextSpans, property", () => {
	const random = generator(1294);
	const texts = Array.from({ length: 600 }, () => randomText(random));

	test("each span's slice of the input equals its Sentence apart from whitespace and NFC", () => {
		for (const text of texts)
			for (const { text: sentence, slice } of slices(
				text,
				splitTextSpans(text),
			))
				expect(visible(slice)).toBe(visible(sentence));
	});

	test("the spans are in order, apart and trimmed, and their Sentences are splitText's of the NFC text", () => {
		for (const text of texts) {
			const split = splitTextSpans(text);
			expectOrderedSpans(text, split);
			expect(sentenceLists(split.paragraphs)).toEqual(
				sentenceLists(splitText(text.normalize("NFC")).paragraphs),
			);
		}
	});
});

test("the plain-text books split as splitText splits them, every span in place", () => {
	const fixtures = join(
		import.meta.dir,
		"../extracted-text/plain-text/fixtures",
	);
	for (const name of readdirSync(fixtures)) {
		const text = readFileSync(join(fixtures, name), "utf8");
		const split = splitTextSpans(text);
		expect(sentenceLists(split.paragraphs)).toEqual(
			sentenceLists(splitText(text.normalize("NFC")).paragraphs),
		);
		for (const { text: sentence, slice } of slices(text, split))
			expect(visible(slice)).toBe(visible(sentence));
	}
});

/** The Sentences with the input slice each span names. */
const spans = (text: string) =>
	splitTextSpans(text).paragraphs.map(({ kind, sentences }) => ({
		kind,
		sentences: sentences.map(({ text: sentence, start, end }) => [
			sentence,
			text.slice(start, end),
		]),
	}));

describe("splitTextSpans, the tricky cases", () => {
	test("usw. can close a Sentence before a capital", () => {
		expect(spans("Wir kaufen Obst, Gemüse usw. Dann gehen wir.")).toEqual([
			{
				kind: "Paragraph",
				sentences: [
					[
						"Wir kaufen Obst, Gemüse usw.",
						"Wir kaufen Obst, Gemüse usw.",
					],
					["Dann gehen wir.", "Dann gehen wir."],
				],
			},
		]);
	});

	test("a URL ending a Sentence keeps its dots, and the Sentence its period", () => {
		const text = "Mehr unter https://example.org/a.html. Dann weiter.";
		expect(splitTextSpans(text).paragraphs[0]?.sentences).toEqual([
			{
				text: "Mehr unter https://example.org/a.html.",
				start: 0,
				end: 38,
			},
			{ text: "Dann weiter.", start: 39, end: 51 },
		]);
	});

	test("Mr and Mr. both run on into Dursley", () => {
		expect(
			sentencesOf(
				splitTextSpans(
					"Mr and Mrs Dursley were proud. Mr. Dursley was the director. Mr Dursley sat.",
				),
			),
		).toEqual([
			{
				kind: "Paragraph",
				sentences: [
					"Mr and Mrs Dursley were proud.",
					"Mr. Dursley was the director.",
					"Mr Dursley sat.",
				],
			},
		]);
	});

	test("verse keeps a paragraph per line, and a hard wrap joins its lines with a span over the line break", () => {
		expect(
			sentencesOf(
				splitTextSpans(
					"Über allen Gipfeln\nIst Ruh,\nIn allen Wipfeln",
				),
			),
		).toEqual([
			{ kind: "Paragraph", sentences: ["Über allen Gipfeln"] },
			{ kind: "Paragraph", sentences: ["Ist Ruh,"] },
			{ kind: "Paragraph", sentences: ["In allen Wipfeln"] },
		]);
		expect(
			spans(
				"Er ging langsam\ndie Straße hinunter. Dann blieb er\nstehen.",
			),
		).toEqual([
			{
				kind: "Paragraph",
				sentences: [
					[
						"Er ging langsam die Straße hinunter.",
						"Er ging langsam\ndie Straße hinunter.",
					],
					["Dann blieb er stehen.", "Dann blieb er\nstehen."],
				],
			},
		]);
	});

	test("dialogue dashes stay inside their Sentences", () => {
		expect(spans("– Kommst du? – Ja, sagte er.\n– Gut.")).toEqual([
			{
				kind: "Paragraph",
				sentences: [
					[
						"– Kommst du? – Ja, sagte er.",
						"– Kommst du? – Ja, sagte er.",
					],
				],
			},
			{ kind: "Paragraph", sentences: [["– Gut.", "– Gut."]] },
		]);
	});

	test("HTML entities stay as written", () => {
		expect(spans("Tom &amp; Jerry kamen. Dann &auml;rger.")).toEqual([
			{
				kind: "Paragraph",
				sentences: [
					["Tom &amp; Jerry kamen.", "Tom &amp; Jerry kamen."],
					["Dann &auml;rger.", "Dann &auml;rger."],
				],
			},
		]);
	});

	/**
	 * splitText's behavior today, not a goal: a numbered line's number is a
	 * Sentence of its own, and `eins.` before `2.` reads as an abbreviation
	 * before a number, so the two lines run together.
	 */
	test("numbered lines: the number splits off and eins. runs on into 2.", () => {
		expect(spans("1. Das ist eins.\n2. Das ist zwei.")).toEqual([
			{
				kind: "Paragraph",
				sentences: [
					["1.", "1."],
					["Das ist eins. 2.", "Das ist eins.\n2."],
					["Das ist zwei.", "Das ist zwei."],
				],
			},
		]);
	});

	test("a title line is a Heading", () => {
		expect(
			sentencesOf(splitTextSpans("Kapitel 1\nEr kam spät nach Hause.")),
		).toEqual([
			{ kind: "Heading", sentences: ["Kapitel 1"] },
			{ kind: "Paragraph", sentences: ["Er kam spät nach Hause."] },
		]);
	});

	test("offsets count UTF-16 units of the input as written, NFD and CRLF included", () => {
		const text = "Müller kam 🙂.\r\nDann été.";
		expect(splitTextSpans(text).paragraphs).toEqual([
			{
				kind: "Paragraph",
				sentences: [{ text: "Müller kam 🙂.", start: 0, end: 15 }],
			},
			{
				kind: "Paragraph",
				sentences: [{ text: "Dann été.", start: 17, end: 28 }],
			},
		]);
	});

	test("a blank text has no paragraph", () => {
		expect(splitTextSpans(" \n\t ")).toEqual({ paragraphs: [] });
	});
});
