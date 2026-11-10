import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/** A Resolution Session row, as every session module reads it. */
export type ResolutionSession = Doc<"resolutionSessions">;

export async function findResolutionSession(
	ctx: QueryCtx,
	requestId: string,
): Promise<ResolutionSession | null> {
	return ctx.db
		.query("resolutionSessions")
		.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
		.unique();
}
