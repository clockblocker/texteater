import type { Infer } from "convex/values";
import {
	parseResolvedGrammar,
	type ResolvedGrammar,
	restoreStoredGrammar,
} from "../../server/resolutionGrammar";
import type { Doc } from "../_generated/dataModel";
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

/**
 * Decodes a Resolution Session's stored Grammar checkpoint into the Convex
 * transport shape, or undefined when it no longer parses, so the run resolves
 * Grammar again.
 */
export function restoreGrammaticalCheckpoint(
	session: Pick<Doc<"resolutionSessions">, "_id" | "grammaticalCheckpoint">,
): ResolvedGrammaticalActionResult | undefined {
	if (!session.grammaticalCheckpoint) return undefined;
	const restoration = restoreStoredGrammar(session.grammaticalCheckpoint);
	if (!restoration.ok) {
		console.warn(
			JSON.stringify({
				event: "StaleGrammarCheckpoint",
				sessionId: session._id,
				reason: restoration.reason,
			}),
		);
		return undefined;
	}
	const restored = restoration.grammar;
	return {
		...restored,
		encounter: {
			sentence: {
				...restored.encounter.sentence,
				segments: restored.encounter.sentence.segments.map(
					(segment) => ({ ...segment }),
				),
			},
			target: {
				...restored.encounter.target,
				memberSegmentIndices: [
					...restored.encounter.target.memberSegmentIndices,
				],
			},
		},
	};
}
