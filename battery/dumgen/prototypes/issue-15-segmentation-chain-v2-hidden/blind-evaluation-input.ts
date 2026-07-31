import type { HiddenSegmentationCase } from "./corpus.hidden.ts";

export type BlindSegmentationInput = Readonly<{
	caseId: string;
	source: string;
}>;

/**
 * The only evaluator-to-runner projection. Gold, strata, and requirement tags
 * do not cross this boundary.
 */
export function toBlindSegmentationInput(
	hiddenCase: HiddenSegmentationCase,
): BlindSegmentationInput {
	return Object.freeze({
		caseId: hiddenCase.id,
		source: hiddenCase.source,
	});
}
