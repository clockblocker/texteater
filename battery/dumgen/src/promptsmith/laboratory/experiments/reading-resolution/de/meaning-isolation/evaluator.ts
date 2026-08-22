import type { ExperimentEvaluation } from "../../../../../assembly";
import type {
	inputSchema,
	outputSchema,
} from "../../../../../production/reading-resolution/de/schemas";

const neighborEmojiByCaseId = Object.freeze({
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
} as const);

export const meaningIsolationCaseIds = Object.freeze(
	Object.keys(neighborEmojiByCaseId) as Array<
		keyof typeof neighborEmojiByCaseId
	>,
);

export type ReadingMeaningIsolationEvaluation = Readonly<{
	contractPass: boolean;
	decisionPass: boolean;
	noveltyPass: boolean;
	neighborMeaningPass: boolean;
}>;

export const evaluateReadingMeaningIsolation: ExperimentEvaluation<
	typeof inputSchema,
	typeof outputSchema,
	ReadingMeaningIsolationEvaluation
> = ({ caseId, input, output }) => {
	const forbidden =
		neighborEmojiByCaseId[caseId as keyof typeof neighborEmojiByCaseId];
	if (forbidden === undefined) {
		throw new Error(
			`No neighbor-meaning oracle exists for case "${caseId}".`,
		);
	}
	const decisionPass = output.decision === "New";
	const noveltyPass = !input.existingEmojiDescriptions.includes(
		output.emojiDescription,
	);
	const neighborMeaningPass = forbidden.every(
		(emoji) => !output.emojiDescription.includes(emoji),
	);
	return Object.freeze({
		contractPass: decisionPass && noveltyPass && neighborMeaningPass,
		decisionPass,
		noveltyPass,
		neighborMeaningPass,
	});
};
