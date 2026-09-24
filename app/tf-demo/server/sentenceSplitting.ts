import type { Brand } from "common-utils";

/** Caller-delimited sentence text, before Dumgen segmentation and persistence. */
export type SourceSentence = Brand<string, "SourceSentence">;

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

/**
 * Split a Text into ordered, non-empty paragraphs of Source Sentences.
 *
 * Sentence-boundary heuristics belong behind this interface so callers do not
 * change when the implementation becomes more capable.
 */
export function splitInParagraphs(
	text: string,
): readonly (readonly SourceSentence[])[] {
	const paragraphs = text
		.split(paragraphBreak)
		.flatMap(blocksOf)
		.map(splitBlock)
		.filter((sentences) => sentences.length > 0)
		.map((sentences) => Object.freeze(sentences as SourceSentence[]));
	return Object.freeze(paragraphs);
}

/** Split a Text into ordered, non-empty Source Sentences. */
export function splitInSentences(text: string): readonly SourceSentence[] {
	return Object.freeze(splitInParagraphs(text).flat());
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
