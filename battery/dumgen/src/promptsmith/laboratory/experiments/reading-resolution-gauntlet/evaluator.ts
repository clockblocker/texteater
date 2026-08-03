import type { output } from "zod";

import type {
	inputSchema,
	outputSchema,
} from "../../prompt-source/reading-resolution/de/schemas";

export type ReadingResolutionEvaluation = {
	readonly contractPass: boolean;
	readonly expectedDecisionPass: boolean;
	readonly membershipConsistent: boolean;
	readonly newEmojiAbsentFromExisting: boolean | null;
	readonly reusedExpectedDescription: boolean | null;
};

export function evaluateReadingResolution(args: {
	readonly caseId: string;
	readonly input: output<typeof inputSchema>;
	readonly idealOutput: output<typeof outputSchema>;
	readonly output: output<typeof outputSchema>;
}): ReadingResolutionEvaluation {
	const expectedDecisionPass =
		args.output.decision === args.idealOutput.decision;
	const outputIsExisting = args.input.existingEmojiDescriptions.includes(
		args.output.emojiDescription,
	);
	const membershipConsistent =
		args.output.decision === "Reuse" ? outputIsExisting : !outputIsExisting;
	const newEmojiAbsentFromExisting =
		args.idealOutput.decision === "New"
			? !args.input.existingEmojiDescriptions.includes(
					args.output.emojiDescription,
				)
			: null;
	const reusedExpectedDescription =
		args.idealOutput.decision === "Reuse"
			? args.output.emojiDescription === args.idealOutput.emojiDescription
			: null;
	return {
		contractPass:
			expectedDecisionPass &&
			membershipConsistent &&
			(args.idealOutput.decision === "New"
				? newEmojiAbsentFromExisting === true
				: reusedExpectedDescription === true),
		expectedDecisionPass,
		membershipConsistent,
		newEmojiAbsentFromExisting,
		reusedExpectedDescription,
	};
}
