import { v } from "convex/values";

import { query } from "./_generated/server";
import { loadRouteNote, routeNoteValidator } from "./modules/notes/routeNotes";

export const get = query({
	args: {
		routeKind: v.union(
			v.literal("Attestation"),
			v.literal("Surface"),
			v.literal("Lemma"),
		),
		id: v.string(),
		contextCursor: v.optional(v.string()),
	},
	returns: v.union(v.null(), routeNoteValidator),
	handler: async (ctx, { routeKind, id, contextCursor }) =>
		loadRouteNote(ctx, { kind: "RouteNote", routeKind, id }, contextCursor),
});
