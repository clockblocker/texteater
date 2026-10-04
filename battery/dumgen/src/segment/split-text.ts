/**
 * Splits a Text into paragraphs and Sentences before `segment.inUnits`
 * sees it. Splitting happens above the segmenters (Dumgen ADR 0007, amended
 * 2026-09-29) and is code only: no judge sees it. The heuristics are
 * German-tuned and copied from tf-demo's intake (`sentenceSplitting.ts`).
 */

/** A Text's non-empty paragraphs, each with its non-empty Sentences in order. */
export type SplitText = {
	readonly paragraphs: readonly { readonly sentences: readonly string[] }[];
};

const sentenceSegmenter = new Intl.Segmenter("de", {
	granularity: "sentence",
});

/**
 * A piece ending in an abbreviation that never closes a sentence (a title,
 * a reference, a sentence-internal connector) or in an ordinal number
 * continues into the next piece. Abbreviations that can close a sentence
 * (`usw.`, `o.Ä.`, `etc.`) are not listed, so `Gemüse usw. Dann …` still
 * splits before the capital.
 */
const sentenceInternalEnding =
	/(?:^|\s)(?:Dr|Prof|Nr|Abb|ca|bzw|vgl|evtl|ggf|inkl|sog|bspw|z\.B|d\.h|u\.a|z\.T|v\.a|i\.A|u\.U|Dipl\.-Ing|\d{1,2})\.$/u;

const paragraphBreak = /\r?\n[^\S\r\n]*(?:\r?\n\s*)+/u;
const lineBreak = /[^\S\r\n]*\r?\n[^\S\r\n]*/u;
const sentenceFinalEnding = /[.!?…]["'“”‘’»«›‹)\]]*$/u;
const titleEnding = /[\p{L}\p{N}]$/u;
const sentenceOpening = /^["'„“‚‘»«›‹([]*\p{Lu}/u;

/**
 * A line ends a Sentence when it ends in sentence-final punctuation, maybe
 * inside closing quotes or brackets, but not in an abbreviation or ordinal
 * that continues into the next line.
 */
function endsSentence(line: string): boolean {
	const trimmed = line.trimEnd();
	return (
		sentenceFinalEnding.test(trimmed) &&
		!sentenceInternalEnding.test(trimmed)
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
	if (!lines.some(endsSentence)) return lines;
	const blocks: string[] = [];
	let block: string[] = [];
	for (const [index, line] of lines.entries()) {
		block.push(line);
		const next = lines[index + 1];
		const closes =
			endsSentence(line) ||
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

function splitBlock(block: string): string[] {
	const sentences: string[] = [];
	let pending = "";
	for (const { segment } of sentenceSegmenter.segment(block)) {
		pending += segment;
		if (sentenceInternalEnding.test(pending.trimEnd())) continue;
		const sentence = pending.trim();
		if (sentence.length > 0) sentences.push(sentence);
		pending = "";
	}
	const rest = pending.trim();
	if (rest.length > 0) sentences.push(rest);
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
