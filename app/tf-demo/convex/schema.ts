import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { inspectionStepValidator } from "./model/inspection";
import { intakeRunValidator } from "./model/intakeRuns";

import {
	articleEvidenceValidator,
	catalogMissStageValidator,
	codexPlacementValidator,
	definitionTextStateValidator,
	detectedLanguageValidator,
	directSemanticRelationValidator,
	familyValidator,
	fusionValidator,
	kindValidator,
	knowledgeGenerationAttemptStateValidator,
	knowledgeProductionEvidenceValidator,
	knowledgeSettingsValidator,
	knowledgeStatusValidator,
	languageValidator,
	orthographyValidator,
	readingBlockKindValidator,
	readingCheckpointValidator,
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
	safeGenerationFailureValidator,
	scrollOriginValidator,
	segmentResolutionStateValidator,
	storedGrammaticalCheckpointValidator,
	storedSegmentValidator,
	storedUnitValidator,
	structuralShadowAspectValidator,
	surfaceSpellingValidator,
	translationLanguageValidator,
} from "./model/validators";

export default defineSchema({
	inspectionClicks: defineTable({
		requestId: v.string(),
		visitorId: v.string(),
		sentenceId: v.optional(v.id("sentences")),
		selectedSegment: v.string(),
		sentence: v.string(),
		startedAt: v.number(),
		selectionKind: v.union(
			v.literal("Available"),
			v.literal("Resolving"),
			v.literal("Analysis"),
		),
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

	intakeRuns: defineTable(intakeRunValidator)
		.index("by_run_id", ["runId"])
		.index("by_submission_key", ["submissionKey"]),

	/**
	 * A Section: a container, at any depth, of Sections and Scrolls (#1189).
	 * Its Codex is the Sections and Scrolls placed in it, in order. Status
	 * lives on its Scrolls. Write Sections and place Scrolls through
	 * `model/codex.ts`, which keeps `scrollCount` true.
	 */
	sections: defineTable({
		title: v.string(),
		placement: v.optional(codexPlacementValidator),
		/**
		 * The Scrolls anywhere under it. A Section is done for a Visitor once
		 * that many are, so its status never walks the tree (#1192).
		 */
		scrollCount: v.number(),
		/** The Submission it came from; `e2e:` marks a fixture the Library shelves apart. */
		submissionKey: v.optional(v.string()),
	}).index("by_placement", ["placement.sectionId", "placement.order"]),

	scrolls: defineTable({
		title: v.optional(v.string()),
		submissionKey: v.string(),
		sourceText: v.string(),
		/**
		 * The Scroll's Extracted Text, Dumgen's `Scroll` (checked with
		 * `parseScroll` when read): what intake re-runs from. Absent for a
		 * Definition Text.
		 */
		extractedText: v.optional(v.any()),
		/** Absent for a Visitor-submitted Scroll; set for a hidden Definition Text. */
		origin: v.optional(scrollOriginValidator),
		/** Absent for a loose Scroll, such as a one-off paste. */
		placement: v.optional(codexPlacementValidator),
	})
		.index("by_submission_key", ["submissionKey"])
		/**
		 * Visitor Scrolls are the range whose `origin.kind` is absent, and
		 * loose ones, the Library's, are those with no `placement` either.
		 */
		.index("by_origin_kind_and_placement", [
			"origin.kind",
			"placement.sectionId",
		])
		.index("by_placement", ["placement.sectionId", "placement.order"]),

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
		/** The last materialization run claimed; a late run cannot settle a newer one. */
		runNumber: v.optional(v.number()),
		/** Runs in a row the watchdog found dead; cleared when a run settles. */
		interruptedRuns: v.optional(v.number()),
		scrollId: v.optional(v.id("scrolls")),
		sentenceId: v.optional(v.id("sentences")),
		failureMessage: v.optional(v.string()),
		updatedAt: v.number(),
	}).index("by_owner_reading_key", ["ownerReadingKey"]),

	sentences: defineTable({
		heading: v.optional(v.string()),
		segmentedSentenceId: v.string(),
		scrollId: v.id("scrolls"),
		position: v.number(),
		/**
		 * Sentences sharing a paragraph run together in the reader. Absent for
		 * Sentences stored before paragraphs were kept; each reads alone.
		 */
		paragraph: v.optional(v.number()),
		/**
		 * The Detected Language, absent when undetermined. Any but the Scroll's
		 * target language makes it a Plain Sentence: no Segments, no units.
		 */
		language: v.optional(detectedLanguageValidator),
		/** The Sentence's normalized text; its Segments concatenate to it. */
		stitchedText: v.string(),
		/**
		 * The Sentence's biggest units, as intake's `segment.inUnits` gave
		 * them: Segments by index, each unit's route or Unresolved, and its
		 * route variants. Analysis Stripping removes them with the Segments.
		 */
		units: v.optional(v.array(storedUnitValidator)),
		/**
		 * Present when intake's `segment.inUnits` failed for the Sentence:
		 * it stores no units, and the reader shows it as not segmented.
		 */
		segmentationFailed: v.optional(v.literal(true)),
	})
		.index("by_segmented_sentence_id", ["segmentedSentenceId"])
		.index("by_scroll_id_and_position", ["scrollId", "position"]),

	segments: defineTable({
		sentenceId: v.id("sentences"),
		...storedSegmentValidator.fields,
		resolutionState: v.optional(segmentResolutionStateValidator),
		/**
		 * The member this Segment realizes. A `Fused` member also stores its
		 * Fusion and the component it realizes (ADR 0035).
		 */
		attestationMembership: v.optional(
			v.object({
				attestationId: v.id("attestations"),
				orthography: orthographyValidator,
				fusion: v.optional(fusionValidator),
				component: v.optional(v.number()),
			}),
		),
	})
		.index("by_sentence_id_and_index", ["sentenceId", "index"])
		.index("by_attestation_id", ["attestationMembership.attestationId"]),

	lemmas: defineTable({
		lemmaKey: v.string(),
		language: languageValidator,
		family: familyValidator,
		kind: kindValidator,
		/** The display casing a Note renders. */
		canonicalForm: v.string(),
		/** The Canonical Form case-folded for identity (system ADR 0002). */
		foldedCanonicalForm: v.string(),
		coreFeatures: v.any(),
	})
		.index("by_lemma_key", ["lemmaKey"])
		.index("by_shadow_descriptor", [
			"language",
			"foldedCanonicalForm",
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
		/** A Foreign Reading has none (ADR 0045). */
		emojiDescription: v.optional(v.string()),
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
		.index("by_target_lemma_id", ["targetLemmaId"])
		.index("by_target_reading_id", ["targetReadingId"])
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
		articleEvidence: v.optional(
			v.union(v.null(), articleEvidenceValidator),
		),
		expletiveEvidence: v.optional(v.any()),
		valencyEvidence: v.optional(v.any()),
		surfaceId: v.id("surfaces"),
		readingId: v.id("readings"),
		realizationCoverage: realizationCoverageValidator,
	})
		.index("by_surface_id", ["surfaceId"])
		.index("by_reading_id", ["readingId"]),

	pendingSemanticRelations: defineTable({
		locatorKey: v.string(),
		sourceReadingKey: v.string(),
		/** The target Shadow's Canonical Form, case-folded; `record` keeps its casing. */
		targetFoldedCanonicalForm: v.string(),
		shadowId: v.optional(v.id("shadows")),
		record: v.any(),
	})
		.index("by_locator_key", ["locatorKey"])
		.index("by_source_reading_key", ["sourceReadingKey"])
		.index("by_target_folded_canonical_form", ["targetFoldedCanonicalForm"])
		.index("by_shadow_id", ["shadowId"]),

	shadows: defineTable({
		/** Keys the descriptor with its Canonical Form case-folded (system ADR 0002). */
		shadowKey: v.string(),
		language: languageValidator,
		/** The display casing of the first descriptor interned. */
		canonicalForm: v.string(),
		family: familyValidator,
		kind: kindValidator,
	}).index("by_shadow_key", ["shadowKey"]),

	structuralShadowReferences: defineTable({
		shadowId: v.id("shadows"),
		ownerReadingKey: v.string(),
		aspect: structuralShadowAspectValidator,
		path: v.string(),
		locatorKey: v.string(),
	})
		.index("by_shadow_id", ["shadowId"])
		.index("by_owner_reading_key", ["ownerReadingKey"]),

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

	knowledgeSettings: defineTable({
		visitorId: v.string(),
		settings: knowledgeSettingsValidator,
		updatedAt: v.number(),
	}).index("by_visitor_id", ["visitorId"]),

	personalAnnotations: defineTable({
		visitorId: v.string(),
		readingId: v.id("readings"),
		text: v.string(),
		updatedAt: v.number(),
	})
		.index("by_visitor_id_and_reading_id", ["visitorId", "readingId"])
		.index("by_reading_id", ["readingId"]),

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

	/**
	 * One Visitor's place in one Scroll (#1192): opened is in progress, and
	 * done once marked or left by next. No row means not started.
	 */
	scrollProgress: defineTable({
		visitorId: v.string(),
		scrollId: v.id("scrolls"),
		status: v.union(v.literal("InProgress"), v.literal("Done")),
		/** The Sentence position the reader was at; reopening resumes there. */
		position: v.number(),
	}).index("by_visitor_id_and_scroll_id", ["visitorId", "scrollId"]),

	/**
	 * One Visitor's place in one Section, written when a Scroll under it is
	 * opened: the last Scroll read there, and how many under it are done.
	 */
	sectionProgress: defineTable({
		visitorId: v.string(),
		sectionId: v.id("sections"),
		lastScrollId: v.id("scrolls"),
		doneScrolls: v.number(),
	}).index("by_visitor_id_and_section_id", ["visitorId", "sectionId"]),

	visitorEncounters: defineTable({
		requestId: v.string(),
		visitorId: v.string(),
		scrollId: v.id("scrolls"),
		sentenceId: v.id("sentences"),
		segmentId: v.id("segments"),
		attestationId: v.optional(v.id("attestations")),
		/** The Reading of `attestationId`, copied beside it; an Attestation never changes Reading. */
		readingId: v.optional(v.id("readings")),
		encounteredAt: v.number(),
	})
		.index("by_request_id", ["requestId"])
		.index("by_segment_id_and_attestation_id", [
			"segmentId",
			"attestationId",
		])
		.index("by_visitor_id_and_attestation_id", [
			"visitorId",
			"attestationId",
		])
		.index("by_visitor_id_and_encountered_at", [
			"visitorId",
			"encounteredAt",
		])
		.index("by_visitor_id_and_segment_id", ["visitorId", "segmentId"])
		.index("by_visitor_id_and_sentence_id", ["visitorId", "sentenceId"])
		.index("by_visitor_id_and_reading_id", ["visitorId", "readingId"]),

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
});
