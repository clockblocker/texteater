import { defineTable } from "convex/server";
import { v } from "convex/values";
import { inspectionStepValidator } from "../inspection";

/**
 * The Inspection trace of each click: the click, its steps, and their
 * payloads.
 */
export const inspectionTables = {
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
};
