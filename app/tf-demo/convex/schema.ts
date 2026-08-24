import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
	catalogMissReasonValidator,
	catalogMissStageValidator,
	directSemanticRelationValidator,
	knowledgeGenerationAttemptStateValidator,
	knowledgeSettingsValidator,
	knowledgeStatusValidator,
	languageValidator,
	orthographyValidator,
	readingValueValidator,
	realizationCoverageValidator,
	relationProposalOutcomeValidator,
	relationPublicationFingerprintsValidator,
	relationReviewStatusValidator,
	relationTargetShadowValidator,
	resolutionFailureCodeValidator,
	resolutionGenerationEventValidator,
	resolutionGrammarProjectionValidator,
	resolutionLifecycleValidator,
	resolutionPhaseValidator,
	resolutionReadingProjectionValidator,
	resolutionRouteProjectionValidator,
	resolutionRunStateValidator,
	resolvedGrammaticalValidator,
	safeGenerationFailureValidator,
	segmentKindValidator,
	surfaceKindValidator,
	surfaceSpellingValidator,
} from "./model/validators";

export default defineSchema({
	texts: defineTable({
		submissionKey: v.string(),
		sourceText: v.string(),
	}).index("by_submission_key", ["submissionKey"]),

	sentences: defineTable({
		segmentedSentenceId: v.string(),
		textId: v.id("texts"),
		position: v.number(),
		language: languageValidator,
		stitchedText: v.string(),
	})
		.index("by_segmented_sentence_id", ["segmentedSentenceId"])
		.index("by_stitched_text", ["stitchedText"])
		.index("by_text_id_and_position", ["textId", "position"]),

	segments: defineTable({
		sentenceId: v.id("sentences"),
		index: v.number(),
		kind: segmentKindValidator,
		text: v.string(),
		attestationMembership: v.optional(
			v.object({
				attestationId: v.id("attestations"),
				orthography: orthographyValidator,
			}),
		),
	})
		.index("by_sentence_id_and_index", ["sentenceId", "index"])
		.index("by_attestation_id", ["attestationMembership.attestationId"]),

	lemmas: defineTable({
		lemmaKey: v.string(),
		language: languageValidator,
		family: v.string(),
		kind: v.string(),
		canonicalForm: v.string(),
		coreFeatures: v.any(),
	})
		.index("by_lemma_key", ["lemmaKey"])
		.index("by_language_and_canonical_form", ["language", "canonicalForm"])
		.index("by_shadow_descriptor", [
			"language",
			"canonicalForm",
			"family",
			"kind",
		]),

	surfaces: defineTable({
		surfaceKey: v.string(),
		lemmaId: v.id("lemmas"),
		language: languageValidator,
		normalizedSurface: v.string(),
		spelling: surfaceSpellingValidator,
		surfaceKind: surfaceKindValidator,
		surfaceFeatures: v.any(),
		inflectionalFeatures: v.optional(v.any()),
	})
		.index("by_surface_key", ["surfaceKey"])
		.index("by_lemma_id", ["lemmaId"])
		.index("by_language_and_normalized_surface", [
			"language",
			"normalizedSurface",
		]),

	dictionaryLemmas: defineTable({
		lemmaId: v.id("lemmas"),
	}).index("by_lemma_id", ["lemmaId"]),

	readings: defineTable({
		readingKey: v.string(),
		lemmaId: v.id("lemmas"),
		emojiDescription: v.string(),
	})
		.index("by_reading_key", ["readingKey"])
		.index("by_lemma_id", ["lemmaId"]),

	readingEntries: defineTable({
		readingId: v.id("readings"),
		record: v.any(),
	}).index("by_reading_id", ["readingId"]),

	semanticRelationEdges: defineTable({
		sourceReadingId: v.id("readings"),
		targetKind: v.optional(
			v.union(v.literal("lemma"), v.literal("reading")),
		),
		targetLemmaId: v.optional(v.id("lemmas")),
		targetReadingId: v.optional(v.id("readings")),
		relation: directSemanticRelationValidator,
	})
		.index("by_source_reading_id", ["sourceReadingId"])
		.index("by_target_lemma_id", ["targetLemmaId"])
		.index("by_target_reading_id", ["targetReadingId"])
		.index("by_source_reading_id_and_relation", [
			"sourceReadingId",
			"relation",
		])
		.index("by_source_reading_id_and_relation_and_target_lemma_id", [
			"sourceReadingId",
			"relation",
			"targetLemmaId",
		])
		.index("by_source_reading_id_and_relation_and_target_reading_id", [
			"sourceReadingId",
			"relation",
			"targetReadingId",
		]),

	grammaticalRelationEdges: defineTable({
		endpointKind: v.union(v.literal("lemma"), v.literal("reading")),
		sourceLemmaId: v.optional(v.id("lemmas")),
		targetLemmaId: v.optional(v.id("lemmas")),
		sourceReadingId: v.optional(v.id("readings")),
		targetReadingId: v.optional(v.id("readings")),
		relation: v.union(
			v.literal("CaseCounterpart"),
			v.literal("PersonCounterpart"),
			v.literal("NumberCounterpart"),
		),
	})
		.index("by_source_lemma_id", ["sourceLemmaId"])
		.index("by_target_lemma_id", ["targetLemmaId"])
		.index("by_source_reading_id", ["sourceReadingId"])
		.index("by_target_reading_id", ["targetReadingId"])
		.index("by_source_lemma_id_and_relation", ["sourceLemmaId", "relation"])
		.index("by_source_reading_id_and_relation", [
			"sourceReadingId",
			"relation",
		])
		.index("by_source_lemma_id_and_relation_and_target_lemma_id", [
			"sourceLemmaId",
			"relation",
			"targetLemmaId",
		])
		.index("by_source_reading_id_and_relation_and_target_reading_id", [
			"sourceReadingId",
			"relation",
			"targetReadingId",
		]),

	ownedSurfaces: defineTable({
		surfaceId: v.id("surfaces"),
		record: v.any(),
	}).index("by_surface_id", ["surfaceId"]),

	attestations: defineTable({
		surfaceId: v.id("surfaces"),
		readingId: v.id("readings"),
		realizationCoverage: realizationCoverageValidator,
	})
		.index("by_surface_id", ["surfaceId"])
		.index("by_reading_id", ["readingId"]),

	pendingSemanticRelations: defineTable({
		locatorKey: v.string(),
		sourceReadingKey: v.string(),
		targetCanonicalForm: v.string(),
		shadowId: v.optional(v.id("shadows")),
		record: v.any(),
	})
		.index("by_locator_key", ["locatorKey"])
		.index("by_source_reading_key", ["sourceReadingKey"])
		.index("by_target_canonical_form", ["targetCanonicalForm"])
		.index("by_shadow_id", ["shadowId"]),

	shadows: defineTable({
		shadowKey: v.string(),
		language: languageValidator,
		canonicalForm: v.string(),
		family: v.string(),
		kind: v.string(),
	}).index("by_shadow_key", ["shadowKey"]),

	structuralShadowReferences: defineTable({
		shadowId: v.id("shadows"),
		ownerReadingKey: v.string(),
		aspect: v.union(
			v.literal("morphologicalTree"),
			v.literal("lexicalBreakdown"),
		),
		path: v.string(),
		locatorKey: v.string(),
	})
		.index("by_shadow_id", ["shadowId"])
		.index("by_owner_reading_key", ["ownerReadingKey"])
		.index("by_locator_key", ["locatorKey"])
		.index("by_owner_reading_key_and_aspect_and_path", [
			"ownerReadingKey",
			"aspect",
			"path",
		]),

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
		updatedAt: v.number(),
	}).index("by_owner_reading_key", ["ownerReadingKey"]),

	knowledgeGenerationAttempts: defineTable({
		attemptKey: v.string(),
		visitorId: v.string(),
		ownerReadingKey: v.string(),
		readingId: v.id("readings"),
		attestationId: v.id("attestations"),
		state: knowledgeGenerationAttemptStateValidator,
		runNumber: v.optional(v.number()),
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
		]),

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
		.index("by_run_key", ["runKey"])
		.index("by_attempt_key_and_run_number", ["attemptKey", "runNumber"])
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
		.index("by_proposal_key", ["proposalKey"])
		.index("by_attempt_key_and_run_number", ["attemptKey", "runNumber"])
		.index("by_relation_and_created_at", ["relation", "createdAt"])
		.index("by_review_status_and_updated_at", [
			"reviewStatus",
			"updatedAt",
		]),

	knowledgeSettings: defineTable({
		visitorId: v.string(),
		settings: knowledgeSettingsValidator,
		updatedAt: v.number(),
	}).index("by_visitor_id", ["visitorId"]),

	visitorClicks: defineTable({
		requestId: v.string(),
		visitorId: v.string(),
		segmentId: v.id("segments"),
		attestationId: v.optional(v.id("attestations")),
		clickedAt: v.number(),
	})
		.index("by_request_id", ["requestId"])
		.index("by_segment_id", ["segmentId"])
		.index("by_attestation_id", ["attestationId"])
		.index("by_visitor_id_and_attestation_id", [
			"visitorId",
			"attestationId",
		])
		.index("by_visitor_id_and_clicked_at", ["visitorId", "clickedAt"])
		.index("by_visitor_id_and_segment_id", ["visitorId", "segmentId"]),

	resolutionSessions: defineTable({
		requestId: v.string(),
		visitorId: v.string(),
		sentenceId: v.id("sentences"),
		segmentId: v.id("segments"),
		clickedSegmentIndex: v.number(),
		routeNoteRequested: v.optional(v.boolean()),
		runToken: v.string(),
		lifecycle: resolutionLifecycleValidator,
		runNumber: v.optional(v.number()),
		retryDeadlineAt: v.optional(v.number()),
		nextRetryAt: v.optional(v.number()),
		route: resolutionRouteProjectionValidator,
		grammar: v.optional(resolutionGrammarProjectionValidator),
		reading: v.optional(resolutionReadingProjectionValidator),
		grammaticalCheckpoint: v.optional(resolvedGrammaticalValidator),
		readingCheckpoint: v.optional(
			v.object({
				resolution: v.object({
					decision: v.union(v.literal("Reuse"), v.literal("New")),
					emojiDescription: v.string(),
				}),
				reading: readingValueValidator,
			}),
		),
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
		delayMs: v.optional(v.number()),
		startedAt: v.number(),
		finishedAt: v.optional(v.number()),
		expiresAt: v.number(),
	})
		.index("by_request_id_and_run_number", ["requestId", "runNumber"])
		.index("by_request_id_and_run_token", ["requestId", "runToken"])
		.index("by_expires_at", ["expiresAt"]),

	catalogGrowthSignals: defineTable({
		signalKey: v.string(),
		language: v.literal("de"),
		family: v.string(),
		kind: v.string(),
		stage: catalogMissStageValidator,
		reason: catalogMissReasonValidator,
		catalogMissJson: v.string(),
		occurrences: v.number(),
		firstSeenAt: v.number(),
		lastSeenAt: v.number(),
		lastRequestId: v.string(),
	})
		.index("by_signal_key", ["signalKey"])
		.index("by_route_stage_reason_and_last_seen_at", [
			"language",
			"family",
			"kind",
			"stage",
			"reason",
			"lastSeenAt",
		]),

	dictionaryState: defineTable({
		key: v.literal("global"),
		revision: v.number(),
	}).index("by_key", ["key"]),
});
