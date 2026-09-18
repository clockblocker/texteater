import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { inspectionStepValidator } from "./model/inspection";

import {
	catalogMissStageValidator,
	definitionTextStateValidator,
	directSemanticRelationValidator,
	knowledgeGenerationAttemptStateValidator,
	knowledgeProductionEvidenceValidator,
	knowledgeStatusValidator,
	languageValidator,
	orthographyValidator,
	readingBlockKindValidator,
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
	segmentResolutionStateValidator,
	storedKnowledgeSettingsValidator,
	surfaceSpellingValidator,
	textOriginValidator,
	translationLanguageValidator,
} from "./model/validators";

export default defineSchema({
	inspectionClicks: defineTable({
		requestId: v.string(),
		visitorId: v.string(),
		sentenceId: v.id("sentences"),
		selectedSegment: v.string(),
		sentence: v.string(),
		startedAt: v.number(),
		selectionKind: v.union(v.literal("Available"), v.literal("Resolving")),
		resolutionState: v.optional(v.string()),
		finishedAt: v.optional(v.number()),
		knowledgeState: v.optional(v.string()),
	})
		.index("by_request_id", ["requestId"])
		.index("by_visitor_id_and_started_at", ["visitorId", "startedAt"]),
	inspectionSteps: defineTable(
		inspectionStepValidator.extend({ requestId: v.string() }),
	)
		.index("by_request_id_and_started_at", ["requestId", "startedAt"])
		.index("by_request_id_and_id", ["requestId", "id"]),
	inspectionPayloads: defineTable({
		stepId: v.id("inspectionSteps"),
		part: v.number(),
		text: v.string(),
	}).index("by_step_id_and_part", ["stepId", "part"]),

	texts: defineTable({
		title: v.optional(v.string()),
		submissionKey: v.string(),
		sourceText: v.string(),
		/** Absent for a Visitor-submitted Text; set for a hidden Definition Text. */
		origin: v.optional(textOriginValidator),
	}).index("by_submission_key", ["submissionKey"]),

	/**
	 * One row per Reading whose Knowledge definition is being turned into a
	 * hidden Definition Text. It is the single live Definition Text pointer and
	 * the source of the Definition block's loading state.
	 */
	definitionTexts: defineTable({
		ownerReadingKey: v.string(),
		/** The definition Knowledge currently asks for; absent once Retracted. */
		definition: v.optional(v.string()),
		/** The definition the live Definition Text was segmented from. */
		materializedDefinition: v.optional(v.string()),
		state: definitionTextStateValidator,
		textId: v.optional(v.id("texts")),
		sentenceId: v.optional(v.id("sentences")),
		failureMessage: v.optional(v.string()),
		updatedAt: v.number(),
	})
		.index("by_owner_reading_key", ["ownerReadingKey"])
		.index("by_text_id", ["textId"]),

	sentences: defineTable({
		heading: v.optional(v.string()),
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
		resolutionState: v.optional(segmentResolutionStateValidator),
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
		surfaceFeatures: v.any(),
		articleReference: v.optional(v.any()),
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

	ownedSurfaces: defineTable({
		surfaceId: v.id("surfaces"),
		record: v.any(),
	}).index("by_surface_id", ["surfaceId"]),

	attestations: defineTable({
		articleEvidence: v.optional(v.any()),
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
		coveredTranslationLanguages: v.optional(
			v.array(translationLanguageValidator),
		),
		updatedAt: v.number(),
	}).index("by_owner_reading_key", ["ownerReadingKey"]),

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
		.index("by_reading_id", { fields: ["readingId"], staged: true })
		.index("by_attestation_id", {
			fields: ["attestationId"],
			staged: true,
		})
		.index("by_attempt_key", ["attemptKey"])
		.index("by_visitor_id_and_updated_at", ["visitorId", "updatedAt"])
		.index("by_owner_reading_key_and_updated_at", [
			"ownerReadingKey",
			"updatedAt",
		])
		.index("by_owner_reading_key_and_state", ["ownerReadingKey", "state"]),

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
		.index("by_source_reading_id", {
			fields: ["sourceReadingId"],
			staged: true,
		})
		.index("by_context_attestation_id", {
			fields: ["contextAttestationId"],
			staged: true,
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
		.index("by_source_reading_id", {
			fields: ["sourceReadingId"],
			staged: true,
		})
		.index("by_context_attestation_id", {
			fields: ["contextAttestationId"],
			staged: true,
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
		settings: storedKnowledgeSettingsValidator,
		updatedAt: v.number(),
	}).index("by_visitor_id", ["visitorId"]),

	personalAnnotations: defineTable({
		visitorId: v.string(),
		readingId: v.id("readings"),
		text: v.string(),
		updatedAt: v.number(),
	}).index("by_visitor_id_and_reading_id", ["visitorId", "readingId"]),

	readingLanguageLayouts: defineTable({
		visitorId: v.string(),
		targetLanguage: v.literal("de"),
		order: v.array(readingBlockKindValidator),
		hidden: v.array(readingBlockKindValidator),
		updatedAt: v.number(),
	}).index("by_visitor_id_and_target_language", [
		"visitorId",
		"targetLanguage",
	]),

	readingFamilyKindLayouts: defineTable({
		visitorId: v.string(),
		targetLanguage: v.literal("de"),
		family: v.string(),
		kind: v.string(),
		order: v.array(readingBlockKindValidator),
		hidden: v.array(readingBlockKindValidator),
		updatedAt: v.number(),
	}).index("by_visitor_id_and_target_language_and_family_and_kind", [
		"visitorId",
		"targetLanguage",
		"family",
		"kind",
	]),

	visitorClicks: defineTable({
		requestId: v.string(),
		visitorId: v.string(),
		textId: v.optional(v.id("texts")),
		sentenceId: v.optional(v.id("sentences")),
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
		.index("by_segment_id", { fields: ["segmentId"], staged: true })
		.index("by_reading_id", { fields: ["readingId"], staged: true })
		.index("by_attestation_id", {
			fields: ["attestationId"],
			staged: true,
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
		route: v.string(),
		stage: catalogMissStageValidator,
		catalogMissJson: v.string(),
		occurrences: v.number(),
		firstSeenAt: v.number(),
		lastSeenAt: v.number(),
		lastRequestId: v.string(),
	})
		.index("by_signal_key", ["signalKey"])
		.index("by_route_stage_and_last_seen_at", [
			"route",
			"stage",
			"lastSeenAt",
		]),

	dictionaryState: defineTable({
		key: v.literal("global"),
		revision: v.number(),
	}).index("by_key", ["key"]),
});
