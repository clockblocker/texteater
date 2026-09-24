import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { advanceMemberEncounters as advance } from "./model/visitorClicks";

/** Continues advancing a committed occurrence's member Encounters. */
export const advanceMemberEncounters = internalMutation({
	args: {
		segmentIds: v.array(v.id("segments")),
		attestationId: v.id("attestations"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		// Analysis Stripping may have ended the occurrence since.
		if (!(await ctx.db.get(args.attestationId))) return null;
		await advance(ctx, args);
		return null;
	},
});
