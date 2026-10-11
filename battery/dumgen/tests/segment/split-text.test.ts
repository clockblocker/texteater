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

test("splits English without breaking at titles, initials or a date's day", () => {
	expect(
		sentencesOf(
			"Mr. Smith met Dr. Jones at 5 p.m. on Jan. 3. They talked for an hour. J. K. Rowling agreed, e.g. at St. Paul's. Vol. 2 is out.",
		),
	).toEqual([
		"Mr. Smith met Dr. Jones at 5 p.m. on Jan. 3.",
		"They talked for an hour.",
		"J. K. Rowling agreed, e.g. at St. Paul's.",
		"Vol. 2 is out.",
	]);
});

test("splits French with titles and spaced guillemets", () => {
	expect(
		sentencesOf(
			"Mme. Dupont est arrivée. M. Martin aussi. « Bonjour ! » dit-il. « Comment ça va ? » Elle sourit.",
		),
	).toEqual([
		"Mme. Dupont est arrivée.",
		"M. Martin aussi.",
		"« Bonjour ! » dit-il.",
		"« Comment ça va ? »",
		"Elle sourit.",
	]);
});

test("splits Hebrew, whose abbreviations take gershayim, and reads a Hebrew title line", () => {
	expect(
		splitText(
			'פרק ראשון\nד"ר כהן הגיע לתל אביב בבוקר. הוא אמר שלום! אני גר ב-Tel Aviv.',
		).paragraphs,
	).toEqual([
		{ sentences: ["פרק ראשון"] },
		{
			sentences: [
				'ד"ר כהן הגיע לתל אביב בבוקר.',
				"הוא אמר שלום!",
				"אני גר ב-Tel Aviv.",
			],
		},
	]);
});

test("keeps a lower-case dialogue tag with the quote before it", () => {
	expect(
		sentencesOf(
			'"Go!" he shouted. Er rief »Hilfe!« und rannte weg. Wait... what happened?',
		),
	).toEqual([
		'"Go!" he shouted.',
		"Er rief »Hilfe!« und rannte weg.",
		"Wait... what happened?",
	]);
});

test("an ordinal before a Sentence-opening word closes its Sentence", () => {
	expect(
		sentencesOf(
			"Ich zählte bis 10. Dann hörte ich auf. Am 1. Januar kam er, im 19. Jahrhundert. Das ist z. B. teuer.",
		),
	).toEqual([
		"Ich zählte bis 10.",
		"Dann hörte ich auf.",
		"Am 1. Januar kam er, im 19. Jahrhundert.",
		"Das ist z. B. teuer.",
	]);
});

test("splits a Text mixing German, English, French and Hebrew paragraphs the same way as each alone", () => {
	const paragraphs = [
		"Die Lehrerin sagt: Open your books, please. Dann lesen wir Nr. 5.",
		"Mr. Brown arrived on Jan. 3. He was late.",
		"Mme. Leroux répond : « Pas du tout ! » Puis elle part.",
		"« Non ! »",
		'ד"ר לוי צחק. זה היה מצחיק!',
	];
	expect(splitText(paragraphs.join("\n\n"))).toEqual({
		paragraphs: paragraphs.flatMap(
			(paragraph) => splitText(paragraph).paragraphs,
		),
	});
	expect(sentencesOf(paragraphs.join("\n\n"))).toEqual([
		"Die Lehrerin sagt: Open your books, please.",
		"Dann lesen wir Nr. 5.",
		"Mr. Brown arrived on Jan. 3.",
		"He was late.",
		"Mme. Leroux répond : « Pas du tout ! »",
		"Puis elle part.",
		"« Non ! »",
		'ד"ר לוי צחק.',
		"זה היה מצחיק!",
	]);
});
