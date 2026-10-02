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
const sentenceFinalLineEnding = /[.!?…]["'”’»«)\]]*\s*$/mu;

/**
 * The blocks a paragraph of source text reads as. A paragraph with any line
 * ending in sentence-final punctuation is prose: its single line breaks are
 * hard wraps, so it is one block. A paragraph with no such line is verse, and
 * each of its lines is a block of its own.
 */
function blocksOf(paragraph: string): readonly string[] {
	const lines = paragraph.split(lineBreak);
	return sentenceFinalLineEnding.test(paragraph) ? [lines.join(" ")] : lines;
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
 * paragraph; each line of verse is a paragraph of its own; a hard-wrapped
 * prose line joins the next. Sentences are trimmed, and a blank Text has
 * no paragraph.
 */
export function splitText(text: string): SplitText {
	return {
		paragraphs: text
			.split(paragraphBreak)
			.flatMap(blocksOf)
			.map(splitBlock)
			.filter((sentences) => sentences.length > 0)
			.map((sentences) => ({ sentences })),
	};
}
