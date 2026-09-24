import { v } from "convex/values";

import { query } from "./_generated/server";
import {
	loadReadingSourceContexts,
	loadUnitReadingNote,
	readingNoteValidator,
	sourceContextPageValidator,
} from "./modules/notes/readingNote";

export const get = query({
	args: {
		readingId: v.string(),
		visitorId: v.string(),
	},
	returns: v.union(v.null(), readingNoteValidator),
	handler: async (ctx, { readingId, visitorId }) =>
		loadUnitReadingNote(ctx, readingId, visitorId),
});

/** "Load more" for a Reading Note: the next Source Contexts, without the body. */
export const sourceContexts = query({
	args: {
		readingId: v.string(),
		visitorId: v.string(),
		cursor: v.string(),
	},
	returns: v.union(v.null(), sourceContextPageValidator),
	handler: async (ctx, { readingId, visitorId, cursor }) =>
		loadReadingSourceContexts(ctx, readingId, visitorId, cursor),
});
