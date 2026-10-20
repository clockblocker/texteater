import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
	directSemanticRelationValidator,
	knowledgeGenerationAttemptStateValidator,
	knowledgeProductionEvidenceValidator,
	knowledgeStatusValidator,
	translationLanguageValidator,
} from "../validators";

/**
 * Knowledge: its changes, what has accumulated, and the runs and attempts
 * producing it.
 */
export const knowledgeTables = {
	knowledgeChanges: defineTable({
		knowledgeChangeKey: v.string(),
		ownerReadingKey: v.string(),
		change: v.any(),
		createdAt: v.number(),
	})
		.index("by_knowledge_change_key", ["knowledgeChangeKey"])
		.index("by_owner_reading_key", ["ownerReadingKey"]),

	accumulatedKnowledge: defineTable({
		ownerReadingKey: v.string(),
		knowledge: v.any(),
		status: knowledgeStatusValidator,
		coveredTranslationLanguages: v.optional(
			v.array(translationLanguageValidator),
		),
		/** Relation kinds a committed run answered; edges cannot show an empty answer. */
		checkedRelationKinds: v.optional(
			v.array(directSemanticRelationValidator),
		),
		/** The stored Participle Source's Lemma key, so its verb finds this adjective. */
		participleSourceLemmaKey: v.optional(v.string()),
		updatedAt: v.number(),
	})
		.index("by_owner_reading_key", ["ownerReadingKey"])
		.index("by_participle_source_lemma_key", ["participleSourceLemmaKey"]),

	knowledgeProductionRuns: defineTable({
		attemptKey: v.string(),
		runNumber: v.number(),
		evidence: knowledgeProductionEvidenceValidator,
		outcome: v.union(
			v.literal("Success"),
			v.literal("Partial"),
			v.literal("Failure"),
			v.literal("Interrupted"),
		),
		createdAt: v.number(),
	}).index("by_attempt_key_and_run", ["attemptKey", "runNumber"]),
	knowledgeGenerationAttempts: defineTable({
		attemptKey: v.string(),
		visitorId: v.string(),
		ownerReadingKey: v.string(),
		readingId: v.id("readings"),
		attestationId: v.id("attestations"),
		translationLanguages: v.optional(v.array(translationLanguageValidator)),
		state: knowledgeGenerationAttemptStateValidator,
		runNumber: v.optional(v.number()),
		publicationSequence: v.optional(v.number()),
		failureCode: v.optional(v.string()),
		failureMessage: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_attempt_key", ["attemptKey"])
		.index("by_visitor_id_and_updated_at", ["visitorId", "updatedAt"])
		.index("by_owner_reading_key_and_updated_at", [
			"ownerReadingKey",
			"updatedAt",
		])
		.index("by_owner_reading_key_and_state_and_updated_at", [
			"ownerReadingKey",
			"state",
			"updatedAt",
		]),
};
