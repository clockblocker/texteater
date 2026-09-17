import type { Infer } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { knowledgeProductionEvidenceValidator } from "./validators";

/** Keep one complete immutable production record for each explicit attempt run. */
export async function recordKnowledgeProductionRun(
	ctx: MutationCtx,
	attempt: { attemptKey: string; runNumber?: number },
	evidence: Infer<typeof knowledgeProductionEvidenceValidator>,
	outcome: "Success" | "Partial" | "Failure" | "Interrupted",
) {
	const runNumber = attempt.runNumber ?? 1;
	const existing = await ctx.db
		.query("knowledgeProductionRuns")
		.withIndex("by_attempt_key_and_run", (q) =>
			q.eq("attemptKey", attempt.attemptKey).eq("runNumber", runNumber),
		)
		.unique();
	if (existing) return;
	await ctx.db.insert("knowledgeProductionRuns", {
		attemptKey: attempt.attemptKey,
		runNumber,
		evidence,
		outcome,
		createdAt: Date.now(),
	});
}
