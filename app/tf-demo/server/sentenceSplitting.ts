import type { Brand } from "common-utils";

/** Caller-delimited sentence text, before Dumgen segmentation and persistence. */
export type SourceSentence = Brand<string, "SourceSentence">;

const sentenceSegmenter = new Intl.Segmenter("de", {
	granularity: "sentence",
});

/**
 * Split a Text into ordered, non-empty Source Sentences.
 *
 * Sentence-boundary heuristics belong behind this interface so callers do not
 * change when the implementation becomes more capable.
 */
export function splitInSentences(text: string): readonly SourceSentence[] {
	if (text.trim().length === 0) return Object.freeze([]);

	return Object.freeze(
		[...sentenceSegmenter.segment(text)].flatMap(({ segment }) => {
			const sentence = segment.trim();
			return sentence.length > 0 ? [sentence as SourceSentence] : [];
		}),
	);
}
