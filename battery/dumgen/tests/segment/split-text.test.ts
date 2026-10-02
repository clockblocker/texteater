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
