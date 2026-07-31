// Evaluator-side fixtures. Prompt construction must not import this module.

import { HIDDEN_MEANING_CASES, type MeaningDraft } from "./corpus.hidden.ts";

export type MeaningScoringOutput =
	| Readonly<{
			decision: "ReuseExisting";
			existingMeaningId: string;
			draft: null;
	  }>
	| Readonly<{
			decision: "DraftNew";
			existingMeaningId: null;
			draft: MeaningDraft;
	  }>;

export const EXPECTED_GROUP_COUNTS = Object.freeze({
	"broad-reuse": 5,
	"false-merge-trap": 5,
	"multi-candidate-order-control": 6,
	"zero-inventory": 2,
});

export const EXPECTED_INVENTORY_COUNTS = Object.freeze({
	zero: 2,
	one: 10,
	multi: 6,
});

export const PERFECT_SCORING_FIXTURES = Object.freeze(
	HIDDEN_MEANING_CASES.map((hiddenCase) =>
		Object.freeze({
			caseId: hiddenCase.id,
			expected:
				hiddenCase.gold.decision === "ReuseExisting"
					? Object.freeze({
							decision: "ReuseExisting" as const,
							existingMeaningId: hiddenCase.gold.meaningId,
							draft: null,
						})
					: Object.freeze({
							decision: "DraftNew" as const,
							existingMeaningId: null,
							draft: Object.freeze({
								meaningInEmojis:
									hiddenCase.gold.draft.meaningInEmojis,
								descriptionBlocks: Object.freeze([
									...hiddenCase.gold.draft.descriptionBlocks,
								]),
							}),
						}),
		}),
	),
);

export const ORDER_CONTROL_PAIRS = Object.freeze(
	["MR2-ORDER-A", "MR2-ORDER-B", "MR2-ORDER-C"].map((pairId) => {
		const pair = HIDDEN_MEANING_CASES.filter(
			(hiddenCase) => hiddenCase.orderControl?.pairId === pairId,
		);
		return Object.freeze({
			pairId,
			forwardCaseId: pair.find(
				(hiddenCase) => hiddenCase.orderControl?.order === "forward",
			)?.id,
			reverseCaseId: pair.find(
				(hiddenCase) => hiddenCase.orderControl?.order === "reverse",
			)?.id,
		});
	}),
);
