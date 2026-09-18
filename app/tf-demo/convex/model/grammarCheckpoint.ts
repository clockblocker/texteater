import type { Infer } from "convex/values";
import {
	parseResolvedGrammar,
	type ResolvedGrammar,
} from "../../server/resolutionGrammar";
import type { resolvedGrammaticalValidator } from "./validators";

export type ResolvedGrammaticalActionResult = Infer<
	typeof resolvedGrammaticalValidator
>;

/** Re-validates a Grammar result and copies it into the mutable Convex transport shape. */
export function resolvedGrammaticalActionResult(
	input: ResolvedGrammar,
): ResolvedGrammaticalActionResult {
	const parsed = parseResolvedGrammar(input);
	return {
		...parsed,
		encounter: {
			sentence: {
				...parsed.encounter.sentence,
				segments: parsed.encounter.sentence.segments.map((segment) => ({
					...segment,
				})),
			},
			target: {
				...parsed.encounter.target,
				memberSegmentIndices: [
					...parsed.encounter.target.memberSegmentIndices,
				],
			},
		},
	};
}

export function resolvedGrammaticalCheckpoint(
	input: ResolvedGrammaticalActionResult,
): ResolvedGrammar {
	return parseResolvedGrammar(input);
}
