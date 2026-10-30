import { v } from "convex/values";

import { query } from "./_generated/server";
import { loadRouteNote, routeNoteValidator } from "./modules/notes/routeNotes";

export const get = query({
	args: {
		visitorId: v.optional(v.string()),
		target: v.union(
			v.object({
				kind: v.literal("Attestation"),
				attestationId: v.id("attestations"),
				contextCursor: v.optional(v.string()),
			}),
			v.object({
				kind: v.literal("Surface"),
				language: v.literal("de"),
				normalizedSurface: v.string(),
				activeAnalysisKey: v.optional(v.id("surfaces")),
				/** The Reading the Deck leads to, whose frame slots the Surface's line. */
				activeReadingId: v.optional(v.id("readings")),
				contextCursor: v.optional(v.string()),
			}),
			v.object({
				kind: v.literal("Lemma"),
				lemmaId: v.id("lemmas"),
				contextCursor: v.optional(v.string()),
			}),
		),
	},
	returns: v.union(v.null(), routeNoteValidator),
	handler: async (ctx, args) =>
		loadRouteNote(
			ctx,
			args.target,
			args.target.contextCursor,
			args.visitorId,
		),
});
