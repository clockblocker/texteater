import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Scroll } from "../../src/extracted-text/extracted-text.js";
import { extractedTextFromMarkdown } from "../../src/extracted-text/markdown.js";
import { splitScroll } from "../../src/extracted-text/split.js";
import { splitMarkdown } from "../../src/split-markdown.js";
import {
	ends,
	expectOrderedSpans,
	generator,
	pick,
	sentenceLists,
	sentencesOf,
	slices,
	visible,
	words,
} from "./support.js";

type Contents = ReturnType<typeof extractedTextFromMarkdown>["contents"];
const scrollsOf = (contents: Contents): Scroll[] =>
	contents.flatMap((item) =>
		item.kind === "Section" ? scrollsOf(item.contents) : [item],
	);

/** What `extractedTextFromMarkdown` and `splitScroll` give, Scroll by Scroll. */
const pipeline = (markdown: string) =>
	sentenceLists(
		scrollsOf(extractedTextFromMarkdown(markdown).contents).flatMap(
			(scroll) => splitScroll(scroll).paragraphs,
		),
	);

const splitSentences = (markdown: string) =>
	sentenceLists(splitMarkdown(markdown).paragraphs);

/** Whether `inner`'s characters appear in `outer` in order. */
function isSubsequence(inner: string, outer: string): boolean {
	let at = 0;
	for (const char of inner) {
		at = outer.indexOf(char, at);
		if (at === -1) return false;
		at += char.length;
	}
	return true;
}

/** A random line of prose, maybe with inline markup. */
function prose(random: () => number, markup: boolean): string {
	const length = 1 + Math.floor(random() * 10);
	const parts: string[] = [];
	for (let word = 0; word < length; word++) {
		let part = pick(random, words);
		if (markup && random() < 0.15)
			part = pick(random, [
				`*${part}*`,
				`**${part}**`,
				`_${part}_`,
				`[${part}](https://x.org/${word})`,
				`\`${part}\``,
				`<i>${part}</i>`,
				`${part}[^${word}]`,
				`![${part}](bild.png) ${part}`,
				`${part}\\*`,
				`<q>${part}</q>`,
			]);
		if (random() < 0.3) part += pick(random, ends);
		parts.push(part);
	}
	return parts.join(" ");
}

/**
 * A random Markdown block. Without markup, each block's Sentences stand in
 * the source as written: no inline markup, and only a paragraph wraps.
 */
function block(random: () => number, markup: boolean): string {
	const line = () => prose(random, markup);
	const kinds = [
		() =>
			`${line()}\n${line()}${pick(random, markup ? ["", "  ", "\\"] : ["", "  "])}\n${line()}`,
		() => `${"#".repeat(1 + Math.floor(random() * 6))} ${line()}`,
		() => `- ${line()}\n* ${line()}`,
		() => `1. ${line()}\n2. ${line()}`,
		() => `> ${line()}`,
		() => `| ${line()} | ${line()} |\n|---|---|\n| ${line()} | ${line()} |`,
		() => `[^n]: ${line()}`,
		() => "* * *",
		() => "```\ncode. Mehr\n```",
		...(markup
			? [
					() => `> ${line()}\n> ${line()}`,
					() =>
						`<section title="Teil">\n\n# ${line()}\n\n${line()}\n\n</section>`,
				]
			: []),
	];
	return pick(random, kinds)();
}

const document = (random: () => number, markup: boolean) =>
	Array.from({ length: 1 + Math.floor(random() * 8) }, () =>
		block(random, markup),
	).join(pick(random, ["\n\n", "\n\n\n", "\r\n\r\n"]));

describe("splitMarkdown, property", () => {
	const random = generator(1294);
	const marked = Array.from({ length: 400 }, () => document(random, true));
	const plain = Array.from({ length: 400 }, () => document(random, false));

	test("its Sentences are extractedTextFromMarkdown's and splitScroll's", () => {
		for (const markdown of [...marked, ...plain])
			expect(splitSentences(markdown)).toEqual(pipeline(markdown));
	});

	test("each span runs from its Sentence's first character to its last, and holds the rest in order", () => {
		for (const markdown of marked) {
			const split = splitMarkdown(markdown);
			expectOrderedSpans(markdown, split);
			for (const { text, slice } of slices(markdown, split)) {
				const sentence = visible(text);
				const source = visible(slice);
				expect(source.startsWith(sentence.slice(0, 1))).toBe(true);
				expect(source.endsWith(sentence.slice(-1))).toBe(true);
				expect(isSubsequence(sentence, source)).toBe(true);
			}
		}
	});

	test("without inline markup, each span's slice equals its Sentence apart from whitespace and NFC", () => {
		for (const markdown of plain)
			for (const { text, slice } of slices(
				markdown,
				splitMarkdown(markdown),
			))
				expect(visible(slice)).toBe(visible(text));
	});
});

test("the Markdown fixtures split as splitScroll splits them, every span in place", () => {
	const fixtures = join(import.meta.dir, "../extracted-text/html");
	for (const name of readdirSync(fixtures).filter((file) =>
		file.endsWith(".markdown"),
	)) {
		const markdown = readFileSync(join(fixtures, name), "utf8");
		expect(splitSentences(markdown)).toEqual(pipeline(markdown));
		expectOrderedSpans(markdown, splitMarkdown(markdown));
	}
});

/** The Sentences with the Markdown slice each span names. */
const spans = (markdown: string) =>
	splitMarkdown(markdown).paragraphs.map(({ kind, sentences }) => ({
		kind,
		sentences: sentences.map(({ text, start, end }) => [
			text,
			markdown.slice(start, end),
		]),
	}));

describe("splitMarkdown, the tricky cases", () => {
	test("headings are Headings, a Scroll's own included, and their spans skip the #", () => {
		expect(
			spans("# Kapitel 1\n\nEr kam.\n\n## Danach ##\n\nEnde."),
		).toEqual([
			{ kind: "Heading", sentences: [["Kapitel 1", "Kapitel 1"]] },
			{ kind: "Paragraph", sentences: [["Er kam.", "Er kam."]] },
			{ kind: "Heading", sentences: [["Danach", "Danach"]] },
			{ kind: "Paragraph", sentences: [["Ende.", "Ende."]] },
		]);
	});

	test("usw. can close a Sentence before a capital", () => {
		expect(
			sentencesOf(splitMarkdown("Obst, Gemüse usw. Dann gehen wir.")),
		).toEqual([
			{
				kind: "Paragraph",
				sentences: ["Obst, Gemüse usw.", "Dann gehen wir."],
			},
		]);
	});

	test("a link keeps its text and its span its markup; a bare URL ending a Sentence keeps its period", () => {
		expect(
			spans(
				"Mehr unter [hier](https://example.org/a.html). Dann https://x.org/b. Ende.",
			),
		).toEqual([
			{
				kind: "Paragraph",
				sentences: [
					[
						"Mehr unter hier.",
						"Mehr unter [hier](https://example.org/a.html).",
					],
					["Dann https://x.org/b.", "Dann https://x.org/b."],
					["Ende.", "Ende."],
				],
			},
		]);
	});

	test("a footnote's reference and definition hold no Sentence", () => {
		expect(
			spans(
				"Er kam.[^1] Dann ging er.\n\n[^1]: Eine Fußnote. Mit zwei Sätzen.\n\nWeiter.",
			),
		).toEqual([
			{
				kind: "Paragraph",
				sentences: [
					["Er kam.", "Er kam."],
					["Dann ging er.", "Dann ging er."],
				],
			},
			{ kind: "Paragraph", sentences: [["Weiter.", "Weiter."]] },
		]);
	});

	/**
	 * splitText's behavior today, not a goal: an ordered item keeps its
	 * number, and the number is a Sentence of its own.
	 */
	test("ordered items: each is a paragraph, and its number splits off", () => {
		expect(spans("1. Das ist eins.\n2. Das ist zwei.")).toEqual([
			{
				kind: "Paragraph",
				sentences: [
					["1.", "1."],
					["Das ist eins.", "Das ist eins."],
				],
			},
			{
				kind: "Paragraph",
				sentences: [
					["2.", "2."],
					["Das ist zwei.", "Das ist zwei."],
				],
			},
		]);
	});

	test("HTML entities stay as written", () => {
		expect(spans("Tom &amp; Jerry kamen. Dann &auml;rger.")).toEqual([
			{
				kind: "Paragraph",
				sentences: [
					["Tom &amp; Jerry kamen.", "Tom &amp; Jerry kamen."],
					["Dann &auml;rger.", "Dann &auml;rger."],
				],
			},
		]);
	});

	test("a hyphen opening a dialogue line is a bullet, so its span starts after it; an en dash stays", () => {
		expect(
			spans("- Kommst du?\n- Ja, sagte er.\n\n– Kommst du? – Ja."),
		).toEqual([
			{ kind: "Paragraph", sentences: [["Kommst du?", "Kommst du?"]] },
			{
				kind: "Paragraph",
				sentences: [["Ja, sagte er.", "Ja, sagte er."]],
			},
			{
				kind: "Paragraph",
				sentences: [["– Kommst du? – Ja.", "– Kommst du? – Ja."]],
			},
		]);
	});

	test("verse needs Line Breaks; a soft wrap joins its lines and its span crosses the line break", () => {
		expect(
			sentencesOf(
				splitMarkdown(
					"Über allen Gipfeln  \nIst Ruh,\\\nIn allen Wipfeln",
				),
			),
		).toEqual([
			{ kind: "Paragraph", sentences: ["Über allen Gipfeln"] },
			{ kind: "Paragraph", sentences: ["Ist Ruh,"] },
			{ kind: "Paragraph", sentences: ["In allen Wipfeln"] },
		]);
		expect(
			spans("Er ging langsam\ndie Straße hinunter. Dann blieb er."),
		).toEqual([
			{
				kind: "Paragraph",
				sentences: [
					[
						"Er ging langsam die Straße hinunter.",
						"Er ging langsam\ndie Straße hinunter.",
					],
					["Dann blieb er.", "Dann blieb er."],
				],
			},
		]);
	});

	test("Mr and Mr. both run on into Dursley", () => {
		expect(
			sentencesOf(
				splitMarkdown("Mr. Dursley was the director. Mr Dursley sat."),
			),
		).toEqual([
			{
				kind: "Paragraph",
				sentences: ["Mr. Dursley was the director.", "Mr Dursley sat."],
			},
		]);
	});

	test("block quotes, tables and images: spans point into the source past their markers", () => {
		expect(
			spans(
				"> Ein Zitat. Noch eins\n> geht weiter.\n\n| a. B | c |\n|---|---|\n\n![Ein Bild](x.png) Er kam *spät*.",
			),
		).toEqual([
			{
				kind: "Paragraph",
				sentences: [
					["Ein Zitat.", "Ein Zitat."],
					["Noch eins geht weiter.", "Noch eins\n> geht weiter."],
				],
			},
			{ kind: "Paragraph", sentences: [["a. B | c", "a. B | c"]] },
			{
				kind: "Paragraph",
				sentences: [["Er kam spät.", "Er kam *spät*."]],
			},
		]);
	});

	test("offsets count UTF-16 units of the Markdown as written, NFD included", () => {
		const markdown = "## Mu\u0308ller\n\nEr kam 🙂. Dann e\u0301te\u0301.";
		expect(splitMarkdown(markdown).paragraphs).toEqual([
			{
				kind: "Heading",
				sentences: [{ text: "Müller", start: 3, end: 10 }],
			},
			{
				kind: "Paragraph",
				sentences: [
					{ text: "Er kam 🙂.", start: 12, end: 22 },
					{ text: "Dann été.", start: 23, end: 34 },
				],
			},
		]);
	});

	test("a Section's title is no Sentence", () => {
		expect(
			sentencesOf(
				splitMarkdown(
					'<section title="Teil 1">\n# Kapitel\n\nEr kam.\n</section>',
				),
			),
		).toEqual([
			{ kind: "Heading", sentences: ["Kapitel"] },
			{ kind: "Paragraph", sentences: ["Er kam."] },
		]);
	});
});
