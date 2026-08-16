import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
	grammaticalLanguageValidator,
	knowledgeOwnerKindValidator,
	languageValidator,
	segmentKindValidator,
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
	}).index("by_sentence_id_and_index", ["sentenceId", "index"]),

	grammaticalResolutions: defineTable({
		resolutionKey: v.string(),
		sentenceId: v.id("sentences"),
		language: grammaticalLanguageValidator,
		markedContext: v.string(),
		memberSegmentIndices: v.array(v.number()),
		attestation: v.any(),
		surfaceKey: v.string(),
		lemmaKey: v.string(),
	})
		.index("by_resolution_key", ["resolutionKey"])
		.index("by_sentence_id", ["sentenceId"])
		.index("by_surface_key", ["surfaceKey"])
		.index("by_lemma_key", ["lemmaKey"]),

	resolvedContexts: defineTable({
		contextKey: v.string(),
		sentenceId: v.id("sentences"),
		clickedSegmentIndex: v.number(),
		resolutionId: v.id("grammaticalResolutions"),
		readingId: v.id("readings"),
		resolvedAt: v.number(),
	})
		.index("by_context_key", ["contextKey"])
		.index("by_reading_id", ["readingId"])
		.index("by_sentence_id_and_clicked_segment_index", [
			"sentenceId",
			"clickedSegmentIndex",
		]),

	dictionaryLemmas: defineTable({
		lemmaKey: v.string(),
		record: v.any(),
	}).index("by_lemma_key", ["lemmaKey"]),

	readings: defineTable({
		readingKey: v.string(),
		lemmaKey: v.string(),
		emojiDescription: v.string(),
		entry: v.any(),
	})
		.index("by_reading_key", ["readingKey"])
		.index("by_lemma_key", ["lemmaKey"]),

	ownedSurfaces: defineTable({
		surfaceKey: v.string(),
		lemmaKey: v.string(),
		entry: v.any(),
	})
		.index("by_surface_key", ["surfaceKey"])
		.index("by_lemma_key", ["lemmaKey"]),

	pendingSemanticRelations: defineTable({
		locatorKey: v.string(),
		sourceReadingKey: v.string(),
		targetCanonicalForm: v.string(),
		record: v.any(),
	})
		.index("by_locator_key", ["locatorKey"])
		.index("by_source_reading_key", ["sourceReadingKey"])
		.index("by_target_canonical_form", ["targetCanonicalForm"]),

	knowledgeContributions: defineTable({
		contributionKey: v.string(),
		ownerKind: knowledgeOwnerKindValidator,
		ownerKey: v.string(),
		change: v.any(),
		createdAt: v.number(),
	})
		.index("by_contribution_key", ["contributionKey"])
		.index("by_owner_kind_and_owner_key", ["ownerKind", "ownerKey"]),

	accumulatedKnowledge: defineTable({
		ownerKind: knowledgeOwnerKindValidator,
		ownerKey: v.string(),
		knowledge: v.any(),
		updatedAt: v.number(),
	}).index("by_owner_kind_and_owner_key", ["ownerKind", "ownerKey"]),

	visitorClicks: defineTable({
		requestId: v.string(),
		visitorId: v.string(),
		sentenceId: v.id("sentences"),
		clickedSegmentIndex: v.number(),
		resolutionId: v.optional(v.id("grammaticalResolutions")),
		resolvedContextId: v.optional(v.id("resolvedContexts")),
		clickedAt: v.number(),
	})
		.index("by_request_id", ["requestId"])
		.index("by_sentence_id", ["sentenceId"])
		.index("by_visitor_id_and_clicked_at", ["visitorId", "clickedAt"])
		.index("by_visitor_id_and_sentence_id_and_clicked_segment_index", [
			"visitorId",
			"sentenceId",
			"clickedSegmentIndex",
		]),

	visitorResolvedContexts: defineTable({
		contextKey: v.string(),
		visitorId: v.string(),
		clickId: v.id("visitorClicks"),
		resolvedContextId: v.optional(v.id("resolvedContexts")),
		// Transitional fields for rows written before resolvedContexts existed.
		sentenceId: v.optional(v.id("sentences")),
		clickedSegmentIndex: v.optional(v.number()),
		resolutionId: v.optional(v.id("grammaticalResolutions")),
		readingId: v.optional(v.id("readings")),
		resolvedAt: v.number(),
	})
		.index("by_context_key", ["contextKey"])
		.index("by_click_id", ["clickId"])
		.index("by_reading_id", ["readingId"])
		.index("by_resolved_context_id", ["resolvedContextId"])
		.index("by_visitor_id_and_resolved_at", ["visitorId", "resolvedAt"])
		.index("by_sentence_id_and_clicked_segment_index", [
			"sentenceId",
			"clickedSegmentIndex",
		])
		.index("by_visitor_id_and_sentence_id_and_clicked_segment_index", [
			"visitorId",
			"sentenceId",
			"clickedSegmentIndex",
		]),

	dictionaryState: defineTable({
		key: v.literal("global"),
		revision: v.number(),
	}).index("by_key", ["key"]),
});
