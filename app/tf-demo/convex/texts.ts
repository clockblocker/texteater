import { v } from "convex/values";

import { query } from "./_generated/server";

const MAX_LIBRARY_TEXTS = 100;

const libraryTextValidator = v.object({
	textId: v.id("texts"),
	sourceText: v.string(),
	title: v.optional(v.string()),
	createdAt: v.number(),
});

export const list = query({
	args: {},
	returns: v.array(libraryTextValidator),
	handler: async (ctx) => {
		// Definition Texts are reached through their Reading Note, never listed.
		const texts = await ctx.db
			.query("texts")
			.order("desc")
			.filter((q) => q.eq(q.field("origin"), undefined))
			.take(MAX_LIBRARY_TEXTS);

		return texts.map((text) => ({
			textId: text._id,
			sourceText: text.sourceText,
			...(text.title ? { title: text.title } : {}),
			createdAt: text._creationTime,
		}));
	},
});
