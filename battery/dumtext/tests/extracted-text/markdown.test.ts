import { expect, test } from "bun:test";
import type {
	ExtractedText,
	Paragraph,
	Run,
	Scroll,
} from "../../src/extracted-text/extracted-text.js";
import {
	extractedTextFromMarkdown,
	extractedTextToMarkdown,
} from "../../src/extracted-text/markdown.js";
import { extractedTextSchema } from "../../src/extracted-text/schema.js";

const run = (text: string, ...styles: Run["styles"] & {}): Run =>
	styles.length > 0 ? { kind: "Run", text, styles } : { kind: "Run", text };
const lineBreak = { kind: "LineBreak" } as const;
const paragraph = (...inlines: Paragraph["inlines"]): Paragraph => ({
	kind: "Paragraph",
	inlines,
});

const scrollsOf = (contents: ExtractedText["contents"]): Scroll[] =>
	contents.flatMap((item) =>
		item.kind === "Scroll" ? [item] : scrollsOf(item.contents),
	);

/** The blocks of an Extracted Text that is one loose Scroll. */
function blocksOf(text: ExtractedText): Scroll["blocks"] | undefined {
	const [only] = text.contents;
	return only?.kind === "Scroll" ? only.blocks : undefined;
}

/** Canonical Markdown: what export writes, so it reads back unchanged. */
const book = `# Erstes *Kapitel*

## Der Anfang

Es war einmal ein *kleines* Mädchen, das **sehr** gern las.

Sie sagte: <q>„Ich lese ***alles***.“</q>

Ich weiß nicht, was soll es bedeuten,\\
Daß ich so traurig bin;\\
Ein *Märchen aus **uralten** Zeiten*

### Ende

# Zweites Kapitel

Kurz.
`;

const bookText: ExtractedText = {
	contents: [
		{
			kind: "Scroll",
			heading: { runs: [run("Erstes "), run("Kapitel", "Italic")] },
			blocks: [
				{ kind: "Heading", level: 2, runs: [run("Der Anfang")] },
				paragraph(
					run("Es war einmal ein "),
					run("kleines", "Italic"),
					run(" Mädchen, das "),
					run("sehr", "Bold"),
					run(" gern las."),
				),
				paragraph(
					run("Sie sagte: "),
					run("„Ich lese ", "Quotation"),
					run("alles", "Italic", "Bold", "Quotation"),
					run(".“", "Quotation"),
				),
				paragraph(
					run("Ich weiß nicht, was soll es bedeuten,"),
					lineBreak,
					run("Daß ich so traurig bin;"),
					lineBreak,
					run("Ein "),
					run("Märchen aus ", "Italic"),
					run("uralten", "Italic", "Bold"),
					run(" Zeiten", "Italic"),
				),
				{ kind: "Heading", level: 3, runs: [run("Ende")] },
			],
		},
		{
			kind: "Scroll",
			heading: { runs: [run("Zweites Kapitel")] },
			blocks: [paragraph(run("Kurz."))],
		},
	],
};

test("reads Scrolls, Headings, Paragraphs, Line Breaks and every Inline Style", () => {
	expect(extractedTextFromMarkdown(book)).toEqual(bookText);
	expect(extractedTextSchema.parse(bookText)).toEqual(bookText);
});

test("Markdown → Extracted Text → Markdown gives canonical Markdown back", () => {
	expect(extractedTextToMarkdown(extractedTextFromMarkdown(book))).toBe(book);
});

test("Extracted Text → Markdown → Extracted Text gives a canonical one back", () => {
	expect(
		extractedTextFromMarkdown(extractedTextToMarkdown(bookText)),
	).toEqual(bookText);
});

test("Original Locations survive the Extracted Text but not Markdown", () => {
	const located: ExtractedText = {
		contents: [
			{
				kind: "Scroll",
				heading: {
					runs: [run("Seite eins")],
					locations: [
						{ kind: "FileSpot", spot: "epubcfi(/6/4!/4/2)" },
					],
				},
				blocks: [
					{
						kind: "Paragraph",
						locations: [
							{
								kind: "PageArea",
								page: 0,
								area: {
									x: 0.1,
									y: 0.8,
									width: 0.8,
									height: 0.2,
								},
							},
							{ kind: "PageArea", page: 1 },
						],
						inlines: [
							{
								kind: "Run",
								text: "Hallo",
								locations: [
									{
										kind: "TimeSpan",
										startMs: 1200,
										endMs: 1650,
									},
								],
							},
							{ kind: "Run", text: " Welt" },
						],
					},
				],
			},
		],
	};
	expect(extractedTextSchema.parse(located)).toEqual(located);
	const markdown = extractedTextToMarkdown(located);
	expect(markdown).toBe("# Seite eins\n\nHallo Welt\n");
	expect(extractedTextFromMarkdown(markdown)).toEqual({
		contents: [
			{
				kind: "Scroll",
				heading: { runs: [run("Seite eins")] },
				blocks: [paragraph(run("Hallo Welt"))],
			},
		],
	});
});

test("a hard-wrapped line is a space; a backslash, two spaces or <br> is a Line Break", () => {
	expect(
		blocksOf(
			extractedTextFromMarkdown("eins\nzwei  \ndrei\\\nvier<br>fünf"),
		),
	).toEqual([
		paragraph(
			run("eins zwei"),
			lineBreak,
			run("drei"),
			lineBreak,
			run("vier"),
			lineBreak,
			run("fünf"),
		),
	]);
});

test("reads HTML style tags and underscore emphasis as Inline Styles", () => {
	expect(
		blocksOf(
			extractedTextFromMarkdown(
				"<em>a</em> <strong>b</strong> _c_ __d__ <i>e</i>",
			),
		),
	).toEqual([
		paragraph(
			run("a", "Italic"),
			run(" "),
			run("b", "Bold"),
			run(" "),
			run("c", "Italic"),
			run(" "),
			run("d", "Bold"),
			run(" "),
			run("e", "Italic"),
		),
	]);
});

test("escapes text Markdown would read as syntax", () => {
	const literal: ExtractedText = {
		contents: [
			{
				kind: "Scroll",
				heading: { runs: [run("Nr. 5 #")] },
				blocks: [
					paragraph(
						run("# kein Titel"),
						lineBreak,
						run("- keine Liste"),
						lineBreak,
						run("1. keine Zahl"),
						lineBreak,
						run("> kein Zitat, a*b_c <q> [x](y) `z` \\"),
					),
				],
			},
		],
	};
	const markdown = extractedTextToMarkdown(literal);
	expect(markdown).toBe(
		"# Nr. 5 \\#\n\n\\# kein Titel\\\n\\- keine Liste\\\n1\\. keine Zahl\\\n\\> kein Zitat, a\\*b\\_c \\<q> \\[x](y) \\`z\\` \\\\\n",
	);
	expect(extractedTextFromMarkdown(markdown)).toEqual(literal);
});

test("falls back to <i> and <b> where CommonMark would misread * and **", () => {
	const intraword: ExtractedText = {
		contents: [
			{
				kind: "Scroll",
				blocks: [
					paragraph(run("Wort"), run("„Zitat“", "Italic"), run("!")),
				],
			},
		],
	};
	const markdown = extractedTextToMarkdown(intraword);
	expect(markdown).toBe("Wort<i>„Zitat“</i>!\n");
	expect(extractedTextFromMarkdown(markdown)).toEqual(intraword);
});

test("moves a style off the whitespace at its edges, and trims lines", () => {
	const loose: ExtractedText = {
		contents: [
			{
				kind: "Scroll",
				blocks: [
					paragraph(
						run(" ein"),
						run(" fettes ", "Bold"),
						run("Wort "),
					),
				],
			},
		],
	};
	expect(extractedTextToMarkdown(loose)).toBe("ein **fettes** Wort\n");
});

test("a bare # opens a Scroll without a Heading; text before any # is a Scroll", () => {
	const scrolls: ExtractedText = {
		contents: [
			{ kind: "Scroll", blocks: [paragraph(run("Vorwort."))] },
			{ kind: "Scroll", blocks: [paragraph(run("Ohne Titel."))] },
			{
				kind: "Scroll",
				heading: { runs: [run("Teil zwei")] },
				blocks: [],
			},
		],
	};
	const markdown = "Vorwort.\n\n#\n\nOhne Titel.\n\n# Teil zwei\n";
	expect(extractedTextToMarkdown(scrolls)).toBe(markdown);
	expect(extractedTextFromMarkdown(markdown)).toEqual(scrolls);
	const emptyFirst: ExtractedText = {
		contents: [
			{ kind: "Scroll", blocks: [] },
			{ kind: "Scroll", blocks: [paragraph(run("Text."))] },
		],
	};
	expect(
		extractedTextFromMarkdown(extractedTextToMarkdown(emptyFirst)),
	).toEqual(emptyFirst);
});

test("an empty document is one empty Scroll", () => {
	expect(extractedTextFromMarkdown("")).toEqual({
		contents: [{ kind: "Scroll", blocks: [] }],
	});
	expect(
		extractedTextToMarkdown({ contents: [{ kind: "Scroll", blocks: [] }] }),
	).toBe("");
});

test("<section> opens a nested Section with its title; </section> closes it", () => {
	const nested: ExtractedText = {
		contents: [
			{ kind: "Scroll", blocks: [paragraph(run("Vorwort."))] },
			{
				kind: "Section",
				title: 'Erster Teil: „Anfang" & mehr',
				contents: [
					{
						kind: "Section",
						title: "Buch 1",
						contents: [
							{
								kind: "Scroll",
								blocks: [paragraph(run("Ohne Titel."))],
							},
							{
								kind: "Scroll",
								heading: { runs: [run("Kapitel 2")] },
								blocks: [],
							},
						],
					},
					{
						kind: "Section",
						title: "Leer",
						contents: [{ kind: "Scroll", blocks: [] }],
					},
					{ kind: "Scroll", blocks: [paragraph(run("Nachwort."))] },
				],
			},
			{ kind: "Scroll", blocks: [] },
		],
	};
	const markdown = [
		"Vorwort.",
		'<section title="Erster Teil: „Anfang&quot; &amp; mehr">',
		'<section title="Buch 1">',
		"Ohne Titel.",
		"# Kapitel 2",
		"</section>",
		'<section title="Leer">',
		"</section>",
		"Nachwort.",
		"</section>",
		"#",
		"",
	]
		.join("\n\n")
		.replace(/\n\n$/u, "\n");
	expect(extractedTextSchema.parse(nested)).toEqual(nested);
	expect(extractedTextToMarkdown(nested)).toBe(markdown);
	expect(extractedTextFromMarkdown(markdown)).toEqual(nested);
});

test("a Section left open closes at the end; a stray </section> or untitled <section> is not one", () => {
	expect(
		extractedTextFromMarkdown(
			'</section>\n\n<section title="">\n\n<section title="Teil">\n\n# Eins',
		),
	).toEqual({
		contents: [
			{
				kind: "Scroll",
				blocks: [paragraph(run('<section title="">'))],
			},
			{
				kind: "Section",
				title: "Teil",
				contents: [
					{
						kind: "Scroll",
						heading: { runs: [run("Eins")] },
						blocks: [],
					},
				],
			},
		],
	});
});

test("keeps the words of lists, tables, quotes, links and code; drops images and footnotes", () => {
	const markdown = [
		"> Zitiert *hier*",
		"> weiter",
		"",
		"- erster Punkt",
		"- zweiter Punkt",
		"1. eins",
		"2. zwei",
		"",
		"| A | B |",
		"| --- | --- |",
		"| 1 | 2 |",
		"",
		"Ein [Link](https://example.org) mit `Code`![Bild](x.png) und Fußnote[^1].",
		"",
		"---",
		"",
		"[^1]: Die Fußnote.",
		"    Noch mehr.",
		"",
		"```",
		"  Zeile eins",
		"Zeile zwei",
		"```",
	].join("\n");
	expect(blocksOf(extractedTextFromMarkdown(markdown))).toEqual([
		paragraph(run("Zitiert "), run("hier", "Italic"), run(" weiter")),
		paragraph(run("erster Punkt")),
		paragraph(run("zweiter Punkt")),
		paragraph(run("1. eins")),
		paragraph(run("2. zwei")),
		paragraph(run("A | B")),
		paragraph(run("1 | 2")),
		paragraph(run("Ein Link mit Code und Fußnote.")),
		{ kind: "SceneBreak" },
		paragraph(run("Zeile eins"), lineBreak, run("Zeile zwei")),
	]);
});

test("a thematic break is a Scene Break, written back as * * *", () => {
	const text = extractedTextFromMarkdown("Eins.\n\n***\n\nZwei.\n___\nDrei.");
	expect(blocksOf(text)).toEqual([
		paragraph(run("Eins.")),
		{ kind: "SceneBreak" },
		paragraph(run("Zwei.")),
		{ kind: "SceneBreak" },
		paragraph(run("Drei.")),
	]);
	expect(extractedTextToMarkdown(text)).toBe(
		"Eins.\n\n* * *\n\nZwei.\n\n* * *\n\nDrei.\n",
	);
	expect(extractedTextSchema.parse(text)).toEqual(text);
});

test("reads Markdown as NFC", () => {
	expect(
		blocksOf(extractedTextFromMarkdown("Mädchen".normalize("NFD"))),
	).toEqual([paragraph(run("Mädchen".normalize("NFC")))]);
});

/** Each line's characters, styles kept on all but whitespace. */
function styledLines(text: ExtractedText): string[][] {
	return scrollsOf(text.contents).flatMap((scroll) =>
		scroll.blocks.flatMap((block) => {
			if (block.kind !== "Paragraph") return [];
			const lines: string[][] = [[]];
			for (const inline of block.inlines)
				if (inline.kind === "LineBreak") lines.push([]);
				else
					for (const char of inline.text)
						lines
							.at(-1)
							?.push(
								/\s/u.test(char)
									? char
									: `${char}${(inline.styles ?? []).join("+")}`,
							);
			return lines
				.map((line) => {
					const text = line.join("\u0000");
					return text.trim().length === 0 ? [] : line;
				})
				.map((line) => {
					let start = 0;
					while (/^\s$/u.test(line[start] ?? "x")) start += 1;
					let end = line.length;
					while (/^\s$/u.test(line[end - 1] ?? "x")) end -= 1;
					return line.slice(start, end);
				})
				.filter((line) => line.length > 0);
		}),
	);
}

test("every character keeps its Inline Styles through Markdown (seeded fuzz)", () => {
	let seed = 1176;
	const random = (below: number) => {
		seed = (seed * 1103515245 + 12345) % 2147483648;
		return seed % below;
	};
	const pieces = [
		"Wort",
		"ä",
		" ",
		"  ",
		"*",
		"**",
		"_",
		"<q>",
		"</q>",
		"<i>",
		"#",
		"- ",
		"1. ",
		"„",
		"“",
		".",
		"!",
		"\\",
		"`",
		"[",
		"](x)",
		"|",
		"&",
		"שלום",
	];
	const styleSets: Run["styles"][] = [
		undefined,
		["Italic"],
		["Bold"],
		["Quotation"],
		["Italic", "Bold"],
		["Italic", "Quotation"],
		["Bold", "Quotation"],
		["Italic", "Bold", "Quotation"],
	];
	for (let round = 0; round < 500; round += 1) {
		const inlines: Paragraph["inlines"][number][] = [];
		const length = 1 + random(8);
		for (let index = 0; index < length; index += 1) {
			if (index > 0 && random(6) === 0) inlines.push(lineBreak);
			const text = Array.from(
				{ length: 1 + random(3) },
				() => pieces[random(pieces.length)],
			).join("");
			const styles = styleSets[random(styleSets.length)];
			inlines.push(styles ? run(text, ...styles) : run(text));
		}
		const text: ExtractedText = {
			contents: [{ kind: "Scroll", blocks: [paragraph(...inlines)] }],
		};
		const markdown = extractedTextToMarkdown(text);
		const reread = extractedTextFromMarkdown(markdown);
		expect({ markdown, lines: styledLines(reread) }).toEqual({
			markdown,
			lines: styledLines(text),
		});
		expect(extractedTextToMarkdown(reread)).toBe(markdown);
	}
});
