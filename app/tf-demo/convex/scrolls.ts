import { v } from "convex/values";

import { type QueryCtx, query } from "./_generated/server";

const MAX_LIBRARY_SCROLLS = 100;

/**
 * The submissionKey prefix of a Scroll an e2e spec seeded. The Library
 * shelves such Scrolls in their own folder, apart from ordinary ones.
 */
const E2E_SUBMISSION_KEY_PREFIX = "e2e:";

const libraryScrollValidator = v.object({
	scrollId: v.id("scrolls"),
	sourceText: v.string(),
	title: v.optional(v.string()),
	createdAt: v.number(),
	fixture: v.optional(v.literal(true)),
});

/** The newest Visitor Scrolls, never a hidden Definition Text. */
export async function listLibraryScrolls(ctx: QueryCtx) {
	// Definition Texts are reached through their Reading Note, never listed.
	// The index range holds only Visitor Scrolls, so the hidden Definition
	// Scrolls are neither scanned nor part of this query's read set.
	const scrolls = await ctx.db
		.query("scrolls")
		.withIndex("by_origin_kind", (q) => q.eq("origin.kind", undefined))
		.order("desc")
		.take(MAX_LIBRARY_SCROLLS);

	return scrolls.map((scroll) => ({
		scrollId: scroll._id,
		sourceText: scroll.sourceText,
		...(scroll.title ? { title: scroll.title } : {}),
		createdAt: scroll._creationTime,
		...(scroll.submissionKey.startsWith(E2E_SUBMISSION_KEY_PREFIX)
			? { fixture: true as const }
			: {}),
	}));
}

export const list = query({
	args: {},
	returns: v.array(libraryScrollValidator),
	handler: listLibraryScrolls,
});
