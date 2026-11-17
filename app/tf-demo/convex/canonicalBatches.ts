import { v } from "convex/values";
import { MAX_SENTENCES_PER_SCROLL } from "../server/textSubmissionLimits";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "./_generated/server";
import { canonicalBatchStates } from "./model/tables/canonicalBatches";
import { literalUnion } from "./model/validators";
import {
	loadResolutionContext,
	resolutionContextValidator,
} from "./resolutionContext";

/*
 * The storage side of the canonical requests asked ahead of the clicks
 * (#1351): which units a batch covers, the batch's row, and the answers a
 * click finds by its request's key. `canonicalBatchActions.ts` submits and
 * polls the batch.
 */

/** Asks Intake's processed Folio, or a whole paste or link, ahead of its clicks. */
export async function scheduleCanonicalBatch(
	ctx: MutationCtx,
	args: { scrollId: Id<"scrolls">; folioId?: Id<"folios"> },
): Promise<void> {
	await ctx.scheduler.runAfter(
		0,
		internal.canonicalBatchActions.submit,
		args,
	);
}

/**
 * The first Segment of every routed unit of the Folio's Sentences, or of
 * the whole Scroll's: where a click on it lands. German Sentences only,
 * and none whose segmentation failed; Unresolved units are left out.
 */
export const unitsAhead = internalQuery({
	args: {
		scrollId: v.id("scrolls"),
		folioId: v.optional(v.id("folios")),
	},
	returns: v.array(
		v.object({
			sentenceId: v.id("sentences"),
			clickedSegmentIndex: v.number(),
		}),
	),
	handler: async (ctx, { scrollId, folioId }) => {
		const folio = folioId ? await ctx.db.get(folioId) : null;
		if (folioId && folio?.scrollId !== scrollId) return [];
		const sentences = await ctx.db
			.query("sentences")
			.withIndex("by_scroll_id_and_position", (q) =>
				folio
					? q
							.eq("scrollId", scrollId)
							.gte("position", folio.start)
							.lt("position", folio.end)
					: q.eq("scrollId", scrollId),
			)
			.take(MAX_SENTENCES_PER_SCROLL);
		return sentences.flatMap((sentence) =>
			sentence.language !== "de" || sentence.segmentationFailed
				? []
				: (sentence.units ?? []).flatMap(({ route, segments }) => {
						const [first] = segments;
						return route === "Unresolved" || first === undefined
							? []
							: [
									{
										sentenceId: sentence._id,
										clickedSegmentIndex: first,
									},
								];
					}),
		);
	},
});

/** The Resolution Context a click on the Segment would load now. */
export const unitContext = internalQuery({
	args: {
		sentenceId: v.id("sentences"),
		clickedSegmentIndex: v.number(),
	},
	returns: resolutionContextValidator,
	handler: (ctx, args) => loadResolutionContext(ctx, args),
});

/** Of `requestKeys`, those that have a stored answer already. */
export const answeredKeys = internalQuery({
	args: { requestKeys: v.array(v.string()) },
	returns: v.array(v.string()),
	handler: async (ctx, { requestKeys }) => {
		const answered: string[] = [];
		for (const requestKey of requestKeys)
			if (
				await ctx.db
					.query("canonicalBatchAnswers")
					.withIndex("by_request_key", (q) =>
						q.eq("requestKey", requestKey),
					)
					.first()
			)
				answered.push(requestKey);
		return answered;
	},
});

/** The stored answer to the request under `requestKey`, for a click. */
export const storedAnswer = internalQuery({
	args: { requestKey: v.string() },
	returns: v.union(
		v.null(),
		v.object({ body: v.string(), source: v.string() }),
	),
	handler: async (ctx, { requestKey }) => {
		const answer = await ctx.db
			.query("canonicalBatchAnswers")
			.withIndex("by_request_key", (q) => q.eq("requestKey", requestKey))
			.first();
		return answer
			? { body: answer.body, source: answer.openAIBatchId }
			: null;
	},
});

/** The batch's row, for its poll. */
export const batch = internalQuery({
	args: { batchId: v.id("canonicalBatches") },
	returns: v.union(
		v.null(),
		v.object({
			openAIBatchId: v.string(),
			state: literalUnion(canonicalBatchStates),
			submittedAt: v.number(),
			polls: v.number(),
		}),
	),
	handler: async (ctx, { batchId }) => {
		const row = await ctx.db.get(batchId);
		return row
			? {
					openAIBatchId: row.openAIBatchId,
					state: row.state,
					submittedAt: row.submittedAt,
					polls: row.polls,
				}
			: null;
	},
});

/** Records a batch OpenAI took, and schedules its first poll. */
export const recordSubmitted = internalMutation({
	args: {
		scrollId: v.id("scrolls"),
		folioId: v.optional(v.id("folios")),
		openAIBatchId: v.string(),
		unitCount: v.number(),
		requestCount: v.number(),
		firstPollAfterMs: v.number(),
	},
	returns: v.id("canonicalBatches"),
	handler: async (ctx, { firstPollAfterMs, ...batch }) => {
		const batchId = await ctx.db.insert("canonicalBatches", {
			...batch,
			state: "Submitted",
			submittedAt: Date.now(),
			polls: 0,
		});
		await ctx.scheduler.runAfter(
			firstPollAfterMs,
			internal.canonicalBatchActions.poll,
			{ batchId },
		);
		return batchId;
	},
});

/** Counts one look at a batch still running, and schedules the next. */
export const recordPolled = internalMutation({
	args: { batchId: v.id("canonicalBatches"), nextPollAfterMs: v.number() },
	returns: v.null(),
	handler: async (ctx, { batchId, nextPollAfterMs }) => {
		const row = await ctx.db.get(batchId);
		if (row?.state !== "Submitted") return null;
		await ctx.db.patch(batchId, { polls: row.polls + 1 });
		await ctx.scheduler.runAfter(
			nextPollAfterMs,
			internal.canonicalBatchActions.poll,
			{ batchId },
		);
		return null;
	},
});

/** Stores some of a completed batch's answers; a key answered before keeps its answer. */
export const storeAnswers = internalMutation({
	args: {
		batchId: v.id("canonicalBatches"),
		answers: v.array(
			v.object({ requestKey: v.string(), body: v.string() }),
		),
	},
	returns: v.null(),
	handler: async (ctx, { batchId, answers }) => {
		const row = await ctx.db.get(batchId);
		if (row?.state !== "Submitted") return null;
		for (const { requestKey, body } of answers) {
			const stored = await ctx.db
				.query("canonicalBatchAnswers")
				.withIndex("by_request_key", (q) =>
					q.eq("requestKey", requestKey),
				)
				.first();
			if (!stored)
				await ctx.db.insert("canonicalBatchAnswers", {
					requestKey,
					batchId,
					openAIBatchId: row.openAIBatchId,
					body,
				});
		}
		return null;
	},
});

/** Ends a batch: Completed with its counts and tokens, or how it failed. */
export const recordSettled = internalMutation({
	args: {
		batchId: v.id("canonicalBatches"),
		state: literalUnion(canonicalBatchStates),
		answerCount: v.optional(v.number()),
		failedCount: v.optional(v.number()),
		tokens: v.optional(
			v.object({
				input: v.number(),
				cachedInput: v.number(),
				output: v.number(),
			}),
		),
		failure: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, { batchId, ...settled }) => {
		const row = await ctx.db.get(batchId);
		if (row?.state !== "Submitted") return null;
		await ctx.db.patch(batchId, { ...settled, settledAt: Date.now() });
		return null;
	},
});
