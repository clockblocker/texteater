/**
 * Markdown import's inline half (`markdown.ts`): one Paragraph's or
 * Heading's source lines become its runs and Line Breaks, by CommonMark's
 * emphasis rules narrowed to what Extracted Text holds.
 */
import type { InlineStyle, LineBreak, Run } from "./extracted-text.js";
import {
	runSources,
	sliced,
	type Traced,
	traceRun,
	trimmedEnd,
	written,
} from "./traced.js";

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
	/** The run's source offsets. */
	readonly at: readonly number[];
};

type Tag = {
	readonly type: "tag";
	readonly style: InlineStyle;
	readonly closing: boolean;
	readonly source: Traced;
	matched: boolean;
};

type Token =
	| { readonly type: "text"; text: string; at: number[] }
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
function delimiter(
	run: string,
	before: string,
	after: string,
	at: readonly number[],
): Delimiter {
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
		at,
	};
}

/** What one inline reader took: its tokens and how many characters. */
type Taken = { readonly tokens: readonly Token[]; readonly length: number };

/**
 * One reader per inline construct, in precedence order. Each reads the
 * construct opening `line` at `index`, or returns undefined.
 */
const inlineReaders: readonly ((
	traced: Traced,
	index: number,
) => Taken | undefined)[] = [
	(traced, index) => {
		const text = plain.exec(traced.text.slice(index))?.[0];
		return text === undefined
			? undefined
			: {
					tokens: [
						textToken(sliced(traced, index, index + text.length)),
					],
					length: text.length,
				};
	},
	({ text: line, at }, index) => {
		const next = line[index + 1] ?? "";
		return line[index] === "\\" && asciiPunctuation.test(next)
			? {
					tokens: [
						{ type: "text", text: next, at: [at[index + 1] ?? -1] },
					],
					length: 2,
				}
			: undefined;
	},
	(traced, index) => {
		const line = traced.text;
		const open = /^`+/u.exec(line.slice(index))?.[0];
		if (open === undefined) return undefined;
		const close = backtickRun(line, index + open.length, open.length);
		if (close === -1)
			return {
				tokens: [textToken(sliced(traced, index, index + open.length))],
				length: open.length,
			};
		const code = sliced(traced, index + open.length, close);
		const stripped =
			code.text.length > 2 &&
			code.text.startsWith(" ") &&
			code.text.endsWith(" ");
		return {
			tokens: [
				textToken(
					stripped ? sliced(code, 1, code.text.length - 1) : code,
				),
			],
			length: close + open.length - index,
		};
	},
	({ text: line }, index) => {
		const rest = line.slice(index);
		const skipped =
			image.exec(rest)?.[0] ?? footnoteReference.exec(rest)?.[0];
		return skipped === undefined
			? undefined
			: { tokens: [], length: skipped.length };
	},
	(traced, index) => {
		const linked = link.exec(traced.text.slice(index));
		const label = linked?.[1] ?? "";
		return linked === null
			? undefined
			: {
					tokens: tokenizeLine(
						sliced(traced, index + 1, index + 1 + label.length),
					),
					length: linked[0].length,
				};
	},
	(traced, index) => {
		const tag = styleTag.exec(traced.text.slice(index));
		const style = tagStyles[tag?.[2]?.toLowerCase() ?? ""];
		if (tag === null || style === undefined) return undefined;
		const token: Tag = {
			type: "tag",
			style,
			closing: tag[1] === "/",
			source: sliced(traced, index, index + tag[0].length),
			matched: false,
		};
		return { tokens: [token], length: tag[0].length };
	},
	({ text: line }, index) => {
		const lineBreak = breakTag.exec(line.slice(index))?.[0];
		return lineBreak === undefined
			? undefined
			: { tokens: [{ type: "break" }], length: lineBreak.length };
	},
	({ text: line, at }, index) => {
		const run = delimiterRun.exec(line.slice(index))?.[0];
		if (run === undefined) return undefined;
		const before = line[index - 1] ?? " ";
		const after = line[index + run.length] ?? " ";
		const source = at.slice(index, index + run.length);
		return {
			tokens: [delimiter(run, before, after, source)],
			length: run.length,
		};
	},
];

const textToken = ({ text, at }: Traced): Token => ({
	type: "text",
	text,
	at: [...at],
});

/**
 * One line's inline tokens, neighbouring text merged. A line the reader
 * wrote itself, as export's round trip does, stands nowhere in a source.
 */
export function tokenizeLine(line: Traced | string): Token[] {
	const traced = typeof line === "string" ? written(line) : line;
	const tokens: Token[] = [];
	let index = 0;
	while (index < traced.text.length) {
		let taken: Taken | undefined;
		for (const read of inlineReaders) {
			taken = read(traced, index);
			if (taken !== undefined) break;
		}
		taken ??= {
			tokens: [textToken(sliced(traced, index, index + 1))],
			length: 1,
		};
		for (const token of taken.tokens) {
			const last = tokens.at(-1);
			if (token.type === "text" && last?.type === "text") {
				last.text += token.text;
				last.at.push(...token.at);
			} else
				tokens.push(
					token.type === "text"
						? { ...token, at: [...token.at] }
						: token,
				);
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
			merged[merged.length - 1] = traceRun(
				{ ...last, text: last.text + next.text },
				joinedSources(last, next),
			);
		else merged.push(next);
	}
	let start = 0;
	while ((merged[start]?.text.trimStart() ?? "x") === "") start += 1;
	let end = merged.length;
	while ((merged[end - 1]?.text.trimEnd() ?? "x") === "") end -= 1;
	return merged.slice(start, end).flatMap((current, index, kept) => {
		const at = runSources.get(current);
		let from = 0;
		let to = current.text.length;
		if (index === 0) from = to - current.text.trimStart().length;
		if (index === kept.length - 1) to = current.text.trimEnd().length;
		const text = current.text.slice(from, Math.max(from, to));
		return text.length > 0
			? [traceRun({ ...current, text }, at?.slice(from, to))]
			: [];
	});
}

function joinedSources(left: Run, right: Run): readonly number[] | undefined {
	const leftAt = runSources.get(left);
	const rightAt = runSources.get(right);
	return leftAt && rightAt ? [...leftAt, ...rightAt] : undefined;
}

/** The inlines a Paragraph's matched tokens stand for. */
export function inlinesOf(tokens: readonly Token[]): Inline[] {
	matchEmphasis(tokens);
	matchTags(tokens);
	const depth = new Map<InlineStyle, number>();
	const shift = (style: InlineStyle, by: number) =>
		depth.set(style, (depth.get(style) ?? 0) + by);
	const inlines: Inline[] = [];
	const emit = ({ text, at }: Traced) => {
		if (text.length === 0) return;
		inlines.push(
			traceRun(
				run(
					text,
					styleOrder.filter((style) => (depth.get(style) ?? 0) > 0),
				),
				at,
			),
		);
	};
	for (const token of tokens) {
		if (token.type === "text") emit(token);
		else if (token.type === "break") inlines.push({ kind: "LineBreak" });
		else if (token.type === "tag") {
			if (token.matched) shift(token.style, token.closing ? -1 : 1);
			else emit(token.source);
		} else {
			for (const style of token.closes) shift(style, -1);
			emit(leftover(token));
			for (const style of token.opens) shift(style, 1);
		}
	}
	return canonical(inlines);
}

/**
 * The characters a delimiter run leaves as text: CommonMark takes an
 * opener's from its inner end and a closer's from its start.
 */
function leftover({ char, count, closes, at }: Delimiter): Traced {
	const text = char.repeat(count);
	return {
		text,
		at:
			closes.length > 0
				? at.slice(at.length - count)
				: at.slice(0, count),
	};
}

const space = (): Token => ({ type: "text", text: " ", at: [-1] });

/**
 * A Paragraph's inlines from its source lines. A line ending in two spaces
 * or an unescaped `\` breaks the line; any other line break is a space.
 */
export function paragraphInlines(lines: readonly Traced[]): Inline[] {
	const tokens: Token[] = [];
	for (const [index, traced] of lines.entries()) {
		const source = traced.text;
		const last = index === lines.length - 1;
		const backslashes = /\\+$/u.exec(source)?.[0].length ?? 0;
		const breaks =
			!last && (/ {2}$/u.test(source) || backslashes % 2 === 1);
		const line =
			breaks && backslashes % 2 === 1
				? sliced(traced, 0, source.length - 1)
				: traced;
		tokens.push(...tokenizeLine(trimmedEnd(line)));
		if (!last) tokens.push(breaks ? { type: "break" } : space());
	}
	return inlinesOf(tokens);
}

export function headingRuns(source: Traced): Run[] {
	return inlinesOf(
		tokenizeLine(source).map((token) =>
			token.type === "break" ? space() : token,
		),
	).filter((inline): inline is Run => inline.kind === "Run");
}
