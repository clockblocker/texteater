import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action, internalAction, internalMutation } from "./_generated/server";

const BATCH_SIZE = 400;
const MAX_BATCHES = 100;

const sharedTableNames = [
	"knowledgeContributions",
	"accumulatedKnowledge",
	"pendingSemanticRelations",
	"ownedSurfaces",
	"readings",
	"dictionaryLemmas",
	"resolvedContexts",
	"grammaticalResolutions",
	"segments",
	"sentences",
	"texts",
	"dictionaryState",
] as const;

const demoTableNames = [
	"visitorResolvedContexts",
	"visitorClicks",
	...sharedTableNames,
] as const;

function assertVisitorId(visitorId: string): void {
	if (visitorId.trim().length === 0 || visitorId.length > 200) {
		throw new Error("visitorId must contain 1 to 200 characters.");
	}
}

export const clearSharedDataBatch = internalMutation({
	args: {},
	returns: v.object({ deleted: v.number(), hasMore: v.boolean() }),
	handler: async (ctx) => {
		let deleted = 0;
		let hasMore = false;
		for (const tableName of sharedTableNames) {
			const documents = await ctx.db.query(tableName).take(BATCH_SIZE);
			for (const document of documents) {
				await ctx.db.delete(document._id);
				deleted += 1;
			}
			if (documents.length === BATCH_SIZE) hasMore = true;
		}
		return { deleted, hasMore };
	},
});

export const clearVisitorDataBatch = internalMutation({
	args: { visitorId: v.string() },
	returns: v.object({ deleted: v.number(), hasMore: v.boolean() }),
	handler: async (ctx, { visitorId }) => {
		assertVisitorId(visitorId);
		const contexts = await ctx.db
			.query("visitorResolvedContexts")
			.withIndex("by_visitor_id_and_resolved_at", (q) =>
				q.eq("visitorId", visitorId),
			)
			.take(BATCH_SIZE);
		for (const context of contexts) await ctx.db.delete(context._id);

		const clicks = await ctx.db
			.query("visitorClicks")
			.withIndex("by_visitor_id_and_clicked_at", (q) =>
				q.eq("visitorId", visitorId),
			)
			.take(BATCH_SIZE);
		for (const click of clicks) await ctx.db.delete(click._id);

		return {
			deleted: contexts.length + clicks.length,
			hasMore:
				contexts.length === BATCH_SIZE || clicks.length === BATCH_SIZE,
		};
	},
});

export const resetDemoDataBatch = internalMutation({
	args: {},
	returns: v.object({ deleted: v.number(), hasMore: v.boolean() }),
	handler: async (ctx) => {
		let deleted = 0;
		let hasMore = false;
		for (const tableName of demoTableNames) {
			const documents = await ctx.db.query(tableName).take(BATCH_SIZE);
			for (const document of documents) {
				await ctx.db.delete(document._id);
				deleted += 1;
			}
			if (documents.length === BATCH_SIZE) hasMore = true;
		}
		return { deleted, hasMore };
	},
});

/**
 * The single explicit destructive demo operation.
 *
 * This remains internal because the app has no authentication foundation. Run
 * it deliberately with `convex run demoReset:resetDemoData`.
 */
export const resetDemoData = internalAction({
	args: {},
	returns: v.object({ deleted: v.number() }),
	handler: async (ctx): Promise<{ deleted: number }> => {
		let deleted = 0;
		for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
			const result = await ctx.runMutation(
				internal.demoReset.resetDemoDataBatch,
				{},
			);
			deleted += result.deleted;
			if (!result.hasMore) return { deleted };
		}
		throw new Error(
			`Demo reset exceeded ${MAX_BATCHES} bounded batches after deleting ${deleted} documents.`,
		);
	},
});

/** Local-demo control: clears global linguistic and Knowledge data. */
export const clearSharedData = action({
	args: {},
	returns: v.object({ deleted: v.number() }),
	handler: async (ctx): Promise<{ deleted: number }> => {
		let deleted = 0;
		for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
			const result = await ctx.runMutation(
				internal.demoReset.clearSharedDataBatch,
				{},
			);
			deleted += result.deleted;
			if (!result.hasMore) return { deleted };
		}
		throw new Error(
			`Shared-data reset exceeded ${MAX_BATCHES} bounded batches after deleting ${deleted} documents.`,
		);
	},
});

/**
 * Local-demo control: clears only rows scoped to the anonymous visitor ID.
 * The app deliberately has no authentication foundation and is not a hosted
 * multi-user surface.
 */
export const clearVisitorData = action({
	args: { visitorId: v.string() },
	returns: v.object({ deleted: v.number() }),
	handler: async (ctx, { visitorId }): Promise<{ deleted: number }> => {
		assertVisitorId(visitorId);
		let deleted = 0;
		for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
			const result = await ctx.runMutation(
				internal.demoReset.clearVisitorDataBatch,
				{ visitorId },
			);
			deleted += result.deleted;
			if (!result.hasMore) return { deleted };
		}
		throw new Error(
			`Visitor-data reset exceeded ${MAX_BATCHES} bounded batches after deleting ${deleted} documents.`,
		);
	},
});
