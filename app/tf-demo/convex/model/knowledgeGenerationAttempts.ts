import { type FunctionReference, makeFunctionReference } from "convex/server";
import type { MutationCtx } from "../_generated/server";

const runKnowledgeGeneration = makeFunctionReference<
	"action",
	{ attemptKey: string },
	null
>(
	"knowledgeGenerationActions:runKnowledgeGeneration",
) as unknown as FunctionReference<
	"action",
	"internal",
	{ attemptKey: string },
	null
>;

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
	await ctx.scheduler.runAfter(0, runKnowledgeGeneration, {
		attemptKey: waiting.attemptKey,
	});
}
