import { describe, expect, test } from "bun:test";

import {
	splitInParagraphs,
	splitInSentences,
} from "../server/sentenceSplitting";

describe("splitInSentences", () => {
	test("splits ordered prose sentences", () => {
		expect(
			splitInSentences(
				"Die Banken sind geöffnet. Wann schließen sie? Morgen bleiben sie zu!",
			),
		).toEqual([
			"Die Banken sind geöffnet.",
			"Wann schließen sie?",
			"Morgen bleiben sie zu!",
		]);
	});

	test("treats unpunctuated text lines as sentence candidates", () => {
		expect(
			splitInSentences(
				"Erste Liedzeile\nZweite Liedzeile\nDritte Liedzeile",
			),
		).toEqual(["Erste Liedzeile", "Zweite Liedzeile", "Dritte Liedzeile"]);
	});

	test("rejoins prose that is hard-wrapped mid-sentence", () => {
		expect(
			splitInSentences(
				"Ein Junge überlebt\n\nMr und Mrs Dursley waren stolz darauf, ganz und gar\nnormal zu sein, sehr stolz sogar. Mrs Dursley besaß doppelt so viel\nHals, wie notwendig gewesen wäre.\n\nDie Dursleys hatten einen Sohn.",
			),
		).toEqual([
			"Ein Junge überlebt",
			"Mr und Mrs Dursley waren stolz darauf, ganz und gar normal zu sein, sehr stolz sogar.",
			"Mrs Dursley besaß doppelt so viel Hals, wie notwendig gewesen wäre.",
			"Die Dursleys hatten einen Sohn.",
		]);
	});

	test("removes boundary whitespace and omits empty input", () => {
		expect(splitInSentences("  Hallo.  Welt!  ")).toEqual([
			"Hallo.",
			"Welt!",
		]);
		expect(splitInSentences(" \n\t ")).toEqual([]);
	});

	test("keeps a sentence-internal abbreviation with what follows it", () => {
		expect(
			splitInSentences(
				"Dr. Müller kommt heute. Das gilt z.B. für Kinder, bzw. Eltern. Am 3. Mai ist Ruhe.",
			),
		).toEqual([
			"Dr. Müller kommt heute.",
			"Das gilt z.B. für Kinder, bzw. Eltern.",
			"Am 3. Mai ist Ruhe.",
		]);
	});

	test("splits after a sentence-final abbreviation before a capital", () => {
		expect(
			splitInSentences("Wir kaufen Obst, Gemüse usw. Dann gehen wir."),
		).toEqual(["Wir kaufen Obst, Gemüse usw.", "Dann gehen wir."]);
	});

	test("returns an immutable collection", () => {
		expect(Object.isFrozen(splitInSentences("Hallo."))).toBe(true);
	});
});

describe("splitInParagraphs", () => {
	test("groups a prose paragraph's sentences and keeps blank-line breaks", () => {
		expect(
			splitInParagraphs(
				"Ein Junge überlebt\n\nSie waren stolz, ganz und gar\nnormal zu sein. Niemand ahnte es.\n\nEr war groß.",
			),
		).toEqual([
			["Ein Junge überlebt"],
			[
				"Sie waren stolz, ganz und gar normal zu sein.",
				"Niemand ahnte es.",
			],
			["Er war groß."],
		]);
	});

	test("reads each line of a verse paragraph as its own paragraph", () => {
		expect(
			splitInParagraphs("Erste Zeile\nZweite Zeile\n\nDritte Zeile"),
		).toEqual([["Erste Zeile"], ["Zweite Zeile"], ["Dritte Zeile"]]);
	});
});
