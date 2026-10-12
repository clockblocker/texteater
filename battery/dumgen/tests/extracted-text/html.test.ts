import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DOMParser } from "linkedom";
import type { Scroll } from "../../src/extracted-text/extracted-text.js";
import { scrollFromHtml } from "../../src/extracted-text/html.js";
import {
	extractedTextFromMarkdown,
	extractedTextToMarkdown,
} from "../../src/extracted-text/markdown.js";
import { parseScroll } from "../../src/extracted-text/parse.js";

const fixtures = join(import.meta.dir, "html");

/** Parses HTML as a host does, with linkedom. */
const html = (source: string) =>
	new DOMParser().parseFromString(source, "text/html");
const xhtml = (source: string) =>
	new DOMParser().parseFromString(source, "text/xml");

const markdownOf = (scroll: Scroll) =>
	extractedTextToMarkdown({ contents: [scroll] });

/** The Markdown of a snippet's Scroll, inside a body. */
const mapped = (body: string, title?: string) =>
	markdownOf(
		scrollFromHtml(html(`<html><body>${body}</body></html>`), { title }),
	);

describe("fixtures: input HTML, expected Markdown", () => {
	const cases: readonly (readonly [file: string, title?: string])[] = [
		["de-news.html", "Lokführer streiken erneut"],
		["en-structure.html", "How to Brew Tea"],
		["he-article.html", "גשם ראשון בירושלים"],
		["de-poem.html", "Erlkönig"],
		["wikipedia-de.html", "Die Verwandlung"],
		["inline-styles.html"],
		["gutenberg-verwandlung.xhtml"],
	];
	for (const [file, title] of cases)
		test(file, () => {
			const source = readFileSync(join(fixtures, file), "utf8");
			const document = file.endsWith(".xhtml")
				? xhtml(source)
				: html(source);
			const scroll = scrollFromHtml(document, { title });
			const expected = readFileSync(
				join(fixtures, file.replace(/\.x?html$/u, ".markdown")),
				"utf8",
			);
			expect(markdownOf(scroll)).toBe(expected);
			// Canonical: the Markdown reads back as the very Scroll.
			expect(extractedTextFromMarkdown(expected)).toEqual({
				contents: [scroll],
			});
			expect(parseScroll(scroll)).toEqual(scroll);
		});
});

describe("words stay whole across inline elements", () => {
	test("German compounds and Hebrew prefixes", () => {
		expect(mapped("<p>Haus<em>tür</em></p>")).toBe("Haus*tür*\n");
		expect(mapped("<p>„<i>Erl</i>könig“</p>")).toBe("„*Erl*könig“\n");
		expect(mapped('<p>ב<a href="/x">ירושלים</a></p>')).toBe("בירושלים\n");
	});

	test("whitespace collapses across element edges", () => {
		expect(mapped("<p>a <b> b </b> c</p>")).toBe("a **b** c\n");
		expect(mapped("<p>\n  one\n  two  </p>")).toBe("one two\n");
	});
});

describe("titles", () => {
	test("the first Heading repeating the title becomes the Scroll's", () => {
		const scroll = scrollFromHtml(
			html(
				"<h1>Der <i>Titel</i></h1><p>Text.</p><h2>Der Titel</h2><p>Mehr.</p>",
			),
			{ title: "der Titel!" },
		);
		expect(scroll.heading).toEqual({
			runs: [
				{ kind: "Run", text: "Der " },
				{ kind: "Run", text: "Titel", styles: ["Italic"] },
			],
		});
		expect(markdownOf(scroll)).toBe(
			"# Der *Titel*\n\nText.\n\n## Der Titel\n\nMehr.\n",
		);
	});

	test("with no Heading repeating it, the title is the Scroll's Heading", () => {
		expect(mapped("<h1>Kicker</h1><p>Text.</p>", " Ein\n Titel ")).toBe(
			"# Ein Titel\n\n## Kicker\n\nText.\n",
		);
	});

	test("without a title, h1 is a level-2 Heading and h6 stays", () => {
		expect(mapped("<h1>Eins</h1><p>a</p><h6>Sechs</h6><p>b</p>")).toBe(
			"## Eins\n\na\n\n###### Sechs\n\nb\n",
		);
	});
});

describe("Line Breaks", () => {
	test("two in a row end the Paragraph, even across inline edges", () => {
		expect(mapped("<p><i>eins<br></i>\n<br>zwei<br>drei</p>")).toBe(
			"*eins*\n\nzwei\\\ndrei\n",
		);
	});

	test("one at a Paragraph's edge is dropped", () => {
		expect(mapped("<p><br>eins<br> </p>")).toBe("eins\n");
	});

	test("a Heading or a table row reads one as a space", () => {
		expect(
			mapped("<h2>a<br>b</h2><table><tr><td>c<br>d</td></tr></table>"),
		).toBe("## a b\n\nc d\n");
	});
});

describe("dropped", () => {
	test("figures, media, hidden elements and navigation", () => {
		expect(
			mapped(
				'<nav>Menü</nav><p>a<img src="x.png" alt="Bild"> b</p>' +
					"<figure><img><figcaption>Foto: dpa</figcaption></figure>" +
					'<p hidden>versteckt</p><p style="color: red; display:none">weg</p>' +
					"<script>x()</script><p>c</p>",
			),
		).toBe("a b\n\nc\n");
	});

	test("a short block quote recurring in the text is no pull quote", () => {
		expect(
			mapped(
				"<p>Er sagte: Nein danke.</p><blockquote>Nein danke.</blockquote>",
			),
		).toBe("Er sagte: Nein danke.\n\nNein danke.\n");
	});

	test("a block quote is a pull quote only against text outside quotes", () => {
		const refrain =
			"<blockquote><p>Sah ein Knab ein Röslein stehn</p></blockquote>";
		expect(mapped(`${refrain}<p>Strophe.</p>${refrain}`)).toBe(
			"Sah ein Knab ein Röslein stehn\n\nStrophe.\n\nSah ein Knab ein Röslein stehn\n",
		);
	});
});

describe("Scene Breaks", () => {
	test("none at the edges, after another or right before a Heading", () => {
		expect(
			mapped(
				"<hr><p>a</p><hr><hr><p>b</p><p>⁂</p><h2>c</h2><p>d</p><hr>",
			),
		).toBe("a\n\n* * *\n\nb\n\n## c\n\nd\n");
	});
});

describe("EPUB slices", () => {
	const chapter = xhtml(
		readFileSync(join(fixtures, "gutenberg-verwandlung.xhtml"), "utf8"),
	);

	test("a slice runs from its anchor up to the next one", () => {
		const scroll = scrollFromHtml(
			[{ root: chapter, from: "chap01", to: "chap02" }],
			{ title: "I." },
		);
		expect(markdownOf(scroll)).toBe(
			[
				"# I.",
				"Als Gregor Samsa eines Morgens aus unruhigen Träumen erwachte, fand er sich in seinem Bett zu einem ungeheueren Ungeziefer verwandelt. Er lag auf seinem panzerartig harten Rücken.",
				"»Was ist mit mir geschehen?«, dachte er. Es war kein Traum.",
				"* * *",
				"Gregors Blick richtete sich dann zum Fenster.\n",
			].join("\n\n"),
		);
	});

	test("slices of several documents make one Scroll", () => {
		const next = xhtml(
			'<html xmlns="http://www.w3.org/1999/xhtml"><body>' +
				'<p>Fortsetzung.</p><h2 id="chap04">IV.</h2><p>Nicht mehr.</p>' +
				"</body></html>",
		);
		const scroll = scrollFromHtml(
			[
				{ root: chapter, from: "chap03" },
				{ root: next, to: "chap04" },
			],
			{ title: "III." },
		);
		expect(markdownOf(scroll)).toBe(
			"# III.\n\nDie schwere Verwundung Gregors, an der er über einen Monat litt, schien selbst den Vater daran erinnert zu haben.\n\nFortsetzung.\n",
		);
	});

	test("text before the first anchor and a missing anchor", () => {
		expect(
			markdownOf(scrollFromHtml([{ root: chapter, to: "chap01" }])),
		).toBe("## DIE VERWANDLUNG\n\nVON\\\nFRANZ KAFKA\n");
		expect(
			scrollFromHtml([{ root: chapter, from: "nowhere" }]).blocks,
		).toEqual([]);
	});
});
