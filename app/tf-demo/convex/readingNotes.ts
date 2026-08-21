import { v } from "convex/values";

import { query } from "./_generated/server";
import {
	loadUnitReadingNote,
	readingNoteValidator,
} from "./modules/notes/readingNote";

export const get = query({
	args: {
		readingId: v.string(),
		contextCursor: v.optional(v.string()),
	},
	returns: v.union(v.null(), readingNoteValidator),
	handler: async (ctx, { readingId, contextCursor }) =>
		loadUnitReadingNote(ctx, readingId, contextCursor),
});
