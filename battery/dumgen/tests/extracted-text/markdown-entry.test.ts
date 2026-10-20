import { expect, test } from "bun:test";
import { extractedTextFromMarkdown, type Scroll, splitScroll } from "dumgen";

/**
 * The Markdown reader through Dumgen's public entry (#1205): a host whose
 * Scrolls are Markdown files reads one and splits each of its Scrolls.
 */
test("a Markdown document read through the public entry splits into paragraphs and Sentences", () => {
	const text = extractedTextFromMarkdown(
		[
			'<section title="Teil 1">',
			"# Kapitel 1",
			"",
			"Er kam *spät*. Sie wartete",
			"schon lange.",
			"",
			"* * *",
			"",
			"## Danach",
			"",
			"Ende.",
			"</section>",
		].join("\n"),
	);
	const scrolls = text.contents.flatMap((item): Scroll[] =>
		item.kind === "Section"
			? item.contents.filter((inner) => inner.kind === "Scroll")
			: [item],
	);
	expect(scrolls.map((scroll) => splitScroll(scroll).paragraphs)).toEqual([
		[
			{ sentences: ["Kapitel 1"] },
			{ sentences: ["Er kam spät.", "Sie wartete schon lange."] },
			{ sentences: ["Danach"] },
			{ sentences: ["Ende."] },
		],
	]);
});
