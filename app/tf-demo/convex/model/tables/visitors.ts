import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
	knowledgeSettingsValidator,
	readingBlockKindValidator,
} from "../validators";

/**
 * Per-Visitor state: settings, annotations, layouts, progress and encounters.
 */
export const visitorTables = {
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
};
