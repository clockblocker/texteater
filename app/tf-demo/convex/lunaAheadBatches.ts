import { v } from "convex/values";
import { MAX_SENTENCES_PER_SCROLL } from "../server/textSubmissionLimits";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "./_generated/server";
import { lunaAheadBatchStates } from "./model/tables/lunaAheadBatches";
import { literalUnion } from "./model/validators";
import {
	loadResolutionContext,
	resolutionContextValidator,
} from "./resolutionContext";

/*
 * The storage side of the Luna requests asked ahead of the clicks
 * (#1351), each the canonical guess or the emoji draft a click sends
 * before jev answers: which units are asked, live or batched, a batch's
 * row, and the answers a click finds by its request's key.
 * `lunaAheadBatchActions.ts` asks the live ones, and submits and polls the
 * batch.
 */

/**
 * How much of a processed text a reader sees first, in characters: one
 * laptop screenful of the reader's column (48rem of text-lg at 1.52
 * leading: about 25 lines of 80 characters), counted from the first
 * Sentence of the paste, link or Folio. A Folio is processed when the
 * Learner asks for it from its control at its start, so its opening is
 * where they read on. The units of the Sentences that start inside it are
 * asked live, so a click there is answered from storage before the batch
 * of the rest lands; a Sentence that starts inside it is asked whole.
 */
export const FIRST_STRETCH_CHARACTERS = 2_000;

/** Of Sentences in reading order, how many start within the first `characters`. */
export function firstStretchLength(
	sentences: readonly { readonly stitchedText: string }[],
	characters: number = FIRST_STRETCH_CHARACTERS,
): number {
	let offset = 0;
	let count = 0;
	for (const { stitchedText } of sentences) {
		if (offset >= characters) break;
		count++;
		offset += stitchedText.length + 1;
	}
	return count;
}

const unitAheadValidator = v.object({
	sentenceId: v.id("sentences"),
	clickedSegmentIndex: v.number(),
});

/** Asks Intake's processed Folio, or a whole paste or link, ahead of its clicks. */
export async function scheduleLunaAheadBatch(
	ctx: MutationCtx,
	args: { scrollId: Id<"scrolls">; folioId?: Id<"folios"> },
): Promise<void> {
	await ctx.scheduler.runAfter(
		0,
		internal.lunaAheadBatchActions.submit,
		args,
	);
}

/**
 * The first Segment of every routed unit of the Folio's Sentences, or of
 * the whole Scroll's, in reading order: where a click on it lands, those
 * of the first stretch a reader sees (`FIRST_STRETCH_CHARACTERS`) apart
 * from the rest. German Sentences only, and none whose segmentation
 * failed; Unresolved units are left out.
 */
export const unitsAhead = internalQuery({
	args: {
		scrollId: v.id("scrolls"),
		folioId: v.optional(v.id("folios")),
	},
	returns: v.object({
		firstStretch: v.array(unitAheadValidator),
		rest: v.array(unitAheadValidator),
	}),
	handler: async (ctx, { scrollId, folioId }) => {
		const folio = folioId ? await ctx.db.get(folioId) : null;
		if (folioId && folio?.scrollId !== scrollId)
			return { firstStretch: [], rest: [] };
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
		const unitsOf = (some: typeof sentences) =>
			some.flatMap((sentence) =>
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
		const stretch = firstStretchLength(sentences);
		return {
			firstStretch: unitsOf(sentences.slice(0, stretch)),
			rest: unitsOf(sentences.slice(stretch)),
		};
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
					.query("lunaAheadAnswers")
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
			.query("lunaAheadAnswers")
			.withIndex("by_request_key", (q) => q.eq("requestKey", requestKey))
			.first();
		// An answer asked live names the row of the requests asked with it.
		return answer
			? {
					body: answer.body,
					source: answer.openAIBatchId ?? answer.batchId,
				}
			: null;
	},
});

/** The batch's row, for its poll. */
export const batch = internalQuery({
	args: { batchId: v.id("lunaAheadBatches") },
	returns: v.union(
		v.null(),
		v.object({
			openAIBatchId: v.optional(v.string()),
			state: literalUnion(lunaAheadBatchStates),
			submittedAt: v.number(),
			polls: v.number(),
		}),
	),
	handler: async (ctx, { batchId }) => {
		const row = await ctx.db.get(batchId);
		return row
			? {
					...(row.openAIBatchId === undefined
						? {}
						: { openAIBatchId: row.openAIBatchId }),
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
		stageCounts: v.record(v.string(), v.number()),
		firstPollAfterMs: v.number(),
	},
	returns: v.id("lunaAheadBatches"),
	handler: async (ctx, { firstPollAfterMs, ...batch }) => {
		const batchId = await ctx.db.insert("lunaAheadBatches", {
			...batch,
			state: "Submitted",
			submittedAt: Date.now(),
			polls: 0,
		});
		await ctx.scheduler.runAfter(
			firstPollAfterMs,
			internal.lunaAheadBatchActions.poll,
			{ batchId },
		);
		return batchId;
	},
});

/** Records the requests of a first stretch being asked live: no OpenAI batch, nothing to poll. */
export const recordAskedLive = internalMutation({
	args: {
		scrollId: v.id("scrolls"),
		folioId: v.optional(v.id("folios")),
		unitCount: v.number(),
		requestCount: v.number(),
		stageCounts: v.record(v.string(), v.number()),
	},
	returns: v.id("lunaAheadBatches"),
	handler: (ctx, asked) =>
		ctx.db.insert("lunaAheadBatches", {
			...asked,
			state: "Submitted",
			submittedAt: Date.now(),
			polls: 0,
		}),
});

/** Counts one look at a batch still running, and schedules the next. */
export const recordPolled = internalMutation({
	args: { batchId: v.id("lunaAheadBatches"), nextPollAfterMs: v.number() },
	returns: v.null(),
	handler: async (ctx, { batchId, nextPollAfterMs }) => {
		const row = await ctx.db.get(batchId);
		if (row?.state !== "Submitted") return null;
		await ctx.db.patch(batchId, { polls: row.polls + 1 });
		await ctx.scheduler.runAfter(
			nextPollAfterMs,
			internal.lunaAheadBatchActions.poll,
			{ batchId },
		);
		return null;
	},
});

/**
 * Stores some of a completed batch's answers, or one answer asked live as
 * it comes; a key answered before keeps its answer.
 */
export const storeAnswers = internalMutation({
	args: {
		batchId: v.id("lunaAheadBatches"),
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
				.query("lunaAheadAnswers")
				.withIndex("by_request_key", (q) =>
					q.eq("requestKey", requestKey),
				)
				.first();
			if (!stored)
				await ctx.db.insert("lunaAheadAnswers", {
					requestKey,
					batchId,
					...(row.openAIBatchId === undefined
						? {}
						: { openAIBatchId: row.openAIBatchId }),
					body,
				});
		}
		return null;
	},
});

/** Ends a batch: Completed with its counts and tokens, or how it failed. */
export const recordSettled = internalMutation({
	args: {
		batchId: v.id("lunaAheadBatches"),
		state: literalUnion(lunaAheadBatchStates),
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
