import type { ExperimentEvaluation } from "promptsmith";
import type {
	emojiComparisonInputSchema as inputSchema,
	emojiOutputSchema as outputSchema,
} from "../model-schemas.js";

const neighborEmojiByCaseId = {
	"reading-de-lexeme-det-der-neighbor-house-isolation": ["🏠", "🏡", "🏘️"],
	"reading-de-lexeme-det-der-neighbor-car-isolation": ["🚗", "🚙", "🏎️"],
	"reading-de-lexeme-pron-das-relative-neighbor-house-isolation": [
		"🏠",
		"🏡",
	],
	"reading-de-lexeme-pron-die-relative-neighbor-cat-isolation": [
		"🐈",
		"🐱",
		"😺",
		"👩",
		"👧",
		"♀️",
	],
	"reading-de-morpheme-suffix-chen-neighbor-house-isolation": [
		"🏠",
		"🏡",
		"🏘️",
	],
} as const;

export const meaningIsolationCaseIds = Object.keys(
	neighborEmojiByCaseId,
) as Array<keyof typeof neighborEmojiByCaseId>;

export type ReadingMeaningIsolationEvaluation = Readonly<{
	contractPass: boolean;
	neighborMeaningPass: boolean;
}>;

export const evaluateReadingMeaningIsolation: ExperimentEvaluation<
	typeof inputSchema,
	typeof outputSchema,
	ReadingMeaningIsolationEvaluation
> = ({ caseId, output }) => {
	const forbidden =
		neighborEmojiByCaseId[caseId as keyof typeof neighborEmojiByCaseId];
	if (forbidden === undefined) {
		throw new Error(
			`No neighbor-meaning oracle exists for case "${caseId}".`,
		);
	}
	const neighborMeaningPass = forbidden.every(
		(emoji) => !output.emojiDescription.includes(emoji),
	);
	return {
		contractPass: neighborMeaningPass,
		neighborMeaningPass,
	};
};
