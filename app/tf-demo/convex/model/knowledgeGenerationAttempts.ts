import { internal } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";
import { inspectionRequested } from "./inspection";

export async function scheduleNextWaitingKnowledgeAttempt(
	ctx: MutationCtx,
	ownerReadingKey: string,
): Promise<void> {
	const [waiting] = await ctx.db
		.query("knowledgeGenerationAttempts")
		.withIndex("by_owner_reading_key_and_state", (q) =>
			q.eq("ownerReadingKey", ownerReadingKey).eq("state", "Waiting"),
		)
		.take(1);
	if (!waiting) return;
	await ctx.db.patch(waiting._id, {
		state: "Scheduled",
		updatedAt: Date.now(),
	});
	const inspect = await inspectionRequested(ctx, waiting.attemptKey);
	await ctx.scheduler.runAfter(
		0,
		internal.knowledgeGenerationActions.runKnowledgeGeneration,
		{ attemptKey: waiting.attemptKey, ...(inspect ? { inspect } : {}) },
	);
}
