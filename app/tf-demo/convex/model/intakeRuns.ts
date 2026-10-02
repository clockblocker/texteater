import { v } from "convex/values";
import { literalUnion } from "./validators";

/**
 * One text submission attempt's summary (#527): outcomes, tags, counts,
 * tokens and durations, never source text, prompts or model output. Failed
 * carries the thrown error's name. Full traces stay in DEV inspection.
 */
export const intakeRunValidator = v.object({
	/** The attempt's requestId. */
	runId: v.string(),
	submissionKey: v.string(),
	/** Absent when the attempt failed before a Text existed. */
	textId: v.optional(v.id("texts")),
	outcome: literalUnion(["Accepted", "Failed"] as const),
	failureTag: v.optional(v.string()),
	sentenceCount: v.number(),
	/**
	 * How each Sentence's `segment.inUnits` ended: Segmented, or Failed when
	 * it was stored marked as not segmented.
	 */
	sentences: v.array(
		v.object({
			segmentation: literalUnion([
				"Segmented",
				"Failed",
				"NotStarted",
			] as const),
		}),
	),
	/** The jev requests `segment.inUnits` sent, summed from its trace. */
	jev: v.object({
		calls: v.number(),
		failed: v.number(),
		inputTokens: v.number(),
		outputTokens: v.number(),
		totalDurationMs: v.number(),
		maxDurationMs: v.number(),
	}),
	durationMs: v.number(),
	createdAt: v.number(),
});
