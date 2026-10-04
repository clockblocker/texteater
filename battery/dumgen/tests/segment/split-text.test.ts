import { expect, test } from "bun:test";
import { splitText } from "../../src/segment/split-text.js";

const sentencesOf = (text: string) =>
	splitText(text).paragraphs.flatMap(({ sentences }) => sentences);

test("splits ordered prose Sentences", () => {
	expect(
		splitText(
			"Die Banken sind geöffnet. Wann schließen sie? Morgen bleiben sie zu!",
		),
	).toEqual({
		paragraphs: [
			{
				sentences: [
					"Die Banken sind geöffnet.",
					"Wann schließen sie?",
					"Morgen bleiben sie zu!",
				],
			},
		],
	});
});

test("reads each unpunctuated line of verse as a paragraph of its own", () => {
	expect(
		splitText("Erste Zeile\nZweite Zeile\n\nDritte Zeile").paragraphs,
	).toEqual([
		{ sentences: ["Erste Zeile"] },
		{ sentences: ["Zweite Zeile"] },
		{ sentences: ["Dritte Zeile"] },
	]);
});

test("rejoins prose hard-wrapped mid-Sentence and keeps blank-line paragraphs", () => {
	expect(
		splitText(
			"Ein Junge überlebt\n\nSie waren stolz, ganz und gar\nnormal zu sein. Niemand ahnte es.\n\nEr war groß.",
		).paragraphs,
	).toEqual([
		{ sentences: ["Ein Junge überlebt"] },
		{
			sentences: [
				"Sie waren stolz, ganz und gar normal zu sein.",
				"Niemand ahnte es.",
			],
		},
		{ sentences: ["Er war groß."] },
	]);
});

test("trims Sentences, and a blank Text has no paragraph", () => {
	expect(sentencesOf("  Hallo.  Welt!  ")).toEqual(["Hallo.", "Welt!"]);
	expect(splitText(" \n\t ")).toEqual({ paragraphs: [] });
});

test("keeps a sentence-internal abbreviation or ordinal with what follows it", () => {
	expect(
		sentencesOf(
			"Dr. Müller kommt heute. Das gilt z.B. für Kinder, bzw. Eltern. Am 3. Mai ist Ruhe.",
		),
	).toEqual([
		"Dr. Müller kommt heute.",
		"Das gilt z.B. für Kinder, bzw. Eltern.",
		"Am 3. Mai ist Ruhe.",
	]);
});

test("splits after a sentence-final abbreviation before a capital", () => {
	expect(sentencesOf("Wir kaufen Obst, Gemüse usw. Dann gehen wir.")).toEqual(
		["Wir kaufen Obst, Gemüse usw.", "Dann gehen wir."],
	);
});

test("a single line break after a Sentence's end starts a new paragraph", () => {
	expect(
		splitText(
			"Er kam spät.\nSie sagte „Endlich.“\nEr nickte »Ja!«\nDann aßen sie (alle.)\nEs war gut.",
		).paragraphs,
	).toEqual([
		{ sentences: ["Er kam spät."] },
		{ sentences: ["Sie sagte „Endlich.“"] },
		{ sentences: ["Er nickte »Ja!«"] },
		{ sentences: ["Dann aßen sie (alle.)"] },
		{ sentences: ["Es war gut."] },
	]);
});

test("a single line break inside a Sentence stays a soft wrap", () => {
	expect(
		splitText(
			"Er sprach lange mit Dr.\nMüller, der am 3.\nMai kam. Dann ging der\nJunge zu seinem\nHund.",
		).paragraphs,
	).toEqual([
		{
			sentences: [
				"Er sprach lange mit Dr. Müller, der am 3. Mai kam.",
				"Dann ging der Junge zu seinem Hund.",
			],
		},
	]);
});

test("an unpunctuated line opening a paragraph is a title when the next line's first word would have fit on it", () => {
	expect(
		splitText(
			"Ein Junge überlebt\nDie Familie wohnte in einem Haus am Ende der Straße.\nKapitel 2\nEs war kalt.",
		).paragraphs,
	).toEqual([
		{ sentences: ["Ein Junge überlebt"] },
		{ sentences: ["Die Familie wohnte in einem Haus am Ende der Straße."] },
		{ sentences: ["Kapitel 2"] },
		{ sentences: ["Es war kalt."] },
	]);
});

test("a wrapped opening line is no title, even before a capitalized noun", () => {
	expect(
		splitText(
			"Am Morgen sah der Junge in der Ferne einen großen\nHund, der laut bellte.",
		).paragraphs,
	).toEqual([
		{
			sentences: [
				"Am Morgen sah der Junge in der Ferne einen großen Hund, der laut bellte.",
			],
		},
	]);
});

test("reads a hard-wrapped Text with a title line as its title and paragraphs", () => {
	expect(
		splitText(
			[
				"Ein Junge überlebt",
				"Mr und Mrs Dursley im Ligusterweg Nummer 4 waren stolz darauf, ganz und gar",
				"normal zu sein, sehr stolz sogar. Niemand wäre auf die Idee gekommen, sie",
				"könnten sich in eine merkwürdige und geheimnisvolle Geschichte verstricken,",
				"denn mit solchem Unsinn wollten sie nichts zu tun haben.",
				"Mr Dursley war Direktor einer Firma namens Grunnings, die Bohrmaschinen",
				"herstellte.",
			].join("\n"),
		).paragraphs,
	).toEqual([
		{ sentences: ["Ein Junge überlebt"] },
		{
			sentences: [
				"Mr und Mrs Dursley im Ligusterweg Nummer 4 waren stolz darauf, ganz und gar normal zu sein, sehr stolz sogar.",
				"Niemand wäre auf die Idee gekommen, sie könnten sich in eine merkwürdige und geheimnisvolle Geschichte verstricken, denn mit solchem Unsinn wollten sie nichts zu tun haben.",
			],
		},
		{
			sentences: [
				"Mr Dursley war Direktor einer Firma namens Grunnings, die Bohrmaschinen herstellte.",
			],
		},
	]);
});
