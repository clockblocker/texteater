import { describe, expect, test } from "bun:test";
import type {
	ExtractedText,
	Heading,
	Paragraph,
	SceneBreak,
	Scroll,
	Section,
} from "../../../src/extracted-text/extracted-text.js";
import { extractPlainText } from "../../../src/extracted-text/plain-text/text-file.js";
import { extractedTextSchema } from "../../../src/extracted-text/schema.js";

type Sizes = Parameters<typeof extractPlainText>[2];

function read(text: string, sizes?: Sizes): ExtractedText {
	const extracted = extractPlainText(text, "Buch", sizes);
	expect(extractedTextSchema.parse(extracted)).toEqual(extracted);
	return extracted;
}

const textOfBlock = (block: Heading | Paragraph | SceneBreak) =>
	block.kind === "SceneBreak"
		? "* * *"
		: (block.kind === "Heading" ? block.runs : block.inlines)
				.map((inline) => (inline.kind === "Run" ? inline.text : "\n"))
				.join("");

type Outline = string | { readonly [title: string]: readonly Outline[] };

const outlineOf = (item: Section | Scroll): Outline =>
	item.kind === "Section"
		? { [item.title]: item.contents.map(outlineOf) }
		: (item.heading?.runs.map(({ text }) => text).join("") ?? "—");

/** The book's outline inside its one Section. */
const outline = (text: ExtractedText) => {
	const [book] = text.contents;
	return book?.kind === "Section" ? book.contents.map(outlineOf) : [];
};

const scrollsOf = (contents: ExtractedText["contents"]): Scroll[] =>
	contents.flatMap((item) =>
		item.kind === "Scroll" ? [item] : scrollsOf(item.contents),
	);

/** Each Scroll's blocks as text. */
const blocksOf = (text: ExtractedText) =>
	scrollsOf(text.contents).map(({ blocks }) => blocks.map(textOfBlock));

const book = (...parts: string[]) => parts.join("\n\n");

describe("chapters", () => {
	test.each([
		["Kapitel 1", "Kapitel 2"],
		["1. Kapitel", "2. Kapitel"],
		["Erstes Kapitel", "Zweites Kapitel"],
		["Neunzehntes Kapitel", "Sechsunddreißigstes Kapitel"],
		["CHAPTER I.", "CHAPTER II."],
		["Chapter 11", "Chapter 12"],
		["Chapter One", "Chapter Two"],
		["Chapter the First", "Chapter the Second"],
		["CHAPTER IV. The Rabbit Sends in a Little Bill", "CHAPTER V. Advice"],
		["1", "2"],
		["I.", "II."],
		["פרק א", "פרק ב"],
		["פרק ראשון", "פרק שני"],
		["פרק י״א", "פרק י״ב"],
	])("%p and %p head Scrolls", (first, second) => {
		const text = read(book(first, "Eins.", second, "Zwei."));
		expect(outline(text)).toEqual([first, second]);
		expect(blocksOf(text)).toEqual([["Eins."], ["Zwei."]]);
	});

	test("a heading that does not repeat is a Paragraph, and the book is cut by size", () => {
		expect(
			blocksOf(read(book("Kapitel 1", "Eins.", "Kapitel", "Zwei."))),
		).toEqual([["Kapitel 1", "Eins.", "Kapitel", "Zwei."]]);
		expect(
			blocksOf(read(book("Erstes Kapitel", "Eins.", "Teil 2", "Zwei."))),
		).toEqual([["Erstes Kapitel", "Eins.", "Teil 2", "Zwei."]]);
	});

	test("numbers alone count only in order", () => {
		expect(outline(read(book("3", "Eins.", "1", "Zwei.")))).toEqual(["—"]);
		expect(
			outline(read(book("1", "Eins.", "2", "Zwei.", "3", "Drei."))),
		).toEqual(["1", "2", "3"]);
	});

	test("text before the first chapter is a Scroll without a heading", () => {
		const text = read(
			book(
				"Effi Briest",
				"Roman",
				"Kapitel 1",
				"Eins.",
				"Kapitel 2",
				"Zwei.",
			),
		);
		expect(outline(text)).toEqual(["—", "Kapitel 1", "Kapitel 2"]);
		expect(blocksOf(text)[0]).toEqual(["Effi Briest", "Roman"]);
	});

	test("a title line under a heading is its subtitle, a Heading inside the Scroll", () => {
		const text = read(
			book(
				"CHAPTER I\nDown the Rabbit-Hole",
				"Alice was tired.",
				"CHAPTER II",
				"JONATHAN HARKER’S JOURNAL",
				"Left Munich.",
			),
		);
		expect(outline(text)).toEqual(["CHAPTER I", "CHAPTER II"]);
		expect(blocksOf(text)).toEqual([
			["Down the Rabbit-Hole", "Alice was tired."],
			["JONATHAN HARKER’S JOURNAL", "Left Munich."],
		]);
		expect(scrollsOf(text.contents)[0]?.blocks[0]).toMatchObject({
			kind: "Heading",
			level: 2,
		});
	});

	test("a table of contents of headings is not a run of chapters", () => {
		const text = read(
			book(
				"Chapter 1",
				"Chapter 2",
				"Chapter 3",
				"Chapter 1",
				"Eins.",
				"Chapter 2",
				"Zwei.",
				"Chapter 3",
				"Drei.",
			),
		);
		expect(outline(text)).toEqual([
			"—",
			"Chapter 1",
			"Chapter 2",
			"Chapter 3",
		]);
		expect(blocksOf(text)[0]).toEqual([
			"Chapter 1",
			"Chapter 2",
			"Chapter 3",
		]);
	});

	test("part headings open nested Sections, titled with their subtitle", () => {
		const text = read(
			book(
				"Vorwort.",
				"Erster Teil",
				"Kindheit",
				"Kapitel 1",
				"Eins.",
				"Kapitel 2",
				"Zwei.",
				"Zweiter Teil",
				"Ein Vorspruch.",
				"Kapitel 3",
				"Drei.",
			),
		);
		expect(outline(text)).toEqual([
			"—",
			{ "Erster Teil: Kindheit": ["Kapitel 1", "Kapitel 2"] },
			{ "Zweiter Teil": ["—", "Kapitel 3"] },
		]);
		expect(blocksOf(text)).toEqual([
			["Vorwort."],
			["Eins."],
			["Zwei."],
			["Ein Vorspruch."],
			["Drei."],
		]);
	});

	test("part headings without chapters are the chapters", () => {
		expect(
			outline(read(book("PART ONE", "Eins.", "PART TWO", "Zwei."))),
		).toEqual(["PART ONE", "PART TWO"]);
	});

	test("titles before a chapter count starting again at one open Sections", () => {
		const text = read(
			book(
				"Das Buch Ruth",
				"Kapitel 1",
				"Eins.",
				"Kapitel 2",
				"Zwei.",
				"Das Buch Esther",
				"Kapitel 1",
				"Eins.",
			),
		);
		expect(outline(text)).toEqual([
			{ "Das Buch Ruth": ["Kapitel 1", "Kapitel 2"] },
			{ "Das Buch Esther": ["Kapitel 1"] },
		]);
	});

	test("a count starting again without a title before it opens no Section", () => {
		expect(
			outline(
				read(
					book(
						"Kapitel 1",
						"Eins.",
						"Kapitel 2",
						"Zwei.",
						"Kapitel 1",
						"Neu.",
					),
				),
			),
		).toEqual(["Kapitel 1", "Kapitel 2", "Kapitel 1"]);
	});

	test("a second repeating chapter pattern makes Headings inside the Scrolls", () => {
		const text = read(
			book("Kapitel 1", "1", "Eins.", "2", "Zwei.", "Kapitel 2", "Drei."),
		);
		expect(outline(text)).toEqual(["Kapitel 1", "Kapitel 2"]);
		expect(scrollsOf(text.contents)[0]?.blocks).toEqual([
			{ kind: "Heading", level: 2, runs: [{ kind: "Run", text: "1" }] },
			{ kind: "Paragraph", inlines: [{ kind: "Run", text: "Eins." }] },
			{ kind: "Heading", level: 2, runs: [{ kind: "Run", text: "2" }] },
			{ kind: "Paragraph", inlines: [{ kind: "Run", text: "Zwei." }] },
		]);
	});
});

/** Words wrapped greedily at `width`, as Gutenberg wraps its prose. */
function wrap(words: string, width: number): string {
	const lines = [""];
	for (const word of words.split(" ")) {
		const line = lines.at(-1) ?? "";
		if (line.length > 0 && line.length + 1 + word.length > width)
			lines.push(word);
		else lines[lines.length - 1] = line ? `${line} ${word}` : word;
	}
	return lines.join("\n");
}

const prose = [
	"Als Gregor Samsa eines Morgens aus unruhigen Träumen erwachte, fand er sich in seinem Bett zu einem ungeheueren Ungeziefer verwandelt. Er lag auf seinem panzerartig harten Rücken und sah, wenn er den Kopf ein wenig hob, seinen gewölbten, braunen, von bogenförmigen Versteifungen geteilten Bauch.",
	"Seine vielen, im Vergleich zu seinem sonstigen Umfang kläglich dünnen Beine flimmerten ihm hilflos vor den Augen, und er dachte lange darüber nach, was mit ihm geschehen war, ohne eine Antwort zu finden.",
	"Sein Zimmer, ein richtiges, nur etwas zu kleines Menschenzimmer, lag ruhig zwischen den vier wohlbekannten Wänden, und über dem Tisch hing das Bild, das er vor kurzem aus einer Zeitschrift ausgeschnitten hatte.",
];

describe("paragraphs", () => {
	test("a hard-wrapped file's wraps are joined, its verse and short lines kept", () => {
		const text = read(
			book(
				...prose.map((paragraph) => wrap(paragraph, 70)),
				"Ich weiß nicht, was soll es bedeuten,\nDaß ich so traurig bin;\nEin Märchen aus uralten Zeiten,\nDas kommt mir nicht aus dem Sinn.",
				`Lieber Freund,\n${wrap(prose[1] ?? "", 70)}`,
			),
		);
		expect(blocksOf(text)).toEqual([
			[
				...prose,
				"Ich weiß nicht, was soll es bedeuten,\nDaß ich so traurig bin;\nEin Märchen aus uralten Zeiten,\nDas kommt mir nicht aus dem Sinn.",
				`Lieber Freund,\n${prose[1]}`,
			],
		]);
	});

	test("a file that is not hard-wrapped keeps every line break, and a long line is a Paragraph", () => {
		const text = read(
			[
				...prose,
				"",
				"Röslein, Röslein, Röslein rot,\nRöslein auf der Heiden.",
			].join("\n"),
		);
		expect(blocksOf(text)).toEqual([
			[
				...prose,
				"Röslein, Röslein, Röslein rot,\nRöslein auf der Heiden.",
			],
		]);
	});

	test("stars, rules and # alone are Scene Breaks, never at a Scroll's edge or twice in a row", () => {
		const text = read(
			book(
				"* * *",
				"Eins.",
				"***",
				"Zwei.",
				"---",
				"Drei.",
				"#",
				"Vier.",
				"*      *      *      *      *",
				"    *      *      *      *",
				"Fünf.",
				"~ ~ ~",
			),
		);
		expect(blocksOf(text)).toEqual([
			[
				"Eins.",
				"* * *",
				"Zwei.",
				"* * *",
				"Drei.",
				"* * *",
				"Vier.",
				"* * *",
				"Fünf.",
			],
		]);
	});

	test("Gutenberg's _underscores_ are Italic, and its [Illustration] notes go", () => {
		const text = read(
			book(
				"[Illustration]",
				"[Illustration: Alice and\nthe Rabbit]",
				"It was _very_ odd, said\n_the rabbit_ to snake_case names.",
			),
		);
		expect(scrollsOf(text.contents)[0]?.blocks).toEqual([
			{
				kind: "Paragraph",
				inlines: [
					{ kind: "Run", text: "It was " },
					{ kind: "Run", text: "very", styles: ["Italic"] },
					{ kind: "Run", text: " odd, said" },
					{ kind: "LineBreak" },
					{ kind: "Run", text: "the rabbit", styles: ["Italic"] },
					{ kind: "Run", text: " to snake_case names." },
				],
			},
		]);
	});

	test("only the Gutenberg title replaces the given title, and blank text is one empty Scroll", () => {
		expect(extractPlainText(" \n\n ", "  Mein   Buch ")).toEqual({
			contents: [
				{
					kind: "Section",
					title: "Mein Buch",
					contents: [{ kind: "Scroll", blocks: [] }],
				},
			],
		});
	});
});

/**
 * A Paragraph of `size` characters opening with `opening`, padded before
 * its last character.
 */
const sized = (opening: string, size = 100) =>
	`${opening.slice(0, -1)}${"x".repeat(Math.max(0, size - opening.length))}${opening.slice(-1)}`;

const sizes = { target: 250, ceiling: 1000, smallestLast: 50 };

describe("size cut", () => {
	test("cuts at the first Paragraph boundary at or after the target", () => {
		const paragraphs = ["A", "B", "C", "D", "E", "F", "G"].map((letter) =>
			sized(letter),
		);
		expect(blocksOf(read(book(...paragraphs), sizes))).toEqual([
			paragraphs.slice(0, 3),
			paragraphs.slice(3, 6),
			paragraphs.slice(6),
		]);
	});

	test("never cuts a dialogue run, a speech intro from its speech, an open quotation or verse", () => {
		for (const [bound, after] of [
			[["„Komm her!“", "„Nein!“"], "Dann ging sie."],
			[["– Komm her!", "– Nein!"], "Dann ging sie."],
			[["Er sagte:", "„Ja.“"], "Dann ging sie."],
			[["“Then I said", "“that was all.”"], "So it ended."],
			[["Röslein rot,\nRöslein", "Sah ein Knab\nein Röslein"], "Ende."],
		] as const) {
			const paragraphs = [
				sized("A"),
				sized("B"),
				sized(bound[0]),
				sized(bound[1]),
				sized(after),
				sized("C"),
			];
			expect(blocksOf(read(book(...paragraphs), sizes))).toEqual([
				paragraphs.slice(0, 4),
				paragraphs.slice(4),
			]);
		}
	});

	test("a dialogue run is cut before it would pass the ceiling", () => {
		const speech = Array.from({ length: 8 }, () => sized("„Ja!"));
		expect(
			blocksOf(read(book(...speech), { ...sizes, ceiling: 450 })).map(
				(blocks) => blocks.length,
			),
		).toEqual([4, 4]);
	});

	test("a last Scroll under the smallest size joins the one before", () => {
		const paragraphs = ["A", "B", "C", "D"].map((letter) => sized(letter));
		expect(
			blocksOf(
				read(book(...paragraphs), { ...sizes, smallestLast: 150 }),
			),
		).toEqual([paragraphs]);
	});

	test("Scene Breaks are where a book of scenes is cut, and the break goes", () => {
		const scene = (letter: string) => [
			sized(letter, 80),
			sized(letter, 80),
		];
		const text = read(
			book(
				...scene("A"),
				"* * *",
				...scene("B"),
				"* * *",
				...scene("C"),
				"* * *",
				...scene("D"),
			),
			sizes,
		);
		expect(blocksOf(text)).toEqual([
			[...scene("A"), "* * *", ...scene("B")],
			[...scene("C"), "* * *", ...scene("D")],
		]);
	});

	test("a cut waits for a Scene Break before the ceiling, else falls between Paragraphs", () => {
		const scene = (letter: string, count: number) =>
			Array.from({ length: count }, (_, index) =>
				sized(`${letter}${index}`),
			);
		const ceiling = { ...sizes, ceiling: 400 };
		expect(
			blocksOf(
				read(
					book(...scene("A", 4), "* * *", ...scene("B", 1)),
					ceiling,
				),
			),
		).toEqual([scene("A", 4), scene("B", 1)]);
		expect(
			blocksOf(
				read(
					book(...scene("A", 6), "* * *", ...scene("B", 1)),
					ceiling,
				),
			),
		).toEqual([
			scene("A", 6).slice(0, 3),
			scene("A", 6).slice(3),
			scene("B", 1),
		]);
	});

	test("the default size: Scrolls of 20,000 to 30,000 characters, none split", () => {
		const paragraphs = Array.from({ length: 205 }, (_, index) =>
			sized(`P${index}.`, 500),
		);
		const scrolls = blocksOf(read(book(...paragraphs)));
		expect(scrolls.flat()).toEqual(paragraphs);
		for (const scroll of scrolls.slice(0, -1)) {
			const size = scroll.join("").length;
			expect(size).toBeGreaterThanOrEqual(20_000);
			expect(size).toBeLessThanOrEqual(30_000);
		}
		expect(scrolls).toHaveLength(5);
	});
});
