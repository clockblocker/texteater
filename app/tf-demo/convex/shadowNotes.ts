import { v } from "convex/values";

import { query } from "./_generated/server";
import {
	loadShadowNote,
	loadShadowNoteReferences,
	shadowNoteValidator,
	shadowReferencePageValidator,
} from "./modules/notes/shadowNote";

export const get = query({
	args: { shadowId: v.string() },
	returns: v.union(v.null(), shadowNoteValidator),
	handler: async (ctx, { shadowId }) => loadShadowNote(ctx, shadowId),
});

/** "Load more" for a Shadow Note: the next references, without the body. */
export const references = query({
	args: { shadowId: v.string(), cursor: v.string() },
	returns: v.union(v.null(), shadowReferencePageValidator),
	handler: async (ctx, { shadowId, cursor }) =>
		loadShadowNoteReferences(ctx, shadowId, cursor),
});
