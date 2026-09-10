import { v } from "convex/values";

import { query } from "./_generated/server";
import { loadRouteNote, routeNoteValidator } from "./modules/notes/routeNotes";

export const get = query({
	args: v.union(
		v.object({
			kind: v.literal("Attestation"),
			attestationId: v.id("attestations"),
			contextCursor: v.optional(v.string()),
		}),
		v.object({
			kind: v.literal("Surface"),
			language: v.literal("de"),
			normalizedSurface: v.string(),
			contextCursor: v.optional(v.string()),
		}),
		v.object({
			kind: v.literal("Lemma"),
			lemmaId: v.id("lemmas"),
			contextCursor: v.optional(v.string()),
		}),
	),
	returns: v.union(v.null(), routeNoteValidator),
	handler: async (ctx, args) => loadRouteNote(ctx, args, args.contextCursor),
});
