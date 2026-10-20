import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
	articleEvidenceValidator,
	directSemanticRelationValidator,
	familyValidator,
	kindValidator,
	languageValidator,
	realizationCoverageValidator,
	structuralShadowAspectValidator,
	surfaceSpellingValidator,
} from "../validators";

/**
 * The Shared Demo Dictionary: Lemmas, Surfaces, Readings, Attestations,
 * relations and Shadows.
 */
export const dictionaryTables = {
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
};
