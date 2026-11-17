import { defineTable } from "convex/server";
import { v } from "convex/values";
import { literalUnion } from "../validators";

/**
 * How a batch of canonical requests stands (#1351): Submitted while
 * OpenAI runs it; Completed once its answers are stored; Failed, Expired
 * or Cancelled as OpenAI ended it, with nothing stored. Expired also
 * marks one that reached no final status within a day and was given up.
 */
export const canonicalBatchStates = [
	"Submitted",
	"Completed",
	"Failed",
	"Expired",
	"Cancelled",
] as const;

/**
 * The canonical requests asked ahead of the clicks (#1351): once Intake
 * has processed a Folio, or a paste or link whole, the Luna `canonical`
 * request of every unit there whose click would send one goes to
 * OpenAI's Batch API, and each answer is kept under its request's key
 * until a click sends that request.
 */
export const canonicalBatchTables = {
	canonicalBatches: defineTable({
		scrollId: v.id("scrolls"),
		/** The Folio Intake processed; absent for a paste or link, processed whole. */
		folioId: v.optional(v.id("folios")),
		openAIBatchId: v.string(),
		state: literalUnion(canonicalBatchStates),
		/** Units whose click would send a canonical request before jev answers. */
		unitCount: v.number(),
		/** Distinct requests sent; units sharing one, or answered before, send it once. */
		requestCount: v.number(),
		submittedAt: v.number(),
		/** Looks at the batch so far. */
		polls: v.number(),
		settledAt: v.optional(v.number()),
		/** Requests answered usably and stored, and those that were not. */
		answerCount: v.optional(v.number()),
		failedCount: v.optional(v.number()),
		/** The tokens the stored answers report: all input, the cached share, output. */
		tokens: v.optional(
			v.object({
				input: v.number(),
				cachedInput: v.number(),
				output: v.number(),
			}),
		),
		/** Why the batch stored nothing, as OpenAI or the poll said. */
		failure: v.optional(v.string()),
	})
		.index("by_scroll_id", ["scrollId"])
		.index("by_submitted_at", ["submittedAt"]),

	canonicalBatchAnswers: defineTable({
		/** The request's key (`lunaRequestKey`): the SHA-256 of its canonical JSON. */
		requestKey: v.string(),
		batchId: v.id("canonicalBatches"),
		/** The batch's id at OpenAI, which the click's trace names. */
		openAIBatchId: v.string(),
		/** The Responses API body, as JSON, read as a live answer is. */
		body: v.string(),
	})
		.index("by_request_key", ["requestKey"])
		.index("by_batch_id", ["batchId"]),
};
