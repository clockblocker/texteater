import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
	directSemanticRelationValidator,
	relationProposalOutcomeValidator,
	relationPublicationFingerprintsValidator,
	relationReviewStatusValidator,
	relationTargetShadowValidator,
} from "../validators";

/** Generated relation publication: its control switch, runs and proposals. */
export const relationPublicationTables = {
	relationPublicationControls: defineTable({
		key: v.literal("global"),
		rollbackStopped: v.boolean(),
		reason: v.string(),
		updatedAt: v.number(),
	}).index("by_key", ["key"]),

	generatedRelationRuns: defineTable({
		runKey: v.string(),
		attemptKey: v.string(),
		runNumber: v.number(),
		relation: directSemanticRelationValidator,
		sourceReadingId: v.id("readings"),
		sourceReadingKey: v.string(),
		contextAttestationId: v.id("attestations"),
		verdictArtifactPath: v.union(v.string(), v.null()),
		fingerprints: relationPublicationFingerprintsValidator,
		generatedTargets: v.number(),
		nulls: v.number(),
		pendingShadows: v.number(),
		directMatches: v.number(),
		rejectedOutputs: v.number(),
		publicationFailures: v.number(),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_source_reading_id", ["sourceReadingId"])
		.index("by_run_key", ["runKey"])
		.index("by_relation_and_created_at", ["relation", "createdAt"]),

	generatedRelationProposals: defineTable({
		proposalKey: v.string(),
		attemptKey: v.string(),
		runNumber: v.number(),
		relation: directSemanticRelationValidator,
		sourceReadingId: v.id("readings"),
		sourceReadingKey: v.string(),
		contextAttestationId: v.id("attestations"),
		targetShadow: relationTargetShadowValidator,
		verdictArtifactPath: v.string(),
		fingerprints: relationPublicationFingerprintsValidator,
		outcome: relationProposalOutcomeValidator,
		reviewStatus: relationReviewStatusValidator,
		reviewedBy: v.optional(v.string()),
		reviewNote: v.optional(v.string()),
		reviewedAt: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_source_reading_id", ["sourceReadingId"])
		.index("by_proposal_key", ["proposalKey"])
		.index("by_attempt_key_and_run_number", ["attemptKey", "runNumber"])
		.index("by_review_status_and_updated_at", [
			"reviewStatus",
			"updatedAt",
		]),
};
