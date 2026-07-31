import type { HiddenClickCase, Segment } from "./corpus.hidden.ts";

export type IndexedSegment = Readonly<Segment & { index: number }>;

export type BlindClickInferenceInput = Readonly<{
	caseId: string;
	segmentedSentenceId: string;
	language: "de" | "en";
	clickedSegmentIndex: number;
	segments: readonly IndexedSegment[];
}>;

/**
 * The sole evaluator-to-inference projection. It exposes the immutable
 * sentence and click, but no stratum, gold membership, normalization, Entry
 * reference, forbidden form, or authority evidence.
 */
export function toBlindClickInferenceInput(
	hiddenCase: HiddenClickCase,
): BlindClickInferenceInput {
	return Object.freeze({
		caseId: hiddenCase.id,
		segmentedSentenceId: hiddenCase.sentence.id,
		language: hiddenCase.sentence.language,
		clickedSegmentIndex: hiddenCase.clickedSegmentIndex,
		segments: Object.freeze(
			hiddenCase.sentence.segments.map((segment, index) =>
				Object.freeze({ ...segment, index }),
			),
		),
	});
}
