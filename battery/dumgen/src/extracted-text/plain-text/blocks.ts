/**
 * A `.txt` file's text read into blocks (#1190). A blank line ends a
 * Paragraph. Inside one, a line break is a hard wrap, joined with a space,
 * unless the line stops well short of the file's wrap width, with room
 * for the next line's first word to spare: such a break is the author's
 * and stays a Line Break, as in verse and letters, and so does every
 * break of a Paragraph whose lines all stop well short. The room to spare
 * allows for wrappers that leave lines ragged. A file only has a wrap
 * width when its lines run up to one: most breaks fall near the same
 * width, and in a cased script the next line often goes on in lower
 * case, which verse does not. In a file without one, every line break
 * stays, but a long line ends its Paragraph, since such a file writes a
 * Paragraph per line. A
 * line of stars, rules or `#` alone is a Scene Break; Gutenberg's
 * `[Illustration]` notes are dropped, and its `_underscores_` are Italic.
 */
import type { Heading, Paragraph, Run, SceneBreak } from "../extracted-text.js";

/** A block of the file, its Paragraph's lines with their wraps joined. */
export type TextBlock =
	| { readonly kind: "Paragraph"; readonly lines: readonly string[] }
	| { readonly kind: "SceneBreak" };

const sceneBreak =
	/^(?:(?:[*#~•·∗⁂]\s*)+|(?:-\s*){3,}|(?:_\s*){3,}|(?:=\s*){3,}|[—–]{1,3})$/u;
const illustration = /^\[Illustration(?:[:.][^\]]*)?\]$/iu;

/** Lines of a Paragraph without their wraps joined. */
type Lines = readonly string[];

const cleanLine = (line: string) => line.replace(/\s+/gu, " ").trim();

/** An unwrapped file's line that is a Paragraph by itself. */
const paragraphLineLength = 100;

/** How far short of the wrap width a line stops when its break is kept. */
const wellShort = 15;

/** How many of a Paragraph's line breaks tell the wrap width. */
const breaksPerParagraph = 4;

/**
 * The width a hard-wrapped file's lines wrap at, or `Infinity` when its
 * line breaks are not wraps. Each Paragraph tells it by its first few
 * breaks, so a long list such as a table of contents cannot outvote the
 * prose.
 */
function wrapWidth(paragraphs: readonly Lines[]): number {
	const breaks = paragraphs.flatMap((lines) =>
		lines
			.slice(0, breaksPerParagraph)
			.slice(0, -1)
			.map((line, index) => ({
				length: line.length,
				next: lines[index + 1] ?? "",
			})),
	);
	if (breaks.length < 8) return Number.POSITIVE_INFINITY;
	const lengths = breaks.map(({ length }) => length).sort((a, b) => a - b);
	const width = lengths[Math.floor(0.9 * (lengths.length - 1))] ?? 0;
	const full = breaks.filter(
		({ length }) => length >= width - wellShort,
	).length;
	if (width < 40 || full < 0.6 * breaks.length)
		return Number.POSITIVE_INFINITY;
	const cased = breaks.filter(({ next }) =>
		/^\P{L}*[\p{Lu}\p{Ll}]/u.test(next),
	);
	const lower = cased.filter(({ next }) => /^\P{L}*\p{Ll}/u.test(next));
	if (
		cased.length >= 0.3 * breaks.length &&
		lower.length < 0.15 * cased.length
	)
		return Number.POSITIVE_INFINITY;
	return width;
}

/** A Paragraph's lines with each hard wrap joined into its line. */
function unwrap(lines: Lines, width: number): string[] {
	const room = width - wellShort;
	if (lines.slice(0, -1).every((line) => line.length < room))
		return [...lines];
	const kept: string[] = [];
	let previous = 0;
	for (const line of lines) {
		const firstWord = line.split(" ", 1)[0] ?? "";
		const last = kept.length - 1;
		if (last >= 0 && previous + 1 + firstWord.length > room)
			kept[last] = `${kept[last]} ${line}`;
		else kept.push(line);
		previous = line.length;
	}
	return kept;
}

/** An unwrapped file's Paragraph, cut after each long line. */
function byLongLines(lines: readonly string[]): string[][] {
	const paragraphs: string[][] = [[]];
	for (const line of lines) {
		paragraphs.at(-1)?.push(line);
		if (line.length > paragraphLineLength) paragraphs.push([]);
	}
	return paragraphs.filter((paragraph) => paragraph.length > 0);
}

/** The blocks of a file's text, in order. */
export function readBlocks(text: string): TextBlock[] {
	const paragraphs = text
		.split(/\n[^\S\n]*\n/u)
		.map((paragraph) =>
			paragraph
				.split("\n")
				.map(cleanLine)
				.filter((line) => line.length > 0),
		)
		.filter(
			(lines) => lines.length > 0 && !illustration.test(lines.join(" ")),
		);
	const width = wrapWidth(paragraphs);
	return paragraphs.flatMap((lines): TextBlock[] => {
		if (lines.length === 1 && sceneBreak.test(lines[0] ?? ""))
			return [{ kind: "SceneBreak" }];
		const kept = unwrap(lines, width);
		return (
			width === Number.POSITIVE_INFINITY ? byLongLines(kept) : [kept]
		).map((paragraph) => ({ kind: "Paragraph", lines: paragraph }));
	});
}

/** `_italic_` in Gutenberg's plain text, maybe across Line Breaks. */
const underscored =
	/(?<![\p{L}\p{N}_])_(?=[^\s_])([^_]*?[^\s_])_(?![\p{L}\p{N}_])/gu;

/** The runs of one line or more, `\n` marking each Line Break. */
function inlinesOf(text: string): (Run | { readonly kind: "LineBreak" })[] {
	const inlines: (Run | { readonly kind: "LineBreak" })[] = [];
	const push = (part: string, italic: boolean) =>
		part.split("\n").forEach((line, index) => {
			if (index > 0) inlines.push({ kind: "LineBreak" });
			if (line.length > 0)
				inlines.push(
					italic
						? { kind: "Run", text: line, styles: ["Italic"] }
						: { kind: "Run", text: line },
				);
		});
	let from = 0;
	for (const match of text.matchAll(underscored)) {
		push(text.slice(from, match.index), false);
		push(match[1] ?? "", true);
		from = match.index + match[0].length;
	}
	push(text.slice(from), false);
	return inlines;
}

/** A Paragraph of Extracted Text from its kept lines. */
export function paragraphOf(lines: readonly string[]): Paragraph {
	return { kind: "Paragraph", inlines: inlinesOf(lines.join("\n")) };
}

/** The runs of a one-line title. */
export function runsOf(line: string): Run[] {
	return inlinesOf(line).filter(
		(inline): inline is Run => inline.kind === "Run",
	);
}

/** Blocks without a Scene Break at either end or twice in a row. */
export function withoutStrayBreaks<
	Block extends Heading | Paragraph | SceneBreak,
>(blocks: readonly Block[]): Block[] {
	return blocks.filter(
		(block, index) =>
			block.kind !== "SceneBreak" ||
			(index > 0 &&
				index < blocks.length - 1 &&
				blocks[index + 1]?.kind !== "SceneBreak"),
	);
}
