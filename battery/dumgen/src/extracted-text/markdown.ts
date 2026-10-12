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
	LineBreak,
	Paragraph,
	Run,
	SceneBreak,
	Scroll,
	Section,
} from "./extracted-text.js";

type Inline = Run | LineBreak;

const styleOrder: readonly InlineStyle[] = ["Italic", "Bold", "Quotation"];

type Delimiter = {
	readonly type: "delimiter";
	readonly char: "*" | "_";
	readonly length: number;
	readonly canOpen: boolean;
	readonly canClose: boolean;
	count: number;
	active: boolean;
	readonly opens: InlineStyle[];
	readonly closes: InlineStyle[];
};

type Tag = {
	readonly type: "tag";
	readonly style: InlineStyle;
	readonly closing: boolean;
	readonly source: string;
	matched: boolean;
};

type Token =
	| { readonly type: "text"; text: string }
	| { readonly type: "break" }
	| Delimiter
	| Tag;

const asciiPunctuation = /^[!-/:-@[-`{-~]$/u;
const punctuation = /^[\p{P}\p{S}]$/u;
const whitespace = /^\s$/u;

const tagStyles: Readonly<Record<string, InlineStyle>> = {
	b: "Bold",
	em: "Italic",
	i: "Italic",
	q: "Quotation",
	strong: "Bold",
};

const plain = /^[^\\`![<*_]+/u;
const image = /^!\[[^\]]*\]\([^)]*\)/u;
const footnoteReference = /^\[\^[^\]\s]+\]/u;
const link = /^\[([^\]]*)\]\([^)]*\)/u;
const styleTag = /^<(\/?)(b|em|i|q|strong)>/iu;
const breakTag = /^<br\s*\/?>/iu;
const delimiterRun = /^(?:\*+|_+)/u;

/** The index where a run of exactly `length` backticks starts, or -1. */
function backtickRun(line: string, from: number, length: number): number {
	const runs = /`+/gu;
	runs.lastIndex = from;
	for (let run = runs.exec(line); run !== null; run = runs.exec(line))
		if (run[0].length === length) return run.index;
	return -1;
}

/**
 * A `*` or `_` run with CommonMark's flanking rules, a line's edges
 * counting as whitespace.
 */
function delimiter(run: string, before: string, after: string): Delimiter {
	const spaceBefore = whitespace.test(before);
	const spaceAfter = whitespace.test(after);
	const punctBefore = punctuation.test(before);
	const punctAfter = punctuation.test(after);
	const left = !spaceAfter && (!punctAfter || spaceBefore || punctBefore);
	const right = !spaceBefore && (!punctBefore || spaceAfter || punctAfter);
	const char = run[0] === "_" ? "_" : "*";
	return {
		type: "delimiter",
		char,
		length: run.length,
		canOpen: char === "*" ? left : left && (!right || punctBefore),
		canClose: char === "*" ? right : right && (!left || punctAfter),
		count: run.length,
		active: true,
		opens: [],
		closes: [],
	};
}

/** What one inline reader took: its tokens and how many characters. */
type Taken = { readonly tokens: readonly Token[]; readonly length: number };

/**
 * One reader per inline construct, in precedence order. Each reads the
 * construct opening `line` at `index`, or returns undefined.
 */
const inlineReaders: readonly ((
	line: string,
	index: number,
) => Taken | undefined)[] = [
	(line, index) => {
		const text = plain.exec(line.slice(index))?.[0];
		return text === undefined
			? undefined
			: { tokens: [{ type: "text", text }], length: text.length };
	},
	(line, index) => {
		const next = line[index + 1] ?? "";
		return line[index] === "\\" && asciiPunctuation.test(next)
			? { tokens: [{ type: "text", text: next }], length: 2 }
			: undefined;
	},
	(line, index) => {
		const open = /^`+/u.exec(line.slice(index))?.[0];
		if (open === undefined) return undefined;
		const close = backtickRun(line, index + open.length, open.length);
		if (close === -1)
			return {
				tokens: [{ type: "text", text: open }],
				length: open.length,
			};
		const code = line.slice(index + open.length, close);
		const text =
			code.length > 2 && code.startsWith(" ") && code.endsWith(" ")
				? code.slice(1, -1)
				: code;
		return {
			tokens: [{ type: "text", text }],
			length: close + open.length - index,
		};
	},
	(line, index) => {
		const rest = line.slice(index);
		const skipped =
			image.exec(rest)?.[0] ?? footnoteReference.exec(rest)?.[0];
		return skipped === undefined
			? undefined
			: { tokens: [], length: skipped.length };
	},
	(line, index) => {
		const linked = link.exec(line.slice(index));
		return linked === null
			? undefined
			: {
					tokens: tokenizeLine(linked[1] ?? ""),
					length: linked[0].length,
				};
	},
	(line, index) => {
		const tag = styleTag.exec(line.slice(index));
		const style = tagStyles[tag?.[2]?.toLowerCase() ?? ""];
		if (tag === null || style === undefined) return undefined;
		const token: Tag = {
			type: "tag",
			style,
			closing: tag[1] === "/",
			source: tag[0],
			matched: false,
		};
		return { tokens: [token], length: tag[0].length };
	},
	(line, index) => {
		const lineBreak = breakTag.exec(line.slice(index))?.[0];
		return lineBreak === undefined
			? undefined
			: { tokens: [{ type: "break" }], length: lineBreak.length };
	},
	(line, index) => {
		const run = delimiterRun.exec(line.slice(index))?.[0];
		if (run === undefined) return undefined;
		const before = line[index - 1] ?? " ";
		const after = line[index + run.length] ?? " ";
		return { tokens: [delimiter(run, before, after)], length: run.length };
	},
];

/** One line's inline tokens, neighbouring text merged. */
function tokenizeLine(line: string): Token[] {
	const tokens: Token[] = [];
	let index = 0;
	while (index < line.length) {
		let taken: Taken | undefined;
		for (const read of inlineReaders) {
			taken = read(line, index);
			if (taken !== undefined) break;
		}
		taken ??= {
			tokens: [{ type: "text", text: line[index] ?? "" }],
			length: 1,
		};
		for (const token of taken.tokens) {
			const last = tokens.at(-1);
			if (token.type === "text" && last?.type === "text")
				last.text += token.text;
			else tokens.push(token.type === "text" ? { ...token } : token);
		}
		index += taken.length;
	}
	return tokens;
}

/**
 * The nearest delimiter before `closerIndex` that can open for its closer,
 * CommonMark's rule of three included, or -1.
 */
function openerFor(
	delimiters: readonly Delimiter[],
	closerIndex: number,
	closer: Delimiter,
): number {
	for (let index = closerIndex - 1; index >= 0; index -= 1) {
		const opener = delimiters[index];
		if (
			opener === undefined ||
			!opener.active ||
			!opener.canOpen ||
			opener.count === 0 ||
			opener.char !== closer.char
		)
			continue;
		const ruleOfThree =
			(opener.canClose || closer.canOpen) &&
			(opener.length + closer.length) % 3 === 0 &&
			!(opener.length % 3 === 0 && closer.length % 3 === 0);
		if (!ruleOfThree) return index;
	}
	return -1;
}

/** CommonMark's emphasis matching, over a Paragraph's delimiter runs. */
function matchEmphasis(tokens: readonly Token[]): void {
	const delimiters = tokens.filter(
		(token): token is Delimiter => token.type === "delimiter",
	);
	for (const [closerIndex, closer] of delimiters.entries()) {
		while (closer.active && closer.canClose && closer.count > 0) {
			const openerIndex = openerFor(delimiters, closerIndex, closer);
			const opener = delimiters[openerIndex];
			if (opener === undefined) break;
			const used = opener.count >= 2 && closer.count >= 2 ? 2 : 1;
			const style = used === 2 ? "Bold" : "Italic";
			opener.count -= used;
			closer.count -= used;
			opener.opens.unshift(style);
			closer.closes.push(style);
			for (const between of delimiters.slice(
				openerIndex + 1,
				closerIndex,
			))
				between.active = false;
		}
	}
}

/** Pairs each style tag with the nearest open one of its style. */
function matchTags(tokens: readonly Token[]): void {
	const open = new Map<InlineStyle, Tag[]>();
	for (const token of tokens) {
		if (token.type !== "tag") continue;
		const stack = open.get(token.style) ?? [];
		open.set(token.style, stack);
		if (!token.closing) {
			stack.push(token);
			continue;
		}
		const opener = stack.pop();
		if (opener === undefined) continue;
		opener.matched = true;
		token.matched = true;
	}
}

function run(text: string, styles: readonly InlineStyle[]): Run {
	return styles.length > 0
		? { kind: "Run", text, styles }
		: { kind: "Run", text };
}

const sameStyles = (left: Run, right: Run) =>
	(left.styles ?? []).join() === (right.styles ?? []).join();

/**
 * Inlines in canonical form: no blank line between two Line Breaks, lines
 * trimmed, no empty run, and neighbouring runs merged where nothing tells
 * them apart.
 */
function canonical(inlines: readonly Inline[]): Inline[] {
	const lines: Run[][] = [[]];
	for (const inline of inlines)
		if (inline.kind === "LineBreak") lines.push([]);
		else lines.at(-1)?.push(inline);
	return lines
		.map(trimLine)
		.filter((line) => line.length > 0)
		.flatMap((line, index) => [
			...(index > 0 ? [{ kind: "LineBreak" } as const] : []),
			...line,
		]);
}

function trimLine(runs: readonly Run[]): Run[] {
	const merged: Run[] = [];
	for (const next of runs) {
		const last = merged.at(-1);
		if (
			last !== undefined &&
			last.locations === undefined &&
			next.locations === undefined &&
			sameStyles(last, next)
		)
			merged[merged.length - 1] = {
				...last,
				text: last.text + next.text,
			};
		else merged.push(next);
	}
	let start = 0;
	while ((merged[start]?.text.trimStart() ?? "x") === "") start += 1;
	let end = merged.length;
	while ((merged[end - 1]?.text.trimEnd() ?? "x") === "") end -= 1;
	return merged.slice(start, end).flatMap((current, index, kept) => {
		let text = current.text;
		if (index === 0) text = text.trimStart();
		if (index === kept.length - 1) text = text.trimEnd();
		return text.length > 0 ? [{ ...current, text }] : [];
	});
}

/** The inlines a Paragraph's matched tokens stand for. */
function inlinesOf(tokens: readonly Token[]): Inline[] {
	matchEmphasis(tokens);
	matchTags(tokens);
	const depth = new Map<InlineStyle, number>();
	const shift = (style: InlineStyle, by: number) =>
		depth.set(style, (depth.get(style) ?? 0) + by);
	const inlines: Inline[] = [];
	const emit = (text: string) => {
		if (text.length === 0) return;
		inlines.push(
			run(
				text,
				styleOrder.filter((style) => (depth.get(style) ?? 0) > 0),
			),
		);
	};
	for (const token of tokens) {
		if (token.type === "text") emit(token.text);
		else if (token.type === "break") inlines.push({ kind: "LineBreak" });
		else if (token.type === "tag") {
			if (token.matched) shift(token.style, token.closing ? -1 : 1);
			else emit(token.source);
		} else {
			for (const style of token.closes) shift(style, -1);
			emit(token.char.repeat(token.count));
			for (const style of token.opens) shift(style, 1);
		}
	}
	return canonical(inlines);
}

/**
 * A Paragraph's inlines from its source lines. A line ending in two spaces
 * or an unescaped `\` breaks the line; any other line break is a space.
 */
function paragraphInlines(lines: readonly string[]): Inline[] {
	const tokens: Token[] = [];
	for (const [index, source] of lines.entries()) {
		const last = index === lines.length - 1;
		const backslashes = /\\+$/u.exec(source)?.[0].length ?? 0;
		const breaks =
			!last && (/ {2}$/u.test(source) || backslashes % 2 === 1);
		const line =
			breaks && backslashes % 2 === 1 ? source.slice(0, -1) : source;
		tokens.push(...tokenizeLine(line.trimEnd()));
		if (!last)
			tokens.push(
				breaks ? { type: "break" } : { type: "text", text: " " },
			);
	}
	return inlinesOf(tokens);
}

function headingRuns(source: string): Run[] {
	return inlinesOf(
		tokenizeLine(source).map((token) =>
			token.type === "break" ? { type: "text", text: " " } : token,
		),
	).filter((inline): inline is Run => inline.kind === "Run");
}

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
