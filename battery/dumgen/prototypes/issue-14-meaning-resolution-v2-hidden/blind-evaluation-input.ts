import type { HiddenMeaningCase, MeaningCandidate } from "./corpus.hidden.ts";

export type BlindMeaningCandidate = Readonly<
	Pick<
		MeaningCandidate,
		| "meaningId"
		| "entryId"
		| "meaningInEmojis"
		| "descriptionBlocks"
		| "examples"
	>
>;

export type BlindMeaningInput = Readonly<{
	caseId: string;
	learnerId: string;
	language: "de" | "en";
	entryId: string;
	citationForm: string;
	context: string;
	normalizedSurface: string;
	candidates: readonly BlindMeaningCandidate[];
}>;

/**
 * The only evaluator-to-runner projection. It strips gold, group labels,
 * order-control metadata, requirement tags, and presentation-hazard labels.
 */
export function toBlindMeaningInput(
	hiddenCase: HiddenMeaningCase,
): BlindMeaningInput {
	return Object.freeze({
		caseId: hiddenCase.id,
		learnerId: hiddenCase.learnerId,
		language: hiddenCase.language,
		entryId: hiddenCase.entryId,
		citationForm: hiddenCase.citationForm,
		context: hiddenCase.context,
		normalizedSurface: hiddenCase.normalizedSurface,
		candidates: Object.freeze(
			hiddenCase.candidates.map((candidate) =>
				Object.freeze({
					meaningId: candidate.meaningId,
					entryId: candidate.entryId,
					meaningInEmojis: candidate.meaningInEmojis,
					descriptionBlocks: Object.freeze([
						...candidate.descriptionBlocks,
					]),
					examples: Object.freeze([...candidate.examples]),
				}),
			),
		),
	});
}
