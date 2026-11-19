/**
 * The language-free skeleton of the dictionary notation Luna writes a
 * Valency Frame in: Slots separated by spaces in frame order, an Optional
 * Slot in `( … )`, the alternatives of one Slot joined by `|`, each
 * complement a head (`A`, `dass`, `irgendwo`) after at most one
 * prefix word (a preposition, a predicative's marker, a correlate), the
 * prefix itself Optional in `( … )` (`(es) dass`). A frame may open with an
 * opener word (German expletive `es`), and an empty frame is one word of
 * its own.
 *
 * What the words mean is a language's word table (`de/valency-notation.ts`;
 * English's and Hebrew's later): which words are
 * prefixes, heads and openers. The skeleton only finds the structure, and
 * prints it back.
 */

/** One complement as written: its head and the prefix before it, if any. */
export type RawComplement = {
	readonly head: string;
	readonly prefix?: string;
	/** The prefix in `( … )`: present or not, the complement is the same Slot's. */
	readonly optionalPrefix?: boolean;
};

type RawSlot = {
	readonly optional: boolean;
	readonly alternatives: readonly RawComplement[];
};

export type RawFrame = {
	readonly opener?: string;
	readonly slots: readonly RawSlot[];
};

/** A language's words, as the skeleton needs to tell them apart. */
export type FrameWords = {
	readonly isPrefix: (word: string) => boolean;
	/** How many words, from `index` on, make one head; 0 when none starts there. */
	readonly headLength: (words: readonly string[], index: number) => number;
	readonly isOpener: (word: string) => boolean;
	/** Whether a prefix stands before this head (German es before a clause, not before D). */
	readonly combines: (prefix: string, head: string) => boolean;
	/** What an empty frame is written as. */
	readonly empty: string;
};

type ParseResult =
	| { readonly ok: true; readonly frame: RawFrame }
	| { readonly ok: false; readonly error: string };

/**
 * A word, with any case or role marker written onto it (`sich(A)`,
 * `ADJ(subj)`), or one of `(`, `)`, `|`.
 */
const tokenPattern = /\(|\)|\||[^\s()|]+(?:\([^\s()|]*\))?/gu;

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

/** Reads a frame's structure: its opener, its Slots, their alternatives. */
export function parseFrame(text: string, words: FrameWords): ParseResult {
	const lexed = tokensOf(text.trim());
	if ("error" in lexed) return { ok: false, error: lexed.error };
	const { tokens } = lexed;
	if (
		tokens.length === 0 ||
		(tokens.length === 1 && tokens[0] === words.empty)
	)
		return { ok: true, frame: { slots: [] } };
	let index = 0;
	const fail = (error: string): ParseResult => ({ ok: false, error });
	const isWord = (token: string | undefined) =>
		token !== undefined && token !== "(" && token !== ")" && token !== "|";
	/** One complement at `index`, or why none stands there. */
	const complement = (): RawComplement | string => {
		let prefix: string | undefined;
		let optionalPrefix = false;
		const [open, inner, close] = tokens.slice(index, index + 3);
		if (
			open === "(" &&
			inner !== undefined &&
			words.isPrefix(inner) &&
			close === ")"
		) {
			prefix = inner;
			optionalPrefix = true;
			index += 3;
		} else if (
			isWord(open) &&
			open !== undefined &&
			words.isPrefix(open) &&
			words.headLength(tokens, index) === 0
		) {
			prefix = open;
			index += 1;
		}
		const length = words.headLength(tokens, index);
		if (length === 0)
			return `Expected a complement at «${tokens.slice(index).join(" ") || "the end"}»`;
		const head = tokens.slice(index, index + length).join(" ");
		index += length;
		return {
			head,
			...(prefix === undefined ? {} : { prefix }),
			...(optionalPrefix ? { optionalPrefix } : {}),
		};
	};
	/** A Slot's alternatives, up to the token that ends them. */
	const alternatives = (): RawComplement[] | string => {
		const found: RawComplement[] = [];
		for (;;) {
			const read = complement();
			if (typeof read === "string") return read;
			found.push(read);
			if (tokens[index] !== "|") return found;
			index += 1;
		}
	};
	let opener: string | undefined;
	const [first] = tokens;
	if (
		first !== undefined &&
		words.isOpener(first) &&
		// An opener that is also a prefix opens only where no head follows it.
		!(
			words.isPrefix(first) &&
			words.headLength(tokens, 1) > 0 &&
			words.combines(
				first,
				tokens.slice(1, 1 + words.headLength(tokens, 1)).join(" "),
			)
		)
	) {
		opener = first;
		index = 1;
	}
	const slots: RawSlot[] = [];
	while (index < tokens.length) {
		const [open, inner, close] = tokens.slice(index, index + 3);
		const prefixGroup =
			open === "(" &&
			inner !== undefined &&
			words.isPrefix(inner) &&
			close === ")";
		if (open === "(" && !prefixGroup) {
			index += 1;
			const read = alternatives();
			if (typeof read === "string") return fail(read);
			if (tokens[index] !== ")")
				return fail(
					`Expected «)» at «${tokens.slice(index).join(" ") || "the end"}»`,
				);
			index += 1;
			slots.push({ optional: true, alternatives: read });
			continue;
		}
		const read = alternatives();
		if (typeof read === "string") return fail(read);
		slots.push({ optional: false, alternatives: read });
	}
	return {
		ok: true,
		frame: { ...(opener === undefined ? {} : { opener }), slots },
	};
}

const printedComplement = ({ head, prefix, optionalPrefix }: RawComplement) =>
	prefix === undefined
		? head
		: `${optionalPrefix ? `(${prefix})` : prefix} ${head}`;

/** A frame's structure as text. */
export function printFrame(
	frame: RawFrame,
	words: Pick<FrameWords, "empty">,
): string {
	const slots = frame.slots.map(({ optional, alternatives }) => {
		const joined = alternatives.map(printedComplement).join("|");
		return optional ? `(${joined})` : joined;
	});
	const parts = [
		...(frame.opener === undefined ? [] : [frame.opener]),
		...slots,
	];
	return parts.length === 0 ? words.empty : parts.join(" ");
}
