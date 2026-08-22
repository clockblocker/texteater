import { v } from "convex/values";

import { query } from "./_generated/server";

const MAX_LIBRARY_TEXTS = 100;

const libraryTextValidator = v.object({
	textId: v.id("texts"),
	sourceText: v.string(),
	createdAt: v.number(),
});

export const list = query({
	args: {},
	returns: v.array(libraryTextValidator),
	handler: async (ctx) => {
		const texts = await ctx.db
			.query("texts")
			.order("desc")
			.take(MAX_LIBRARY_TEXTS);

		return texts.map((text) => ({
			textId: text._id,
			sourceText: text.sourceText,
			createdAt: text._creationTime,
		}));
	},
});
