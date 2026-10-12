import { expect, test } from "bun:test";
import { extractPastedText } from "../../src/extracted-text/extracted-text.js";
import { extractedTextFromMarkdown } from "../../src/extracted-text/markdown.js";
import {
	parseExtractedText,
	parseScroll,
} from "../../src/extracted-text/parse.js";
import {
	extractedTextSchema,
	scrollSchema,
} from "../../src/extracted-text/schema.js";

const locatedScroll = {
	kind: "Scroll",
	heading: {
		runs: [{ kind: "Run", text: "Kapitel 1", styles: ["Bold"] }],
		locations: [{ kind: "PageArea", page: 0 }],
	},
	blocks: [
		{
			kind: "Heading",
			level: 3,
			runs: [{ kind: "Run", text: "Teil" }],
			locations: [{ kind: "FileSpot", spot: "epubcfi(/6/4)" }],
		},
		{
			kind: "Paragraph",
			locations: [
				{
					kind: "PageArea",
					page: 2,
					area: { x: 0, y: 0.5, width: 1, height: 0.25 },
				},
			],
			inlines: [
				{
					kind: "Run",
					text: "Er sagte ",
					locations: [{ kind: "TimeSpan", startMs: 0, endMs: 900 }],
				},
				{ kind: "LineBreak" },
				{
					kind: "Run",
					text: "»Nein.«",
					styles: ["Italic", "Quotation"],
					extra: "dropped",
				},
			],
		},
		{ kind: "SceneBreak", extra: "dropped" },
	],
};

const located = {
	contents: [
		{
			kind: "Section",
			title: "Erstes Buch",
			contents: [
				locatedScroll,
				{
					kind: "Section",
					title: "Teil 2",
					contents: [{ kind: "Scroll", blocks: [] }],
					author: "dropped",
				},
			],
		},
		{ kind: "Scroll", blocks: [] },
	],
	note: "dropped",
};

test("parses what the schema parses, to the same value", () => {
	for (const value of [
		located,
		{
			contents: [
				extractPastedText("Erste Zeile\nZweite Zeile\n\nDritte."),
			],
		},
		extractedTextFromMarkdown(
			"# Titel\n\nEin *kursiver* und **fetter** Satz,\\\nmit <q>Zitat</q>.\n\n## Zwei\n\nEnde.",
		),
	])
		expect(parseExtractedText(value)).toEqual(
			extractedTextSchema.parse(value),
		);
	for (const value of [locatedScroll, extractPastedText("Ein Satz.")])
		expect(parseScroll(value)).toEqual(scrollSchema.parse(value));
});

test("turns away what the schema turns away", () => {
	const scroll = (fields: object) => ({
		contents: [{ kind: "Scroll", ...fields }],
	});
	const section = (title: unknown, contents: unknown) => ({
		contents: [{ kind: "Section", title, contents }],
	});
	const paragraph = (inlines: unknown, locations?: unknown) => ({
		contents: [
			{
				kind: "Scroll",
				blocks: [
					{
						kind: "Paragraph",
						inlines,
						...(locations === undefined ? {} : { locations }),
					},
				],
			},
		],
	});
	for (const value of [
		null,
		[],
		{ contents: [] },
		{ contents: [{ blocks: [] }] },
		scroll({ blocks: [{ kind: "Heading", level: 1, runs: [] }] }),
		scroll({ blocks: [{ kind: "Heading", level: 2, runs: [] }] }),
		scroll({ blocks: [{ kind: "Quote", inlines: [] }] }),
		scroll({ heading: { runs: [] }, blocks: [] }),
		section("Buch", []),
		section("", [{ kind: "Scroll", blocks: [] }]),
		section("Buch ", [{ kind: "Scroll", blocks: [] }]),
		section("zwei\nZeilen", [{ kind: "Scroll", blocks: [] }]),
		section("Buch", [{ kind: "Section", title: "Teil", contents: [] }]),
		paragraph([]),
		paragraph([{ kind: "Run", text: "zwei\nZeilen" }]),
		paragraph([{ kind: "Run", text: "" }]),
		paragraph([{ kind: "Run", text: "x", styles: [] }]),
		paragraph([{ kind: "Run", text: "x", styles: ["Underline"] }]),
		paragraph([{ kind: "Run", text: "x" }], []),
		paragraph(
			[{ kind: "Run", text: "x" }],
			[
				{
					kind: "PageArea",
					page: 0,
					area: { x: 2, y: 0, width: 1, height: 1 },
				},
			],
		),
		paragraph(
			[{ kind: "Run", text: "x" }],
			[{ kind: "PageArea", page: -1 }],
		),
		paragraph(
			[{ kind: "Run", text: "x" }],
			[{ kind: "TimeSpan", startMs: 0.5, endMs: 1 }],
		),
		paragraph(
			[{ kind: "Run", text: "x" }],
			[{ kind: "FileSpot", spot: "" }],
		),
		paragraph([{ kind: "Run", text: "x" }], [{ kind: "Page" }]),
	]) {
		expect(extractedTextSchema.safeParse(value).success).toBe(false);
		expect(() => parseExtractedText(value)).toThrow();
	}
});
