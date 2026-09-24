import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { intakeRunValidator } from "./model/intakeRuns";

/**
 * Appends one submission attempt's summary. A re-submission is a new attempt
 * with its own run ID, which is the only dedupe.
 */
export const record = internalMutation({
	args: intakeRunValidator.fields,
	returns: v.null(),
	handler: async (ctx, run) => {
		const existing = await ctx.db
			.query("intakeRuns")
			.withIndex("by_run_id", (q) => q.eq("runId", run.runId))
			.unique();
		if (!existing) await ctx.db.insert("intakeRuns", run);
		return null;
	},
});
