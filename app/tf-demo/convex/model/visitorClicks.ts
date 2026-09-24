import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/** Encounters one transaction advances before it hands the rest on. */
const ENCOUNTER_ADVANCE_BATCH = 256;

type VisitorEncounterContext = MutationCtx | QueryCtx;

async function findVisitorEncounter(
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

/**
 * The Segments of one Sentence this Visitor has encountered, read as one
 * index range. A Visitor holds at most one Visitor Encounter per Segment, so
 * the range is bounded by the Sentence's Segments.
 */
export async function loadEncounteredSegmentIds(
	ctx: VisitorEncounterContext,
	input: {
		visitorId: string;
		sentenceId: Id<"sentences">;
	},
) {
	const encounters = await ctx.db
		.query("visitorClicks")
		.withIndex("by_visitor_id_and_sentence_id", (q) =>
			q
				.eq("visitorId", input.visitorId)
				.eq("sentenceId", input.sentenceId),
		)
		.collect();
	return new Set(encounters.map(({ segmentId }) => segmentId));
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
		if (input.attestationId && !existing.attestationId) {
			await ctx.db.patch(
				existing._id,
				await encounteredOccurrence(ctx, input.attestationId),
			);
		}
		return { clickId: existing._id, created: false as const };
	}

	const clickId = await ctx.db.insert("visitorClicks", {
		requestId: input.requestId,
		visitorId: input.visitorId,
		textId: input.textId,
		sentenceId: input.sentenceId,
		segmentId: input.segmentId,
		...(input.attestationId
			? await encounteredOccurrence(ctx, input.attestationId)
			: {}),
		clickedAt: Date.now(),
	});
	return { clickId, created: true as const };
}

/**
 * The occurrence an Encounter advances to, with its Reading beside it so a
 * Reading Note can page this Visitor's Source Contexts by Reading.
 */
async function encounteredOccurrence(
	ctx: MutationCtx,
	attestationId: Id<"attestations">,
) {
	const attestation = await ctx.db.get(attestationId);
	if (!attestation) {
		throw new Error("Visitor Encounter refers to a missing Attestation.");
	}
	return { attestationId, readingId: attestation.readingId };
}

/**
 * Advances every Visitor's Encounter of an occurrence's member Segments to
 * that occurrence. An occurrence is encountered through any of its members,
 * whoever committed it, so each such Visitor finds it among their Source
 * Contexts. A commit with more Encounters than one batch hands the rest to a
 * scheduled continuation.
 */
export async function advanceMemberEncounters(
	ctx: MutationCtx,
	input: {
		readonly segmentIds: readonly Id<"segments">[];
		readonly attestationId: Id<"attestations">;
	},
): Promise<void> {
	const occurrence = await encounteredOccurrence(ctx, input.attestationId);
	let budget = ENCOUNTER_ADVANCE_BATCH;
	for (const segmentId of input.segmentIds) {
		const unadvanced = await ctx.db
			.query("visitorClicks")
			.withIndex("by_segment_id_and_attestation_id", (q) =>
				q.eq("segmentId", segmentId).eq("attestationId", undefined),
			)
			.take(budget);
		await Promise.all(
			unadvanced.map((click) => ctx.db.patch(click._id, occurrence)),
		);
		budget -= unadvanced.length;
		if (budget === 0) {
			await ctx.scheduler.runAfter(
				0,
				internal.visitorEncounters.advanceMemberEncounters,
				{
					segmentIds: [...input.segmentIds],
					attestationId: input.attestationId,
				},
			);
			return;
		}
	}
}
