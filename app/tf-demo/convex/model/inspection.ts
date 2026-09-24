import { type Infer, v } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export const inspectionStepValidator = v.object({
	id: v.string(),
	parentId: v.optional(v.string()),
	name: v.string(),
	kind: v.union(v.literal("Code"), v.literal("LLM"), v.literal("TypeSafe")),
	owner: v.string(),
	startedAt: v.number(),
	durationMs: v.number(),
	timing: v.optional(v.literal("Unmeasured")),
	status: v.union(
		v.literal("Success"),
		v.literal("Partial"),
		v.literal("Failure"),
		v.literal("Interrupted"),
	),
});
export type InspectionStep = Infer<typeof inspectionStepValidator>;
export type CapturedInspectionStep = InspectionStep & { payloadJson: string };

/** Keep surrogate pairs intact when persisted as separate Convex strings. */
export function inspectionPayloadChunks(text: string): string[] {
	const chunks: string[] = [];
	for (let offset = 0; offset < text.length; ) {
		let end = Math.min(offset + 32_000, text.length);
		const last = text.charCodeAt(end - 1);
		if (end < text.length && last >= 0xd800 && last <= 0xdbff) end--;
		chunks.push(text.slice(offset, end));
		offset = end;
	}
	return chunks;
}

/**
 * Whether a request asked for Resolution Inspector capture. Schedulers read
 * this once and pass the answer into the scheduled action's arguments, so the
 * action never spends a query hop asking.
 */
export async function inspectionRequested(
	ctx: QueryCtx | MutationCtx,
	requestId: string,
): Promise<boolean> {
	return (
		(await ctx.db
			.query("inspectionClicks")
			.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
			.unique()) !== null
	);
}
