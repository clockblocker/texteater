/**
 * The language-free skeleton of the dictionary notation Luna writes one
 * concrete Valency Pattern in: complements separated by single spaces, each
 * complement a head (`A`, `dass`, `irgendwo`) after at most one prefix word
 * (a preposition or a predicative's marker). A pattern may open with an
 * opener word (German expletive `es`), and an empty pattern is one word of
 * its own (`-`). A pattern reads only in the spelling `printPattern` gives
 * it: one space between complements and after a prefix.
 *
 * What the words mean is a language's word table (`de/valency-notation.ts`;
 * English's and Hebrew's later): which words are prefixes, heads and openers.
 * The skeleton only finds the structure, and prints it back.
 */

/** One complement as written: its head and the prefix before it, if any. */
export type RawComplement = {
	readonly head: string;
	readonly prefix?: string;
};

export type RawPattern = {
	readonly opener?: string;
	readonly complements: readonly RawComplement[];
};

/** A language's words, as the skeleton needs to tell them apart. */
export type PatternWords = {
	readonly isPrefix: (word: string) => boolean;
	/** How many words, from `index` on, make one head; 0 when none starts there. */
	readonly headLength: (words: readonly string[], index: number) => number;
	readonly isOpener: (word: string) => boolean;
	/** What an empty pattern is written as. */
	readonly empty: string;
};

type ParseResult =
	| { readonly ok: true; readonly pattern: RawPattern }
	| { readonly ok: false; readonly error: string };

/** A word, with any case marker written onto it (`sich(A)`). */
const tokenPattern = /[^\s()|]+(?:\([^\s()|]*\))?/gu;

/** The tokens of `text`, or the stray text between them. */
function tokensOf(
	text: string,
): { readonly tokens: string[] } | { readonly error: string } {
	const tokens: string[] = [];
	let at = 0;
	for (const match of text.matchAll(tokenPattern)) {
		const between = text.slice(at, match.index);
		if (between.trim() !== "")
			return { error: `Unreadable text «${between.trim()}»` };
		tokens.push(match[0]);
		at = match.index + match[0].length;
	}
	if (text.slice(at).trim() !== "")
		return { error: `Unreadable text «${text.slice(at).trim()}»` };
	return { tokens };
}

/**
 * Reads a concrete pattern's structure — its opener and its complements —
 * from text in the spelling `printPattern` gives it.
 */
export function parsePattern(text: string, words: PatternWords): ParseResult {
	const read = structureOf(text, words);
	if (!read.ok) return read;
	return printPattern(read.pattern, words) === text
		? read
		: {
				ok: false,
				error: `«${text}» is not spelled as the notation writes it`,
			};
}

function structureOf(text: string, words: PatternWords): ParseResult {
	const lexed = tokensOf(text);
	if ("error" in lexed) return { ok: false, error: lexed.error };
	const { tokens } = lexed;
	if (tokens.length === 1 && tokens[0] === words.empty)
		return { ok: true, pattern: { complements: [] } };
	let index = 0;
	const fail = (error: string): ParseResult => ({ ok: false, error });
	let opener: string | undefined;
	const [first] = tokens;
	if (first !== undefined && words.isOpener(first)) {
		opener = first;
		index = 1;
		if (index === tokens.length)
			return fail(`«${first}» opens no complement`);
	}
	const complements: RawComplement[] = [];
	while (index < tokens.length) {
		let prefix: string | undefined;
		const token = tokens[index];
		if (
			token !== undefined &&
			words.isPrefix(token) &&
			words.headLength(tokens, index) === 0
		) {
			prefix = token;
			index += 1;
		}
		const length = words.headLength(tokens, index);
		if (length === 0)
			return fail(
				`Expected a complement at «${tokens.slice(index).join(" ") || "the end"}»`,
			);
		const head = tokens.slice(index, index + length).join(" ");
		index += length;
		complements.push({
			head,
			...(prefix === undefined ? {} : { prefix }),
		});
	}
	return {
		ok: true,
		pattern: { ...(opener === undefined ? {} : { opener }), complements },
	};
}

const printedComplement = ({ head, prefix }: RawComplement) =>
	prefix === undefined ? head : `${prefix} ${head}`;

/** A pattern's structure as text. */
export function printPattern(
	pattern: RawPattern,
	words: Pick<PatternWords, "empty">,
): string {
	const parts = [
		...(pattern.opener === undefined ? [] : [pattern.opener]),
		...pattern.complements.map(printedComplement),
	];
	return parts.length === 0 ? words.empty : parts.join(" ");
}
