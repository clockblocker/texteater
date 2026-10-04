import { v } from "convex/values";

import { type QueryCtx, query } from "./_generated/server";

const MAX_LIBRARY_TEXTS = 100;

/**
 * The submissionKey prefix of a Text an e2e spec seeded. The Library
 * shelves such Texts in their own folder, apart from ordinary ones.
 */
const E2E_SUBMISSION_KEY_PREFIX = "e2e:";

const libraryTextValidator = v.object({
	textId: v.id("texts"),
	sourceText: v.string(),
	title: v.optional(v.string()),
	createdAt: v.number(),
	fixture: v.optional(v.literal(true)),
});

/** The newest Visitor Texts, never a hidden Definition Text. */
export async function listLibraryTexts(ctx: QueryCtx) {
	// Definition Texts are reached through their Reading Note, never listed.
	// The index range holds only Visitor Texts, so the hidden Definition
	// Texts are neither scanned nor part of this query's read set.
	const texts = await ctx.db
		.query("texts")
		.withIndex("by_origin_kind", (q) => q.eq("origin.kind", undefined))
		.order("desc")
		.take(MAX_LIBRARY_TEXTS);

	return texts.map((text) => ({
		textId: text._id,
		sourceText: text.sourceText,
		...(text.title ? { title: text.title } : {}),
		createdAt: text._creationTime,
		...(text.submissionKey.startsWith(E2E_SUBMISSION_KEY_PREFIX)
			? { fixture: true as const }
			: {}),
	}));
}

export const list = query({
	args: {},
	returns: v.array(libraryTextValidator),
	handler: listLibraryTexts,
});
