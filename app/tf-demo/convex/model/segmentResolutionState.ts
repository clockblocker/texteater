import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export type SegmentTerminalResolutionState = "Unresolved" | "PermanentFailure";

export async function beginSegmentResolution(
	ctx: MutationCtx,
	segmentId: Id<"segments">,
): Promise<boolean> {
	const segment = await ctx.db.get(segmentId);
	if (!segment || segment.attestationMembership) return false;
	const activeSessionCount =
		segment.resolutionState?.kind === "Active"
			? segment.resolutionState.activeSessionCount
			: 0;
	await ctx.db.patch(segmentId, {
		resolutionState: {
			kind: "Active",
			activeSessionCount: activeSessionCount + 1,
		},
	});
	return true;
}

/** Ends `endedSessionCount` Active sessions' contributions to one Segment. */
export async function finishSegmentResolution(
	ctx: MutationCtx,
	segmentId: Id<"segments">,
	outcome: SegmentTerminalResolutionState,
	endedSessionCount = 1,
): Promise<void> {
	const segment = await ctx.db.get(segmentId);
	if (!segment) return;
	if (segment.attestationMembership) {
		if (segment.resolutionState) {
			await ctx.db.patch(segmentId, { resolutionState: undefined });
		}
		return;
	}
	if (
		segment.resolutionState?.kind === "Active" &&
		segment.resolutionState.activeSessionCount > endedSessionCount
	) {
		await ctx.db.patch(segmentId, {
			resolutionState: {
				kind: "Active",
				activeSessionCount:
					segment.resolutionState.activeSessionCount -
					endedSessionCount,
			},
		});
		return;
	}
	await ctx.db.patch(segmentId, { resolutionState: { kind: outcome } });
}

/**
 * Ends the Segment Resolution State contribution of every Active session in
 * `sessions` that is about to be deleted, once per session rather than once
 * per Segment.
 */
export async function finishDeletedSessionsResolution(
	ctx: MutationCtx,
	sessions: readonly {
		readonly segmentId: Id<"segments">;
		readonly lifecycle?: { readonly state: string };
	}[],
	outcome: SegmentTerminalResolutionState,
): Promise<void> {
	const endedBySegment = new Map<Id<"segments">, number>();
	for (const session of sessions) {
		if (session.lifecycle?.state !== "Active") continue;
		endedBySegment.set(
			session.segmentId,
			(endedBySegment.get(session.segmentId) ?? 0) + 1,
		);
	}
	await Promise.all(
		[...endedBySegment].map(([segmentId, endedSessionCount]) =>
			finishSegmentResolution(ctx, segmentId, outcome, endedSessionCount),
		),
	);
}
