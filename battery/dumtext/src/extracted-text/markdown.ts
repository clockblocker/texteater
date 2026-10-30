/**
 * Markdown import and export for Extracted Text (#1176). Markdown is never
 * the stored form: it is how extractors hand text in and how curators and
 * LLM prompts see it. Original Locations have no Markdown form, so export
 * drops them and import yields none.
 *
 * The dialect is CommonMark's, narrowed to what Extracted Text holds:
 *
 * - `# Title` opens a Scroll with that Heading; a bare `#` opens one
 *   without. Text before the first `#` is a Scroll of its own.
 * - `##` to `######` are Headings inside the Scroll.
 * - `<section title="Title">` on a line of its own opens a Section and
 *   `</section>` closes it; inside, `#` opens Scrolls as outside, and
 *   Sections nest. A Section left open closes at the end, and a stray
 *   `</section>` is dropped. In the title, `&quot;` stands for `"` and
 *   `&amp;` for `&`.
 * - A thematic break (`***`, `---`, `___`) is a Scene Break; export writes
 *   `* * *`.
 * - A blank line ends a Paragraph. A line ending in `\` (or, on import, in
 *   two spaces) or a `<br>` is a Line Break; any other line break is a
 *   space, so hard-wrapped Markdown reads as running text.
 * - `*italic*`, `_italic_`, `**bold**`, `__bold__`, and `<i>`, `<em>`,
 *   `<b>`, `<strong>` are Inline Styles, and so is `<q>quotation</q>`.
 *   Export writes `*` and `**` and falls back to `<i>` and `<b>` for a line
 *   CommonMark's emphasis rules would misread.
 *
 * Import keeps the words of what Extracted Text has no place for: a list
 * item, a table row or a block quote's Paragraph becomes a Paragraph (an
 * ordered item keeps its number), a link keeps its text, code keeps its
 * characters and a fenced block its lines. It drops images and footnotes.
 */
import type {
	ExtractedText,
	Heading,
	InlineStyle,
	Paragraph,
	Run,
	SceneBreak,
	Scroll,
	Section,
} from "./extracted-text.js";
import {
	canonical,
	headingRuns,
	type Inline,
	inlinesOf,
	paragraphInlines,
	run,
	styleOrder,
	tokenizeLine,
	trimLine,
	whitespace,
} from "./markdown-inline.js";

const atxHeading = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/u;
const fence = /^ {0,3}(`{3,}|~{3,})/u;
const thematicBreak = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/u;
const footnoteDefinition = /^ {0,3}\[\^[^\]]+\]:/u;
const tableDelimiterRow = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?\s*$/u;
const blockQuote = /^ {0,3}> ?/u;
const bulletItem = /^\s*[-+*][ \t]+(.*)$/u;
const orderedItem = /^\s*(\d{1,9})([.)])[ \t]+(.*)$/u;

const sectionOpening = /^ {0,3}<section title="([^"]*)">[ \t]*$/u;
const sectionClosing = /^ {0,3}<\/section>[ \t]*$/u;

type ScrollDraft = {
	heading?: Scroll["heading"];
	blocks: (Heading | Paragraph | SceneBreak)[];
};

/** The root, or an open Section with its title. */
type ContainerDraft = {
	readonly title?: string;
	readonly contents: (Section | Scroll)[];
};

/** Where a pass over a Markdown document's lines stands. */
type Reading = {
	/** The root first, then each open Section, innermost last. */
	readonly containers: [ContainerDraft, ...ContainerDraft[]];
	scroll: ScrollDraft;
	/** Whether a `#` has opened the Scroll being read. */
	opened: boolean;
	paragraph: string[];
	/** Whether the open Paragraph is a list item. */
	listItem: boolean;
	fenced: { readonly marker: string; readonly lines: string[] } | undefined;
	/** Whether the lines are a footnote's, until a blank line. */
	footnote: boolean;
};

function flush(reading: Reading): void {
	const inlines = paragraphInlines(reading.paragraph);
	reading.paragraph = [];
	reading.listItem = false;
	if (inlines.length > 0)
		reading.scroll.blocks.push({ kind: "Paragraph", inlines });
}

function startParagraph(
	reading: Reading,
	line: string,
	listItem: boolean,
): true {
	flush(reading);
	reading.paragraph.push(line);
	reading.listItem = listItem;
	return true;
}

/** A line inside a fenced block: kept as written, or the closing fence. */
function readFenced(
	reading: Reading,
	fenced: NonNullable<Reading["fenced"]>,
	line: string,
): void {
	const closing = fence.exec(line)?.[1];
	if (
		closing === undefined ||
		closing[0] !== fenced.marker[0] ||
		closing.length < fenced.marker.length ||
		line.trim() !== closing
	) {
		fenced.lines.push(line);
		return;
	}
	reading.fenced = undefined;
	const inlines = canonical(
		fenced.lines.flatMap((text, index) => [
			...(index > 0 ? [{ kind: "LineBreak" } as const] : []),
			run(text, []),
		]),
	);
	if (inlines.length > 0)
		reading.scroll.blocks.push({ kind: "Paragraph", inlines });
}

function readHeading(reading: Reading, line: string): boolean {
	const heading = atxHeading.exec(line);
	if (heading === null) return false;
	flush(reading);
	const level = heading[1]?.length ?? 1;
	const runs = headingRuns(heading[2] ?? "");
	if (level > 1) {
		if (runs.length > 0)
			reading.scroll.blocks.push({
				kind: "Heading",
				level: level as Heading["level"],
				runs,
			});
		return true;
	}
	closeScroll(reading, false);
	if (runs.length > 0) reading.scroll.heading = { runs };
	reading.opened = true;
	return true;
}

const innermost = (reading: Reading): ContainerDraft =>
	reading.containers.at(-1) ?? reading.containers[0];

/**
 * Ends the Scroll being read: kept when a `#` opened it or it holds a
 * block, or, with `keepEmpty`, when its container would otherwise be empty.
 */
function closeScroll(reading: Reading, keepEmpty: boolean): void {
	const { contents } = innermost(reading);
	if (
		reading.opened ||
		reading.scroll.blocks.length > 0 ||
		(keepEmpty && contents.length === 0)
	)
		contents.push({ kind: "Scroll", ...reading.scroll });
	reading.scroll = { blocks: [] };
	reading.opened = false;
}

/** Ends the innermost open Section, if one is open. */
function closeSection(reading: Reading): void {
	if (reading.containers.length === 1) return;
	closeScroll(reading, true);
	const { title, contents } = reading.containers.pop() as ContainerDraft;
	const [first, ...rest] = contents;
	if (title === undefined || first === undefined) return;
	innermost(reading).contents.push({
		kind: "Section",
		title,
		contents: [first, ...rest],
	});
}

const decodeTitle = (title: string) =>
	title
		.replace(/&quot;/gu, '"')
		.replace(/&amp;/gu, "&")
		.trim();

function readSection(reading: Reading, line: string): boolean {
	if (sectionClosing.test(line)) {
		flush(reading);
		closeSection(reading);
		return true;
	}
	const title = decodeTitle(sectionOpening.exec(line)?.[1] ?? "");
	if (title.length === 0) return false;
	flush(reading);
	closeScroll(reading, false);
	reading.containers.push({ title, contents: [] });
	return true;
}

/**
 * One reader per block construct a line can open, in precedence order.
 * Each takes the line and returns true, or leaves it to the next.
 */
const blockReaders: readonly ((reading: Reading, line: string) => boolean)[] = [
	(reading, line) => {
		const marker = fence.exec(line)?.[1];
		if (marker === undefined) return false;
		flush(reading);
		reading.fenced = { marker, lines: [] };
		return true;
	},
	readSection,
	readHeading,
	(reading, line) => {
		if (!thematicBreak.test(line)) return false;
		flush(reading);
		reading.scroll.blocks.push({ kind: "SceneBreak" });
		return true;
	},
	(reading, line) => {
		if (!tableDelimiterRow.test(line)) return false;
		flush(reading);
		return true;
	},
	(reading, line) => {
		if (!footnoteDefinition.test(line)) return false;
		flush(reading);
		reading.footnote = true;
		return true;
	},
	(reading, line) => {
		const row = line.trim();
		if (!row.startsWith("|")) return false;
		const cells = row
			.replace(/^\|/u, "")
			.replace(/(?<!\\)\|$/u, "")
			.split(/(?<!\\)\|/u)
			.map((cell) => cell.trim());
		startParagraph(reading, cells.join(" | "), false);
		flush(reading);
		return true;
	},
	(reading, line) => {
		const bullet = bulletItem.exec(line);
		return (
			bullet !== null && startParagraph(reading, bullet[1] ?? "", true)
		);
	},
	(reading, line) => {
		const ordered = orderedItem.exec(line);
		if (
			ordered === null ||
			(reading.paragraph.length > 0 &&
				!reading.listItem &&
				ordered[1] !== "1")
		)
			return false;
		const number = `${ordered[1]}\\${ordered[2]}`;
		return startParagraph(reading, `${number} ${ordered[3]}`, true);
	},
];

/**
 * The Extracted Text a Markdown document describes, in the dialect above.
 * The input is read as NFC. A document with no Heading and no text is one
 * empty Scroll, and so is a Section with nothing in it.
 */
export function extractedTextFromMarkdown(markdown: string): ExtractedText {
	const reading: Reading = {
		containers: [{ contents: [] }],
		scroll: { blocks: [] },
		opened: false,
		paragraph: [],
		listItem: false,
		fenced: undefined,
		footnote: false,
	};
	for (const source of markdown.normalize("NFC").split(/\r\n?|\n/u)) {
		if (reading.fenced !== undefined) {
			readFenced(reading, reading.fenced, source);
			continue;
		}
		let line = source;
		while (blockQuote.test(line)) line = line.replace(blockQuote, "");
		if (line.trim().length === 0) {
			flush(reading);
			reading.footnote = false;
		} else if (
			!reading.footnote &&
			!blockReaders.some((read) => read(reading, line))
		)
			reading.paragraph.push(line.trimStart());
	}
	flush(reading);
	while (reading.containers.length > 1) closeSection(reading);
	closeScroll(reading, true);
	const [first, ...rest] = reading.containers[0].contents;
	return {
		contents: first ? [first, ...rest] : [{ kind: "Scroll", blocks: [] }],
	};
}

// Export.

type StyledChar = { readonly char: string; readonly styles: Set<InlineStyle> };

type Markers = Readonly<Record<InlineStyle, readonly [string, string]>>;

const markdownMarkers: Markers = {
	Italic: ["*", "*"],
	Bold: ["**", "**"],
	Quotation: ["<q>", "</q>"],
};

const htmlMarkers: Markers = {
	Italic: ["<i>", "</i>"],
	Bold: ["<b>", "</b>"],
	Quotation: ["<q>", "</q>"],
};

/** Which of two styles opening together goes outside. */
const nestingOrder: readonly InlineStyle[] = ["Quotation", "Italic", "Bold"];

/** Drops `style` from the whitespace at the edges of each of its stretches. */
function unstyleEdges(chars: readonly StyledChar[], style: InlineStyle): void {
	const edges = (from: number, to: number, step: 1 | -1) => {
		for (let index = from; index !== to; index += step) {
			const at = chars[index];
			if (at === undefined || !whitespace.test(at.char)) return;
			at.styles.delete(style);
		}
	};
	let index = 0;
	while (index < chars.length) {
		if (!chars[index]?.styles.has(style)) {
			index += 1;
			continue;
		}
		let stop = index;
		while (chars[stop]?.styles.has(style)) stop += 1;
		edges(index, stop, 1);
		edges(stop - 1, index - 1, -1);
		index = stop;
	}
}

/**
 * One line's characters with their styles, trimmed, each style dropped from
 * the whitespace at the edges of its stretches: emphasis cannot open before
 * or close after a space.
 */
function styledChars(runs: readonly Run[]): StyledChar[] {
	const chars = runs.flatMap((current) =>
		Array.from(current.text, (char) => ({
			char,
			styles: new Set(current.styles ?? []),
		})),
	);
	let start = 0;
	while (whitespace.test(chars[start]?.char ?? "x")) start += 1;
	let end = chars.length;
	while (end > start && whitespace.test(chars[end - 1]?.char ?? "x"))
		end -= 1;
	const kept = chars.slice(start, end);
	for (const style of styleOrder) unstyleEdges(kept, style);
	return kept;
}

function runsOf(chars: readonly StyledChar[]): Run[] {
	return trimLine(
		chars.map(({ char, styles }) =>
			run(
				char,
				styleOrder.filter((style) => styles.has(style)),
			),
		),
	);
}

function escapeText(
	text: string,
	lineStart: boolean,
	inHeading: boolean,
): string {
	let escaped = text.replace(/[\\*_<`[]/gu, "\\$&");
	if (inHeading) escaped = escaped.replace(/#/gu, "\\#");
	if (!lineStart) return escaped;
	if (/^[#>+=|~:-]/u.test(escaped)) return `\\${escaped}`;
	return escaped.replace(/^(\d{1,9})([.)])/u, "$1\\$2");
}

function renderRuns(
	runs: readonly Run[],
	markers: Markers,
	inHeading: boolean,
): string {
	const segments = runs;
	let open: InlineStyle[] = [];
	let out = "";
	for (const [index, segment] of segments.entries()) {
		const styles = new Set(segment.styles ?? []);
		let keep = 0;
		while (keep < open.length && styles.has(open[keep] as InlineStyle))
			keep += 1;
		for (const style of open.slice(keep).reverse())
			out += markers[style][1];
		open = open.slice(0, keep);
		const reach = (style: InlineStyle) => {
			let stop = index;
			while (segments[stop]?.styles?.includes(style)) stop += 1;
			return stop;
		};
		const opening = nestingOrder
			.filter((style) => styles.has(style) && !open.includes(style))
			.sort((left, right) => reach(right) - reach(left));
		for (const style of opening) out += markers[style][0];
		open.push(...opening);
		out += escapeText(
			segment.text,
			!inHeading && out.length === 0,
			inHeading,
		);
	}
	for (const style of open.reverse()) out += markers[style][1];
	return out;
}

/**
 * One line of Markdown for runs, with `*` and `**` where CommonMark reads
 * them back as written, and `<i>` and `<b>` where it would not.
 */
function renderLine(runs: readonly Run[], inHeading: boolean): string {
	const expected = runsOf(styledChars(runs));
	const written = renderRuns(expected, markdownMarkers, inHeading);
	const reread = inlinesOf(tokenizeLine(written));
	return JSON.stringify(reread) === JSON.stringify(expected)
		? written
		: renderRuns(expected, htmlMarkers, inHeading);
}

function linesOf(inlines: readonly Inline[]): Run[][] {
	const lines: Run[][] = [[]];
	for (const inline of inlines)
		if (inline.kind === "LineBreak") lines.push([]);
		else lines.at(-1)?.push(inline);
	return lines;
}

function renderBlock(block: Heading | Paragraph | SceneBreak): string {
	if (block.kind === "SceneBreak") return "* * *";
	if (block.kind === "Heading") {
		const text = renderLine(block.runs, true);
		return text.length > 0 ? `${"#".repeat(block.level)} ${text}` : "";
	}
	return linesOf(block.inlines)
		.map((line) => renderLine(line, false))
		.filter((line) => line.length > 0)
		.join("\\\n");
}

/**
 * The Markdown for an Extracted Text, in the dialect above, without its
 * Original Locations. Reading it back gives the Extracted Text in canonical
 * form: lines trimmed, no blank line, no style on the whitespace at a
 * style's edges, neighbouring runs merged.
 */
export function extractedTextToMarkdown(text: ExtractedText): string {
	const markdown = renderContents(text.contents)
		.filter((part) => part.length > 0)
		.join("\n\n");
	return markdown.length > 0 ? `${markdown}\n` : "";
}

const encodeTitle = (title: string) =>
	title.replace(/&/gu, "&amp;").replace(/"/gu, "&quot;");

/**
 * The blocks of Markdown for a container's Sections and Scrolls. A Scroll
 * without a Heading needs no `#` where a Scroll begins on import anyway:
 * first in its container or after a Section, and holding a block or alone.
 */
function renderContents(contents: readonly (Section | Scroll)[]): string[] {
	return contents.flatMap((item, index) => {
		if (item.kind === "Section")
			return [
				`<section title="${encodeTitle(item.title)}">`,
				...renderContents(item.contents),
				"</section>",
			];
		const title =
			item.heading === undefined
				? ""
				: renderLine(item.heading.runs, true);
		const bare =
			contents[index - 1]?.kind !== "Scroll" &&
			(item.blocks.length > 0 || contents.length === 1);
		const opening = title.length > 0 ? `# ${title}` : bare ? "" : "#";
		return [opening, ...item.blocks.map(renderBlock)];
	});
}
