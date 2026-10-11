/**
 * Splits a Text into paragraphs and Sentences before any judge or
 * segmenter sees it. Splitting happens above the segmenters (Dumgen ADR
 * 0007) and is code only. It runs before a Sentence's Language is judged
 * (Dumgen ADR 0001, #1177), so it is language-neutral: one set of rules for
 * German, English and Hebrew, with one shared abbreviation list, and no
 * re-split once Languages are known (#1187).
 */

/** A Text's non-empty paragraphs, each with its non-empty Sentences in order. */
export type SplitText = {
	readonly paragraphs: readonly { readonly sentences: readonly string[] }[];
};

/** ICU's sentence rules are the same for every locale (no suppressions). */
const sentenceSegmenter = new Intl.Segmenter("und", {
	granularity: "sentence",
});

/**
 * A piece ending in an abbreviation that never closes a sentence (a title,
 * a reference, a sentence-internal connector) or in a single Latin letter
 * (an initial, French `M.`, German `z. B.`) continues into the next piece.
 * The list is shared by every language; Hebrew marks its abbreviations with
 * gershayim, not periods, so it needs none. Abbreviations that can close a
 * sentence (`usw.`, `o.Ä.`, `etc.`) are not listed, so `Gemüse usw. Dann …`
 * still splits before the capital.
 */
const sentenceInternalEnding =
	/(?:^|[\s"„“‚‘»«›‹([])(?:\p{Script=Latin}|Dr|Prof|Nr|Abb|ca|bzw|vgl|evtl|ggf|inkl|sog|bspw|z\.\s?B|d\.\s?h|u\.\s?a|z\.\s?T|v\.\s?a|i\.\s?A|u\.\s?U|Dipl\.-Ing|Mr|Mrs|Ms|Messrs|St|Mt|Gov|Capt|Col|Lt|Sgt|Rev|Hon|vs|cf|viz|e\.\s?g|i\.\s?e|approx|Mme|Mlle|Mgr|MM)\.$/u;

/**
 * A short abbreviation before a number (`Jan. 3`, `Nr. 5`, `Vol. 2`,
 * `S. 45`) continues into it: prose rarely opens a Sentence with digits.
 */
const abbreviationEnding = /(?:^|\s)\p{L}{1,4}\.$/u;
const numberOpening = /^\d/u;

/** A German ordinal (`am 3. Mai`, `der 1. Sieger`) continues into its noun. */
const ordinalEnding = /(?:^|\s)\d{1,2}\.$/u;

/**
 * Words that open a Sentence but never follow an ordinal: after one of them
 * the number closed its Sentence (`… on Jan. 3. They talked`, `… bis 10.
 * Dann …`).
 */
const sentenceOpeningWords = new Set([
	...["Der", "Die", "Das", "Den", "Dem", "Des", "Ein", "Eine", "Einen"],
	...["Er", "Sie", "Es", "Wir", "Ich", "Du", "Ihr", "Man"],
	...["Dann", "Danach", "Doch", "Aber", "Und", "Oder", "Denn", "Da"],
	...["Dort", "Hier", "Jetzt", "Nun", "So", "Wenn", "Als", "Dies"],
	...["The", "A", "An", "He", "She", "It", "We", "I", "You", "They"],
	...["Then", "But", "And", "Or", "This", "That", "There", "Here"],
	...["His", "Her", "Its", "Our", "Their", "My", "Your", "What", "When"],
	...["Il", "Elle", "Ils", "Elles", "Le", "La", "Les", "Un", "Une"],
	...["Je", "Nous", "Vous", "On", "Puis", "Mais", "Et"],
]);

const firstWordOf = (text: string) =>
	/^["'„“‚‘»«›‹([]*([\p{L}\p{N}]+)/u.exec(text.trimStart())?.[1];

/**
 * Whether a piece of text (a line, or one of ICU's sentence pieces) runs on
 * into the next instead of closing its Sentence. With no next piece known,
 * an ordinal still runs on.
 */
function continuesInto(piece: string, next: string | undefined): boolean {
	const trimmed = piece.trimEnd();
	if (sentenceInternalEnding.test(trimmed)) return true;
	if (next === undefined) return ordinalEnding.test(trimmed);
	if (
		abbreviationEnding.test(trimmed) &&
		numberOpening.test(next.trimStart())
	)
		return true;
	if (!ordinalEnding.test(trimmed)) return false;
	const word = firstWordOf(next);
	return word === undefined || !sentenceOpeningWords.has(word);
}

const paragraphBreak = /\r?\n[^\S\r\n]*(?:\r?\n\s*)+/u;
const lineBreak = /[^\S\r\n]*\r?\n[^\S\r\n]*/u;
const sentenceFinalEnding = /[.!?…]["'“”‘’»«›‹)\]]*$/u;
const titleEnding = /[\p{L}\p{N}]$/u;
/** A capital, or a letter of a script without case such as Hebrew. */
const sentenceOpening = /^["'„“‚‘»«›‹([]*[\p{Lu}\p{Lo}]/u;

/**
 * A line ends a Sentence when it ends in sentence-final punctuation, maybe
 * inside closing quotes or brackets, but not in an abbreviation or ordinal
 * that continues into the next line.
 */
function endsSentence(line: string, next: string | undefined): boolean {
	return (
		sentenceFinalEnding.test(line.trimEnd()) && !continuesInto(line, next)
	);
}

/**
 * A paragraph's unpunctuated opening line is a title when the next line
 * opens a Sentence and that line's first word would have fit on it within
 * the Text's widest line: a wrap would have taken the word, so the author
 * broke the line. The fit test keeps a wrap before a capitalized noun
 * joined.
 */
function isTitle(line: string, next: string, width: number): boolean {
	const title = line.trim();
	const opening = next.trim();
	const firstWord = opening.split(/\s/u, 1)[0] ?? "";
	return (
		titleEnding.test(title) &&
		sentenceOpening.test(opening) &&
		title.length + 1 + firstWord.length <= width
	);
}

/**
 * The blocks a paragraph of source text reads as. A paragraph with no line
 * ending a Sentence is verse, and each of its lines is a block of its own.
 * Otherwise it is prose: a line ending a Sentence closes its block, as does
 * a title line opening one, and any other line break is a hard wrap that
 * joins the next line with a space.
 */
function blocksOf(paragraph: string, width: number): readonly string[] {
	const lines = paragraph
		.split(lineBreak)
		.filter((line) => line.trim().length > 0);
	if (!lines.some((line, index) => endsSentence(line, lines[index + 1])))
		return lines;
	const blocks: string[] = [];
	let block: string[] = [];
	for (const [index, line] of lines.entries()) {
		block.push(line);
		const next = lines[index + 1];
		const closes =
			endsSentence(line, next) ||
			(block.length === 1 &&
				next !== undefined &&
				isTitle(line, next, width));
		if (!closes) continue;
		blocks.push(block.join(" "));
		block = [];
	}
	if (block.length > 0) blocks.push(block.join(" "));
	return blocks;
}

/**
 * A closing quote ICU left at the head of the next piece, set off by a
 * space as French sets `»` off (`« Bonjour ! » dit-il.`). A German opening
 * `»` touches its first word, so it never matches.
 */
const strandedClosingQuote = /^[»›”’"](?:\s|$)/u;

/** A piece opening in lower case continues the Sentence before it. */
const lowercaseOpening = /^["'„“‚‘»«›‹([]*\p{Ll}/u;

/**
 * ICU's sentence pieces of a block, rejoined where they run on: after an
 * abbreviation or ordinal, and before a lower-case continuation such as a
 * dialogue tag (`"Go!" he said.`). A stranded closing quote goes back to
 * the piece it closes.
 */
function splitBlock(block: string): string[] {
	const pieces = Array.from(
		sentenceSegmenter.segment(block),
		({ segment }) => segment,
	);
	for (let index = 1; index < pieces.length; index++) {
		const piece = pieces[index] ?? "";
		if (!strandedClosingQuote.test(piece)) continue;
		pieces[index - 1] =
			`${(pieces[index - 1] ?? "").trimEnd()} ${piece[0]} `;
		pieces[index] = piece.slice(1).trimStart();
	}
	const sentences: string[] = [];
	let pending = "";
	for (const [index, piece] of pieces.entries()) {
		pending += piece;
		const next = pieces[index + 1];
		if (
			next !== undefined &&
			(continuesInto(pending, next) || lowercaseOpening.test(next))
		)
			continue;
		const sentence = pending.trim();
		if (sentence.length > 0) sentences.push(sentence);
		pending = "";
	}
	return sentences;
}

/**
 * Splits a Text into its paragraphs and Sentences. A blank line ends a
 * paragraph, and so does a single line break after a line ending a
 * Sentence; a title line is a paragraph of its own; each line of verse is
 * a paragraph of its own; a prose line hard-wrapped mid-Sentence joins the
 * next. Sentences are trimmed, and a blank Text has no paragraph.
 */
export function splitText(text: string): SplitText {
	const width = text
		.split(/\r?\n/u)
		.reduce((widest, line) => Math.max(widest, line.trim().length), 0);
	return {
		paragraphs: text
			.split(paragraphBreak)
			.flatMap((paragraph) => blocksOf(paragraph, width))
			.map(splitBlock)
			.filter((sentences) => sentences.length > 0)
			.map((sentences) => ({ sentences })),
	};
}
