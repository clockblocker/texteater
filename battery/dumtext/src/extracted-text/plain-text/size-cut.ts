/**
 * The size cut for a `.txt` book without chapters (#1190): numbered
 * Scrolls of about 20,000 characters (some 3,000 German words, a sitting
 * of a quarter of an hour), cut only between Paragraphs, at the first
 * boundary at or after the target. As in the Librarian, a cut never splits
 * a dialogue run (a quotation left open, a short speech intro and its
 * speech, or Paragraphs of speech in a row) or a block of verse, unless
 * the next Paragraph would take the Scroll past 30,000 characters. When
 * the book has Scene Breaks, a cut waits for the next one if it comes
 * before that ceiling, and the break itself goes. A last Scroll under 5,000 characters joins
 * the one before. Scrolls get no Heading: their number is their order.
 */
import type { Paragraph, SceneBreak, Scroll } from "../extracted-text.js";
import { withoutStrayBreaks } from "./blocks.js";

/** Where the size cut cuts, in characters. */
export type SizeCut = {
	readonly target: number;
	readonly ceiling: number;
	readonly smallestLast: number;
};

const defaultSizeCut: SizeCut = {
	target: 20_000,
	ceiling: 30_000,
	smallestLast: 5_000,
};

type Block = Paragraph | SceneBreak;

const textOf = (paragraph: Paragraph) =>
	paragraph.inlines
		.map((inline) => (inline.kind === "Run" ? inline.text : "\n"))
		.join("");

const closers: Readonly<Record<string, string>> = {
	"„": "“”",
	"“": "”",
	"»": "«",
	"«": "»",
	"‚": "‘’",
	"‘": "’",
	"›": "‹",
	"‹": "›",
};

/**
 * Whether a Paragraph ends inside a quotation: its first quotation mark
 * decides the pair, and a straight `"` opens and closes in turn.
 */
function endsInQuotation(text: string): boolean {
	const opener = /[„“»«‚‘›‹"]/u.exec(text)?.[0];
	if (opener === undefined) return false;
	if (opener === '"') return (text.split('"').length - 1) % 2 === 1;
	const close = closers[opener] ?? "";
	let depth = 0;
	for (const char of text)
		if (close.includes(char) && depth > 0) depth--;
		else if (char === opener) depth++;
	return depth > 0;
}

const isSpeech = (text: string) => /^["„“”»«‚‘›‹]|^[—–-]\s/u.test(text);
const isSpeechIntro = (text: string) =>
	text.length <= 200 && /:["'”’»«]?$/u.test(text);
const isVerse = (paragraph: Paragraph) =>
	paragraph.inlines.some((inline) => inline.kind === "LineBreak");

/** Whether two neighbouring Paragraphs belong together. */
function bound(before: Paragraph, after: Paragraph): boolean {
	const text = textOf(before);
	return (
		endsInQuotation(text) ||
		isSpeechIntro(text) ||
		(isSpeech(text) && isSpeech(textOf(after))) ||
		(isVerse(before) && isVerse(after))
	);
}

const sizeOf = (block: Block) =>
	block.kind === "Paragraph" ? textOf(block).length : 0;

/**
 * The characters after each block up to the next Scene Break, or
 * Infinity when none follows.
 */
function untilBreaks(blocks: readonly Block[]): number[] {
	const until: number[] = [];
	let distance = Number.POSITIVE_INFINITY;
	for (let index = blocks.length - 1; index >= 0; index--) {
		const block = blocks[index];
		if (block?.kind === "SceneBreak") distance = 0;
		until[index] = distance;
		distance += block === undefined ? 0 : sizeOf(block);
	}
	return until;
}

/** A book without chapters cut by size into Scrolls, at least one. */
export function cutBySize(
	blocks: readonly Block[],
	sizes: SizeCut = defaultSizeCut,
): Scroll[] {
	const until = untilBreaks(blocks);
	const parts: { blocks: Block[]; size: number; atBreak: boolean }[] = [];
	let current: Block[] = [];
	let size = 0;
	const cut = (atBreak: boolean) => {
		parts.push({ blocks: current, size, atBreak });
		current = [];
		size = 0;
	};
	for (const [index, block] of blocks.entries()) {
		if (block.kind === "SceneBreak") {
			if (size >= sizes.target) cut(true);
			else current.push(block);
			continue;
		}
		current.push(block);
		size += sizeOf(block);
		const next = blocks[index + 1];
		if (
			size < sizes.target ||
			next === undefined ||
			next.kind === "SceneBreak"
		)
			continue;
		const full = size + sizeOf(next) > sizes.ceiling;
		const waits = size + (until[index] ?? 0) <= sizes.ceiling;
		if (full || (!waits && !bound(block, next))) cut(false);
	}
	if (current.length > 0 || parts.length === 0) cut(false);
	const last = parts.at(-1);
	const previous = parts.at(-2);
	if (
		last !== undefined &&
		previous !== undefined &&
		last.size < sizes.smallestLast
	) {
		parts.pop();
		previous.blocks.push(
			...(previous.atBreak ? [{ kind: "SceneBreak" } as const] : []),
			...last.blocks,
		);
	}
	return parts.map((part) => ({
		kind: "Scroll",
		blocks: withoutStrayBreaks(part.blocks),
	}));
}
