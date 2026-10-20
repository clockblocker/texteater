import { v } from "convex/values";
import type { ResolutionSessionGuard } from "../../server/resolutionLifecycle";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
	assertMatchingRetry,
	assertVisitorInput,
	requireClickableSegment,
} from "./resolutionLookup";
import {
	type CommittedOccurrence,
	requireCommittingSession,
} from "./resolutionSessions";
import { resolutionSessionGuardValidator } from "./validators";

/** What every Occurrence commit names: the click and the session committing it. */
export const occurrenceCommitArgs = {
	requestId: v.string(),
	visitorId: v.string(),
	sentenceId: v.id("sentences"),
	clickedSegmentIndex: v.number(),
	sessionGuard: resolutionSessionGuardValidator,
};

/**
 * The rules every Occurrence commit starts with: the session must still be
 * committing, the clicked Segment must be clickable, and a requestId already
 * recorded must be this Visitor's retry on the same Segment.
 */
export async function openOccurrenceCommit(
	ctx: MutationCtx,
	args: {
		readonly requestId: string;
		readonly visitorId: string;
		readonly sentenceId: Id<"sentences">;
		readonly clickedSegmentIndex: number;
		readonly sessionGuard: ResolutionSessionGuard;
	},
) {
	assertVisitorInput(args.visitorId, args.requestId);
	const [session, { sentence, segment }, existing] = await Promise.all([
		requireCommittingSession(ctx, args.sessionGuard, args),
		requireClickableSegment(ctx, args.sentenceId, args.clickedSegmentIndex),
		ctx.db
			.query("visitorEncounters")
			.withIndex("by_request_id", (q) =>
				q.eq("requestId", args.requestId),
			)
			.unique(),
	]);
	if (existing) {
		assertMatchingRetry(existing, {
			visitorId: args.visitorId,
			segmentId: segment._id,
		});
	}
	return { session, sentence, segment, existing };
}

/** The commit result for a Segment another occurrence already owns. */
export function reusedCommit(
	committed: CommittedOccurrence,
	existing: { readonly attestationId?: Id<"attestations"> } | null,
) {
	return {
		status: "Reused" as const,
		encounterId: committed.encounterId,
		readingId: committed.readingId,
		attestationId: committed.attestationId,
		deduplicated: existing?.attestationId === committed.attestationId,
		occurrence: committed.occurrence,
	};
}
