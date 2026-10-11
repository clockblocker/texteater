import { expect, test } from "bun:test";
import { extractPastedText } from "../../src/extracted-text/extracted-text.js";
import { splitExtractedText } from "../../src/extracted-text/split.js";
import { splitText } from "../../src/segment/split-text.js";

test("a pasted text splits through its Extracted Text as it splits raw", () => {
	for (const text of [
		"Er kam spät.\nSie sagte „Endlich.“\n\nRead the text. Then answer.",
		"Erste Zeile\nZweite Zeile\n\n  Dritte Zeile  ",
		"Ein Junge überlebt\nSie waren stolz, ganz und gar\nnormal zu sein. Niemand ahnte es.",
		'פרק ראשון\nד"ר כהן הגיע. Mr. Smith met him on Jan. 3. They talked.',
		" \n\t ",
	])
		expect(splitExtractedText(extractPastedText(text))).toEqual(
			splitText(text),
		);
});

test("Chapter titles and Headings are paragraphs of their own, Inline Styles drop away", () => {
	expect(
		splitExtractedText({
			chapters: [
				{
					heading: { runs: [{ kind: "Run", text: "Kapitel 1" }] },
					blocks: [
						{
							kind: "Paragraph",
							inlines: [
								{ kind: "Run", text: "Er sagte " },
								{
									kind: "Run",
									text: "»Nein.«",
									styles: ["Italic"],
								},
								{ kind: "Run", text: " Dann ging er." },
							],
						},
						{
							kind: "Heading",
							level: 2,
							runs: [{ kind: "Run", text: "Teil zwei" }],
						},
					],
				},
				{
					blocks: [
						{
							kind: "Paragraph",
							inlines: [{ kind: "Run", text: "Ende." }],
						},
					],
				},
			],
		}).paragraphs,
	).toEqual([
		{ sentences: ["Kapitel 1"] },
		{ sentences: ["Er sagte »Nein.«", "Dann ging er."] },
		{ sentences: ["Teil zwei"] },
		{ sentences: ["Ende."] },
	]);
});
