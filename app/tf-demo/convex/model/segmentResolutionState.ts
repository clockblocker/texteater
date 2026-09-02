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

export async function finishSegmentResolution(
	ctx: MutationCtx,
	segmentId: Id<"segments">,
	outcome: SegmentTerminalResolutionState,
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
		segment.resolutionState.activeSessionCount > 1
	) {
		await ctx.db.patch(segmentId, {
			resolutionState: {
				kind: "Active",
				activeSessionCount:
					segment.resolutionState.activeSessionCount - 1,
			},
		});
		return;
	}
	await ctx.db.patch(segmentId, { resolutionState: { kind: outcome } });
}
