import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
	knowledgeOwnerKindValidator,
	languageValidator,
	orthographyValidator,
	realizationCoverageValidator,
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
	}).index("by_lemma_key", ["lemmaKey"]),

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
		.index("by_lemma_id", ["lemmaId"]),

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
		segmentId: v.id("segments"),
		attestationId: v.optional(v.id("attestations")),
		clickedAt: v.number(),
	})
		.index("by_request_id", ["requestId"])
		.index("by_segment_id", ["segmentId"])
		.index("by_attestation_id", ["attestationId"])
		.index("by_visitor_id_and_clicked_at", ["visitorId", "clickedAt"])
		.index("by_visitor_id_and_segment_id", ["visitorId", "segmentId"]),

	dictionaryState: defineTable({
		key: v.literal("global"),
		revision: v.number(),
	}).index("by_key", ["key"]),
});
