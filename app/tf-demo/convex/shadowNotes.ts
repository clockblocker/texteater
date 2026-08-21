import { v } from "convex/values";

import { query } from "./_generated/server";
import {
	loadShadowNote,
	shadowNoteValidator,
} from "./modules/notes/shadowNote";

export const get = query({
	args: {
		shadowId: v.string(),
		contextCursor: v.optional(v.string()),
	},
	returns: v.union(v.null(), shadowNoteValidator),
	handler: async (ctx, { shadowId, contextCursor }) =>
		loadShadowNote(ctx, shadowId, contextCursor),
});
