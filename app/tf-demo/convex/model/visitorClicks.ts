import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type VisitorEncounterContext = MutationCtx | QueryCtx;

export async function findVisitorEncounter(
	ctx: VisitorEncounterContext,
	input: {
		visitorId: string;
		segmentId: Id<"segments">;
	},
) {
	const [click] = await ctx.db
		.query("visitorClicks")
		.withIndex("by_visitor_id_and_segment_id", (q) =>
			q.eq("visitorId", input.visitorId).eq("segmentId", input.segmentId),
		)
		.take(1);
	return click ?? null;
}

export async function ensureVisitorEncounter(
	ctx: MutationCtx,
	input: {
		requestId: string;
		visitorId: string;
		segmentId: Id<"segments">;
		attestationId?: Id<"attestations">;
	},
) {
	const existing = await findVisitorEncounter(ctx, input);
	if (existing) {
		if (
			input.attestationId &&
			existing.attestationId &&
			existing.attestationId !== input.attestationId
		) {
			throw new Error(
				"Visitor Encounter refers to a different committed Attestation.",
			);
		}
		if (input.attestationId && !existing.attestationId) {
			await ctx.db.patch(existing._id, {
				attestationId: input.attestationId,
			});
		}
		return { clickId: existing._id, created: false as const };
	}

	const clickId = await ctx.db.insert("visitorClicks", {
		requestId: input.requestId,
		visitorId: input.visitorId,
		segmentId: input.segmentId,
		...(input.attestationId ? { attestationId: input.attestationId } : {}),
		clickedAt: Date.now(),
	});
	return { clickId, created: true as const };
}
