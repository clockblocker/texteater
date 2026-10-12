import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
	ExtractedText,
	Heading,
	Paragraph,
	SceneBreak,
	Scroll,
	Section,
} from "../../../src/extracted-text/extracted-text.js";
import { parseExtractedText } from "../../../src/extracted-text/parse.js";
import { decodeTextFile } from "../../../src/extracted-text/plain-text/decode.js";
import {
	extractPlainText,
	extractTextFile,
} from "../../../src/extracted-text/plain-text/text-file.js";
import { extractedTextSchema } from "../../../src/extracted-text/schema.js";

const fixture = (name: string) =>
	readFileSync(join(import.meta.dir, "fixtures", name));

/** A file's Extracted Text, checked against the schema and the parser. */
function read(name: string, as = name): ExtractedText {
	const text = extractTextFile({ name: as, bytes: fixture(name) });
	expect(extractedTextSchema.parse(text)).toEqual(text);
	expect(parseExtractedText(text)).toEqual(text);
	return text;
}

const textOfBlock = (block: Heading | Paragraph | SceneBreak) =>
	block.kind === "SceneBreak"
		? "* * *"
		: (block.kind === "Heading" ? block.runs : block.inlines)
				.map((inline) => (inline.kind === "Run" ? inline.text : "\n"))
				.join("");

/** A Section as its title and contents, a Scroll as its own Heading. */
type Outline = string | { readonly [title: string]: readonly Outline[] };

const outlineOf = (item: Section | Scroll): Outline =>
	item.kind === "Section"
		? { [item.title]: item.contents.map(outlineOf) }
		: (item.heading?.runs.map(({ text }) => text).join("") ?? "—");

const scrollsOf = (contents: ExtractedText["contents"]): Scroll[] =>
	contents.flatMap((item) =>
		item.kind === "Scroll" ? [item] : scrollsOf(item.contents),
	);

const allText = (text: ExtractedText) =>
	scrollsOf(text.contents)
		.flatMap((scroll) => scroll.blocks.map(textOfBlock))
		.join("\n\n");

test("a German Gutenberg novel: one Scroll per Kapitel under its title, Gutenberg's wrapping dropped", () => {
	const text = read("effi-briest.txt", "pg5323.txt");
	expect(text.contents.map(outlineOf)).toEqual([
		{
			"Effi Briest": [
				"—",
				"Erstes Kapitel",
				"Zweites Kapitel",
				"Drittes Kapitel",
			],
		},
	]);
	const [front, first] = scrollsOf(text.contents);
	expect(front?.blocks.map(textOfBlock)).toEqual([
		"Effi Briest",
		"Theodor Fontane",
	]);
	expect(textOfBlock(first?.blocks[0] ?? { kind: "SceneBreak" })).toStartWith(
		"In Front des schon seit Kurfürst Georg Wilhelm von der Familie von Briest bewohnten Herrenhauses zu Hohen-Cremmen fiel heller Sonnenschein",
	);
	expect(first?.blocks).toContainEqual({
		kind: "Paragraph",
		inlines: [
			{ kind: "Run", text: "Flut, Flut," },
			{ kind: "LineBreak" },
			{ kind: "Run", text: "Mach alles wieder gut ...«" },
		],
	});
	const words = allText(text);
	expect(words).not.toContain("Gutenberg");
	expect(words).not.toContain("Produced by");
	expect(
		scrollsOf(text.contents)
			.flatMap(({ blocks }) => blocks)
			.filter(
				(block) =>
					block.kind === "Paragraph" &&
					block.inlines.some(({ kind }) => kind === "LineBreak"),
			),
	).toHaveLength(1);
});

test("an English novel: CHAPTER headings with their subtitles, verse, italics and one Scene Break", () => {
	const text = read("alice.txt");
	expect(text.contents.map(outlineOf)).toEqual([
		{
			"Alice's Adventures in Wonderland": [
				"—",
				"CHAPTER I.",
				"CHAPTER II.",
				"CHAPTER III.",
			],
		},
	]);
	const [front, first, second, third] = scrollsOf(text.contents);
	expect(front?.blocks.map(textOfBlock)).toContain("Contents");
	expect(first?.blocks[0]).toEqual({
		kind: "Heading",
		level: 2,
		runs: [{ kind: "Run", text: "Down the Rabbit-Hole" }],
	});
	expect(third?.blocks[0]).toEqual({
		kind: "Heading",
		level: 2,
		runs: [{ kind: "Run", text: "A Caucus-Race and a Long Tale" }],
	});
	expect(
		first?.blocks.filter(({ kind }) => kind === "SceneBreak"),
	).toHaveLength(1);
	expect(first?.blocks).toContainEqual(
		expect.objectContaining({
			inlines: expect.arrayContaining([
				{ kind: "Run", text: "very", styles: ["Italic"] },
			]),
		}),
	);
	expect(second?.blocks.map(textOfBlock)).toContain(
		"“How doth the little crocodile\nImprove his shining tail,\nAnd pour the waters of the Nile\nOn every golden scale!",
	);
});

test("a Bible: a Section per book, a Scroll per chapter from its first verse", () => {
	const text = read("king-james-bible.txt");
	expect(text.contents.map(outlineOf)).toEqual([
		{
			"The King James Version of the Bible": [
				"—",
				{
					"The Old Testament of the King James Version of the Bible: The First Book of Moses: Called Genesis":
						["—", "—"],
				},
				{ "The Second Book of Moses: Called Exodus": ["—", "—"] },
				{ Malachi: ["—", "—"] },
				{
					"The New Testament of the King James Bible: The Gospel According to Saint Matthew":
						["—", "—"],
				},
			],
		},
	]);
	const chapters = scrollsOf(text.contents)
		.slice(1)
		.map(({ blocks }) => textOfBlock(blocks[0] ?? { kind: "SceneBreak" }));
	expect(chapters.map((first) => first.slice(0, 4))).toEqual([
		"1:1 ",
		"2:1 ",
		"1:1 ",
		"2:1 ",
		"1:1 ",
		"4:1 ",
		"1:1 ",
		"2:1 ",
	]);
	expect(chapters[0]).toBe(
		"1:1 In the beginning God created the heaven and the earth.",
	);
	const malachi = scrollsOf(text.contents)[6];
	expect(malachi?.blocks.at(-1)?.kind).toBe("Paragraph");
});

test("a Hebrew book: parts as nested Sections, chapters as Scrolls, verse and a Scene Break kept", () => {
	const text = read("hebrew.txt", "גן/הגן_של_דינה.txt");
	expect(text.contents.map(outlineOf)).toEqual([
		{
			"הגן של דינה": [
				{ "חלק ראשון": ["פרק א", "פרק ב"] },
				{ "חלק שני": ["פרק ג"] },
			],
		},
	]);
	const [, second] = scrollsOf(text.contents);
	expect(second?.blocks.map(textOfBlock)).toEqual([
		"אחרי ארוחת הבוקר יצאה דינה לגן. היא ישבה על הספסל הישן וקראה שיר שסבתא כתבה לה פעם:",
		"בגן הקטן ליד הבית\nפורחים פרחים בכל אביב,\nואני יושבת בצל העץ\nושומעת את השיר מסביב.",
		"* * *",
		"בערב חזרה דינה הביתה. השמיים היו אדומים, והציפורים שתקו.",
	]);
});

test("verse drama without chapters: every line kept, one Scroll at the default size", () => {
	const text = read("faust.txt");
	const [scroll, ...more] = scrollsOf(text.contents);
	expect(more).toEqual([]);
	expect(text.contents.map(outlineOf)).toEqual([
		{ "Faust: Der Tragödie erster Teil": ["—"] },
	]);
	expect(scroll?.blocks.map(textOfBlock)).toContain(
		[
			"Ihr naht euch wieder, schwankende Gestalten,",
			"Die früh sich einst dem trüben Blick gezeigt.",
			"Versuch ich wohl, euch diesmal festzuhalten?",
			"Fühl ich mein Herz noch jenem Wahn geneigt?",
			"Ihr drängt euch zu! nun gut, so mögt ihr walten,",
			"Wie ihr aus Dunst und Nebel um mich steigt;",
			"Mein Busen fühlt sich jugendlich erschüttert",
			"Vom Zauberhauch, der euren Zug umwittert.",
		].join("\n"),
	);
});

test("prose without chapters: hard wraps joined, one Scroll under the default size", () => {
	const text = read("old-english-baron.txt");
	const scrolls = scrollsOf(text.contents);
	expect(text.contents.map(outlineOf)).toEqual([
		{ "The Old English Baron: a Gothic Story": ["—"] },
	]);
	for (const block of scrolls[0]?.blocks ?? [])
		expect(textOfBlock(block)).not.toContain("\n");
});

const sizeOf = (blocks: Scroll["blocks"]) =>
	blocks.map(textOfBlock).join("").length;

test.each([
	["old-english-baron.txt", 4],
	["faust.txt", 2],
])(
	"%s cut small: whole Paragraphs in order, each Scroll from the target to the ceiling",
	(name, count) => {
		const sizes = { target: 3_000, ceiling: 4_500, smallestLast: 750 };
		const whole = scrollsOf(read(name).contents);
		const scrolls = scrollsOf(
			extractPlainText(decodeTextFile(fixture(name)), name, sizes)
				.contents,
		);
		expect(scrolls).toHaveLength(count);
		expect(scrolls.flatMap(({ blocks }) => blocks)).toEqual(
			whole.flatMap(({ blocks }) => blocks),
		);
		for (const { blocks } of scrolls.slice(0, -1)) {
			expect(sizeOf(blocks)).toBeGreaterThanOrEqual(sizes.target);
			expect(sizeOf(blocks)).toBeLessThanOrEqual(sizes.ceiling);
		}
		expect(sizeOf(scrolls.at(-1)?.blocks ?? [])).toBeGreaterThanOrEqual(
			sizes.smallestLast,
		);
	},
);
