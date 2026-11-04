import { expect, test } from "bun:test";
import { extractPastedText } from "../../src/extracted-text/extracted-text.js";
import {
	extractedTextSchema,
	scrollSchema,
} from "../../src/extracted-text/schema.js";

test("pasted text is one Scroll of Paragraphs, its line breaks kept, without Original Locations", () => {
	const text = extractPastedText(
		"  Erste Zeile\r\nZweite Zeile  \n\n \n*Kein* Markdown.\n",
	);
	expect(text).toEqual({
		kind: "Scroll",
		blocks: [
			{
				kind: "Paragraph",
				inlines: [
					{ kind: "Run", text: "Erste Zeile" },
					{ kind: "LineBreak" },
					{ kind: "Run", text: "Zweite Zeile" },
				],
			},
			{
				kind: "Paragraph",
				inlines: [{ kind: "Run", text: "*Kein* Markdown." }],
			},
		],
	});
	expect(scrollSchema.parse(text)).toEqual(text);
	expect(extractedTextSchema.parse({ contents: [text] })).toEqual({
		contents: [text],
	});
});

test("pasted text is stored as NFC, and blank text is one empty Scroll", () => {
	expect(extractPastedText("שָׁלוֹם".normalize("NFD"))).toEqual({
		kind: "Scroll",
		blocks: [
			{
				kind: "Paragraph",
				inlines: [{ kind: "Run", text: "שָׁלוֹם".normalize("NFC") }],
			},
		],
	});
	expect(extractPastedText(" \n\t ")).toEqual({ kind: "Scroll", blocks: [] });
});

test("the schema turns away what an Extracted Text cannot hold", () => {
	const invalid = [
		{ contents: [] },
		{ contents: [{ blocks: [] }] },
		{
			contents: [
				{
					kind: "Scroll",
					blocks: [{ kind: "Heading", level: 1, runs: [] }],
				},
			],
		},
		{ contents: [{ kind: "Section", title: "Buch", contents: [] }] },
		{
			contents: [
				{
					kind: "Section",
					title: " Buch",
					contents: [{ kind: "Scroll", blocks: [] }],
				},
			],
		},
		{
			contents: [
				{
					kind: "Scroll",
					blocks: [
						{
							kind: "Paragraph",
							inlines: [{ kind: "Run", text: "zwei\nZeilen" }],
						},
					],
				},
			],
		},
		{
			contents: [
				{
					kind: "Scroll",
					blocks: [
						{
							kind: "Paragraph",
							locations: [
								{
									kind: "PageArea",
									page: 0,
									area: { x: 2, y: 0, width: 1, height: 1 },
								},
							],
							inlines: [{ kind: "Run", text: "x" }],
						},
					],
				},
			],
		},
	];
	for (const value of invalid)
		expect(extractedTextSchema.safeParse(value).success).toBe(false);
});
