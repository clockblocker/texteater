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

/**
 * Split a Text into ordered, non-empty Source Sentences.
 *
 * Sentence-boundary heuristics belong behind this interface so callers do not
 * change when the implementation becomes more capable.
 */
export function splitInSentences(text: string): readonly SourceSentence[] {
	if (text.trim().length === 0) return Object.freeze([]);

	const sentences: string[] = [];
	let pending = "";
	for (const { segment } of sentenceSegmenter.segment(text)) {
		pending += segment;
		if (sentenceInternalEnding.test(pending.trimEnd())) continue;
		const sentence = pending.trim();
		if (sentence.length > 0) sentences.push(sentence);
		pending = "";
	}
	const rest = pending.trim();
	if (rest.length > 0) sentences.push(rest);
	return Object.freeze(sentences as SourceSentence[]);
}
