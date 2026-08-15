import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";

const BATCH_SIZE = 400;
const MAX_BATCHES = 100;

const demoTableNames = [
	"visitorResolvedContexts",
	"visitorClicks",
	"knowledgeContributions",
	"accumulatedKnowledge",
	"pendingSemanticRelations",
	"ownedSurfaces",
	"readings",
	"dictionaryLemmas",
	"grammaticalResolutions",
	"segments",
	"sentences",
	"texts",
	"dictionaryState",
] as const;

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
