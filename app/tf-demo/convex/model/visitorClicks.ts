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
		textId: Id<"texts">;
		sentenceId: Id<"sentences">;
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
		const patch = {
			...(existing.textId ? {} : { textId: input.textId }),
			...(existing.sentenceId ? {} : { sentenceId: input.sentenceId }),
			...(input.attestationId && !existing.attestationId
				? { attestationId: input.attestationId }
				: {}),
		};
		if (Object.keys(patch).length > 0) {
			await ctx.db.patch(existing._id, patch);
		}
		return { clickId: existing._id, created: false as const };
	}

	const clickId = await ctx.db.insert("visitorClicks", {
		requestId: input.requestId,
		visitorId: input.visitorId,
		textId: input.textId,
		sentenceId: input.sentenceId,
		segmentId: input.segmentId,
		...(input.attestationId ? { attestationId: input.attestationId } : {}),
		clickedAt: Date.now(),
	});
	return { clickId, created: true as const };
}
