import { v } from "convex/values";
import { languageValidator, literalUnion } from "./validators";

const stageValidator = v.object({
	calls: v.number(),
	failed: v.number(),
	interrupted: v.number(),
	totalDurationMs: v.number(),
	maxDurationMs: v.number(),
	/** Total RequestQueued wait of the stage's requests. */
	queueWaitMs: v.number(),
});

/**
 * One text submission attempt's summary (#527): outcomes, tags, counts and
 * durations, never source text, prompts or model output. Failed carries its
 * DumgenFailure tag or Defect. Full traces stay in DEV inspection.
 */
export const intakeRunValidator = v.object({
	/** The attempt's requestId. */
	runId: v.string(),
	submissionKey: v.string(),
	/** Absent when the attempt failed before a Text existed. */
	textId: v.optional(v.id("texts")),
	outcome: literalUnion(["Accepted", "Failed", "Interrupted"] as const),
	failureTag: v.optional(v.string()),
	sentenceCount: v.number(),
	sentences: v.array(
		v.object({
			segmentation: literalUnion([
				"Accepted",
				"UnsupportedLanguage",
				"Unintelligible",
				"Failed",
				"Interrupted",
				"NotStarted",
			] as const),
			/** Present for Accepted. */
			language: v.optional(languageValidator),
			segmentationTag: v.optional(v.string()),
			analysis: literalUnion([
				"Analysed",
				"Failed",
				"Interrupted",
				"NotStarted",
				"NotApplicable",
			] as const),
			analysisTag: v.optional(v.string()),
		}),
	),
	stages: v.object({
		segment: stageValidator,
		analyzeSentence: stageValidator,
	}),
	durationMs: v.number(),
	createdAt: v.number(),
});
