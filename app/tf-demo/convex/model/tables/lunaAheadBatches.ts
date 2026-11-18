import { defineTable } from "convex/server";
import { v } from "convex/values";
import { literalUnion } from "../validators";

/**
 * How a batch of Luna requests asked ahead stands (#1351): Submitted while
 * OpenAI runs it, or while its requests are asked live; Completed once its
 * answers are stored; Failed, Expired or Cancelled as OpenAI ended it,
 * with nothing stored. Expired also marks one that reached no final status
 * within a day and was given up.
 */
export const lunaAheadBatchStates = [
	"Submitted",
	"Completed",
	"Failed",
	"Expired",
	"Cancelled",
] as const;

/**
 * The Luna requests asked ahead of the clicks (#1351): once Intake has
 * processed a Folio, or a paste or link whole, the request every unit
 * there sends before jev answers, if any: the `canonical` guess, or the
 * `emojiDescription` draft of a headword code writes. The first stretch a
 * reader sees is asked live at once, as one batch with no OpenAI batch,
 * and the rest goes to OpenAI's Batch API. Each answer is kept under its
 * request's key until a click sends that request.
 */
export const lunaAheadBatchTables = {
	lunaAheadBatches: defineTable({
		scrollId: v.id("scrolls"),
		/** The Folio Intake processed; absent for a paste or link, processed whole. */
		folioId: v.optional(v.id("folios")),
		/** The OpenAI batch that asks the requests; absent where they are asked live. */
		openAIBatchId: v.optional(v.string()),
		state: literalUnion(lunaAheadBatchStates),
		/** Units whose click would send a Luna request before jev answers. */
		unitCount: v.number(),
		/** Distinct requests sent; units sharing one, or answered before, send it once. */
		requestCount: v.number(),
		/** The requests sent, counted by their Luna stage. */
		stageCounts: v.record(v.string(), v.number()),
		submittedAt: v.number(),
		/** Looks at the OpenAI batch so far; none at requests asked live. */
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

	lunaAheadAnswers: defineTable({
		/** The request's key (`lunaRequestKey`): the SHA-256 of its canonical JSON. */
		requestKey: v.string(),
		batchId: v.id("lunaAheadBatches"),
		/**
		 * The batch's id at OpenAI, which the click's trace names; absent
		 * for an answer asked live, whose trace names the batch's row.
		 */
		openAIBatchId: v.optional(v.string()),
		/** The Responses API body, as JSON, read as a live answer is. */
		body: v.string(),
	})
		.index("by_request_key", ["requestKey"])
		.index("by_batch_id", ["batchId"]),
};
