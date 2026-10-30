/**
 * Markdown import's inline half (`markdown.ts`): one Paragraph's or
 * Heading's source lines become its runs and Line Breaks, by CommonMark's
 * emphasis rules narrowed to what Extracted Text holds.
 */
import type { InlineStyle, LineBreak, Run } from "./extracted-text.js";

export type Inline = Run | LineBreak;

export const styleOrder: readonly InlineStyle[] = [
	"Italic",
	"Bold",
	"Quotation",
];

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
export const whitespace = /^\s$/u;

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
export function tokenizeLine(line: string): Token[] {
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

export function run(text: string, styles: readonly InlineStyle[]): Run {
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
export function canonical(inlines: readonly Inline[]): Inline[] {
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

export function trimLine(runs: readonly Run[]): Run[] {
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
export function inlinesOf(tokens: readonly Token[]): Inline[] {
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
export function paragraphInlines(lines: readonly string[]): Inline[] {
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

export function headingRuns(source: string): Run[] {
	return inlinesOf(
		tokenizeLine(source).map((token) =>
			token.type === "break" ? { type: "text", text: " " } : token,
		),
	).filter((inline): inline is Run => inline.kind === "Run");
}
