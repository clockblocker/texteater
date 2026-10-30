/**
 * HTML import's second half (`html.ts`): the drafts a pass over the tree
 * leaves become Headings, Paragraphs and Scene Breaks, with whitespace
 * collapsed, lines trimmed and the text NFC.
 */
import type {
	Heading,
	InlineStyle,
	LineBreak,
	Paragraph,
	Run,
	SceneBreak,
} from "./extracted-text.js";

export type Block = Heading | Paragraph | SceneBreak;

export const styleBits: Readonly<Record<InlineStyle, number>> = {
	Italic: 1,
	Bold: 2,
	Quotation: 4,
};

const styleOrder: readonly InlineStyle[] = ["Italic", "Bold", "Quotation"];

const collapsible = /[\t\n\f\r ]/u;
export const blank = /^\s*$/u;

export type Item =
	| {
			readonly kind: "Text";
			readonly text: string;
			readonly mask: number;
			readonly preserved: boolean;
	  }
	| { readonly kind: "Break"; readonly preserved: boolean };

type TextItem = Extract<Item, { kind: "Text" }>;

export type Draft =
	| { readonly kind: "Paragraph"; readonly items: Item[] }
	| {
			readonly kind: "Heading";
			readonly level: Heading["level"];
			readonly items: Item[];
	  }
	| { readonly kind: "Row"; readonly cells: Item[][] };

/**
 * A Paragraph draft's items split where two Line Breaks follow each other
 * with nothing but whitespace between.
 */
function splitAtDoubleBreaks(items: readonly Item[]): Item[][] {
	const paragraphs: Item[][] = [];
	let current: Item[] = [];
	let last: Item | undefined;
	let lastIndex = -1;
	for (const item of items) {
		if (item.kind === "Text" && blank.test(item.text)) {
			current.push(item);
			continue;
		}
		if (
			item.kind === "Break" &&
			!item.preserved &&
			last?.kind === "Break" &&
			!last.preserved
		) {
			paragraphs.push(current.slice(0, lastIndex));
			current = [];
			last = undefined;
			continue;
		}
		current.push(item);
		last = item;
		lastIndex = current.length - 1;
	}
	paragraphs.push(current);
	return paragraphs;
}

/** The items of a draft split at its Line Breaks, `pre` newlines included. */
function linesOf(items: readonly Item[]): TextItem[][] {
	const lines: TextItem[][] = [[]];
	for (const item of items) {
		if (item.kind === "Break") {
			lines.push([]);
			continue;
		}
		if (!item.preserved) {
			lines.at(-1)?.push(item);
			continue;
		}
		item.text
			.replace(/\r\n?/gu, "\n")
			.split("\n")
			.forEach((text, index) => {
				if (index > 0) lines.push([]);
				lines.at(-1)?.push({ ...item, text });
			});
	}
	return lines;
}

type Char = { readonly char: string; mask: number };

/** Collapses whitespace across items and trims the line's ends. */
function charsOf(items: readonly TextItem[]): Char[] {
	const chars: Char[] = [];
	let space = true;
	for (const item of items)
		for (const char of item.text.normalize("NFC")) {
			if (!item.preserved && collapsible.test(char)) {
				if (!space) chars.push({ char: " ", mask: item.mask });
				space = true;
			} else {
				chars.push({ char, mask: item.mask });
				space = /\s/u.test(char);
			}
		}
	let start = 0;
	while (/\s/u.test(chars[start]?.char ?? "x")) start += 1;
	let end = chars.length;
	while (end > start && /\s/u.test(chars[end - 1]?.char ?? "x")) end -= 1;
	return chars.slice(start, end);
}

/** Drops each style from the whitespace at the edges of its stretches. */
function unstyleEdges(chars: readonly Char[]): void {
	for (const bit of Object.values(styleBits)) {
		let index = 0;
		while (index < chars.length) {
			if (((chars[index]?.mask ?? 0) & bit) === 0) {
				index += 1;
				continue;
			}
			let stop = index;
			while (((chars[stop]?.mask ?? 0) & bit) !== 0) stop += 1;
			for (let at = index; at < stop; at += 1) {
				const char = chars[at] as Char;
				if (!/\s/u.test(char.char)) break;
				char.mask &= ~bit;
			}
			for (let at = stop - 1; at >= index; at -= 1) {
				const char = chars[at] as Char;
				if (!/\s/u.test(char.char)) break;
				char.mask &= ~bit;
			}
			index = stop;
		}
	}
}

/** One line's runs in canonical form, or none for a blank line. */
function runsOf(items: readonly TextItem[]): Run[] {
	const chars = charsOf(items);
	unstyleEdges(chars);
	const runs: { text: string; mask: number }[] = [];
	for (const { char, mask } of chars) {
		const last = runs.at(-1);
		if (last?.mask === mask) last.text += char;
		else runs.push({ text: char, mask });
	}
	return runs.map(({ text, mask }) => {
		const styles = styleOrder.filter((style) => mask & styleBits[style]);
		const normalized = text.normalize("NFC");
		return styles.length > 0
			? { kind: "Run", text: normalized, styles }
			: { kind: "Run", text: normalized };
	});
}

const spaceFor = (items: readonly Item[]): TextItem[] =>
	items.map((item) =>
		item.kind === "Text"
			? item
			: { kind: "Text", text: " ", mask: 0, preserved: false },
	);

function paragraphOf(items: readonly Item[]): Paragraph | undefined {
	const inlines: (Run | LineBreak)[] = [];
	for (const line of linesOf(items)) {
		const runs = runsOf(line);
		if (runs.length === 0) continue;
		if (inlines.length > 0) inlines.push({ kind: "LineBreak" });
		inlines.push(...runs);
	}
	return inlines.length > 0 ? { kind: "Paragraph", inlines } : undefined;
}

/** A row of stars or an asterism standing for a Scene Break. */
const sceneBreak = /^(?:⁂|[*✱✻·•~](?:\s*[*✱✻·•~]){2,})$/u;

export function finish(draft: Draft): Block[] {
	if (draft.kind === "Paragraph")
		return splitAtDoubleBreaks(draft.items).flatMap((items): Block[] => {
			const paragraph = paragraphOf(items);
			if (paragraph === undefined) return [];
			return sceneBreak.test(textOf(paragraph))
				? [{ kind: "SceneBreak" }]
				: [paragraph];
		});
	if (draft.kind === "Heading") {
		const runs = runsOf(spaceFor(draft.items));
		return runs.length > 0
			? [{ kind: "Heading", level: draft.level, runs }]
			: [];
	}
	const cells = draft.cells.map(spaceFor);
	if (cells.every((cell) => runsOf(cell).length === 0)) return [];
	const separator: TextItem = {
		kind: "Text",
		text: " | ",
		mask: 0,
		preserved: false,
	};
	const runs = runsOf(
		cells.flatMap((cell, index) =>
			(index > 0 ? [separator] : []).concat(cell),
		),
	);
	return [{ kind: "Paragraph", inlines: runs }];
}

export function textOf(block: Block): string {
	if (block.kind === "SceneBreak") return "";
	return (block.kind === "Heading" ? block.runs : block.inlines)
		.map((inline) => (inline.kind === "Run" ? inline.text : " "))
		.join("");
}
