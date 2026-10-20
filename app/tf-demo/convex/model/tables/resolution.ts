import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
	catalogMissStageValidator,
	readingCheckpointValidator,
	resolutionFailureCodeValidator,
	resolutionGenerationEventValidator,
	resolutionGrammarProjectionValidator,
	resolutionLifecycleValidator,
	resolutionPhaseValidator,
	resolutionReadingProjectionValidator,
	resolutionRouteProjectionValidator,
	resolutionRunStateValidator,
	safeGenerationFailureValidator,
	storedGrammaticalCheckpointValidator,
} from "../validators";

/**
 * Click resolution: sessions, their runs, and the Catalog Growth Signals they
 * leave.
 */
export const resolutionTables = {
	resolutionSessions: defineTable({
		requestId: v.string(),
		visitorId: v.string(),
		sentenceId: v.id("sentences"),
		segmentId: v.id("segments"),
		clickedSegmentIndex: v.number(),
		runToken: v.string(),
		lifecycle: resolutionLifecycleValidator,
		runNumber: v.optional(v.number()),
		retryDeadlineAt: v.optional(v.number()),
		route: resolutionRouteProjectionValidator,
		grammar: v.optional(resolutionGrammarProjectionValidator),
		reading: v.optional(resolutionReadingProjectionValidator),
		grammaticalCheckpoint: v.optional(storedGrammaticalCheckpointValidator),
		readingCheckpoint: v.optional(readingCheckpointValidator),
		readingId: v.optional(v.id("readings")),
		attestationId: v.optional(v.id("attestations")),
		failureCode: v.optional(resolutionFailureCodeValidator),
		diagnosticId: v.optional(v.string()),
		failureMessage: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_request_id", ["requestId"])
		.index("by_sentence_id", ["sentenceId"])
		.index("by_visitor_id_and_updated_at", ["visitorId", "updatedAt"])
		.index("by_visitor_id_and_segment_id", ["visitorId", "segmentId"])
		.index("by_lifecycle_state_and_updated_at", [
			"lifecycle.state",
			"updatedAt",
		]),

	resolutionRuns: defineTable({
		requestId: v.string(),
		runToken: v.string(),
		runNumber: v.number(),
		phase: resolutionPhaseValidator,
		state: resolutionRunStateValidator,
		failure: v.optional(safeGenerationFailureValidator),
		failureCode: v.optional(resolutionFailureCodeValidator),
		diagnosticId: v.optional(v.string()),
		errorName: v.optional(v.string()),
		errorFingerprint: v.optional(v.string()),
		generationEvents: v.optional(
			v.array(resolutionGenerationEventValidator),
		),
		startedAt: v.number(),
		finishedAt: v.optional(v.number()),
		expiresAt: v.number(),
	})
		.index("by_request_id_and_run_number", ["requestId", "runNumber"])
		.index("by_request_id_and_run_token", ["requestId", "runToken"])
		.index("by_expires_at", ["expiresAt"]),

	catalogGrowthSignals: defineTable({
		signalKey: v.string(),
		route: v.string(),
		stage: catalogMissStageValidator,
		catalogMissJson: v.string(),
		occurrences: v.number(),
		firstSeenAt: v.number(),
		lastSeenAt: v.number(),
		lastRequestId: v.string(),
	}).index("by_signal_key", ["signalKey"]),
};
