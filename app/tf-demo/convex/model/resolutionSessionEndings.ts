import { safeFailureMessage } from "../../server/resolutionFailure";
import type { ResolutionFailureCode } from "../../server/resolutionLifecycle";
import {
	projectResolutionGrammar,
	projectResolutionReading,
} from "../../server/resolutionSessionProjection";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { scheduleKnowledgeGeneration } from "./knowledgeScheduling";
import { reconstructReusableAttestation } from "./resolutionLookup";
import { finishSegmentResolution } from "./resolutionSegmentState";
import type { ResolutionSession } from "./resolutionSessionRow";
import { ensureVisitorEncounter } from "./visitorEncounters";

/*
 * How a Resolution Session ends: Complete with a committed occurrence, or
 * Unresolved or PermanentFailure without one. Whichever comes first, a
 * committed occurrence wins (ADR-0004).
 */

export type CommittedOccurrence = Awaited<
	ReturnType<typeof completeResolutionSession>
>;

/**
 * Completes `session` with a committed occurrence: the Visitor's Encounter
 * advances to it (ADR-0002), the session converges on its projections, and
 * the occurrence's Reading is asked for Knowledge.
 */
export async function completeResolutionSession(
	ctx: MutationCtx,
	session: ResolutionSession,
	attestationId: Id<"attestations">,
) {
	const sentence = await ctx.db.get(session.sentenceId);
	if (!sentence) throw new Error("The session's Sentence does not exist.");
	const { encounterId } = await ensureVisitorEncounter(ctx, {
		requestId: session.requestId,
		visitorId: session.visitorId,
		scrollId: sentence.scrollId,
		sentenceId: session.sentenceId,
		segmentId: session.segmentId,
		attestationId,
	});
	const { readingId, value: occurrence } =
		await reconstructReusableAttestation(ctx, attestationId);
	await ctx.db.patch(session._id, {
		lifecycle: {
			state: "Terminal",
			progress: "Committing",
			outcome: "Complete",
		},
		grammar: projectResolutionGrammar(occurrence.grammatical),
		reading: projectResolutionReading(occurrence.reading),
		readingId,
		attestationId,
		failureMessage: undefined,
		failureCode: undefined,
		diagnosticId: undefined,
		updatedAt: Date.now(),
	});
	// Committed Attestation Membership replaces and clears the shared state.
	const segment = await ctx.db.get(session.segmentId);
	if (segment?.resolutionState) {
		await ctx.db.patch(session.segmentId, { resolutionState: undefined });
	}
	await scheduleKnowledgeGeneration(ctx, {
		attemptKey: session.requestId,
		visitorId: session.visitorId,
		readingId,
		attestationId,
	});
	return { encounterId, readingId, attestationId, occurrence };
}

export type ResolutionSessionEnding =
	| { readonly kind: "Unresolved" }
	| {
			readonly kind: "PermanentFailure";
			readonly message: string;
			readonly failureCode?: ResolutionFailureCode;
			readonly diagnosticId?: string;
	  };

/**
 * Ends `session` without an occurrence of its own. When another session has
 * already committed the clicked Segment, that occurrence wins instead: a
 * later terminal write never replaces it (ADR-0004).
 */
export async function settleResolutionSession(
	ctx: MutationCtx,
	session: ResolutionSession,
	ending: ResolutionSessionEnding,
): Promise<
	| ({ readonly kind: "Complete" } & CommittedOccurrence)
	| { readonly kind: ResolutionSessionEnding["kind"] }
> {
	const committed = (await ctx.db.get(session.segmentId))
		?.attestationMembership?.attestationId;
	if (committed) {
		return {
			kind: "Complete",
			...(await completeResolutionSession(ctx, session, committed)),
		};
	}
	const progress = session.lifecycle.progress;
	if (ending.kind === "Unresolved") {
		await ctx.db.patch(session._id, {
			lifecycle: { state: "Terminal", progress, outcome: "Unresolved" },
			failureMessage: undefined,
			updatedAt: Date.now(),
		});
	} else {
		await ctx.db.patch(session._id, {
			lifecycle: {
				state: "Terminal",
				progress,
				outcome: "PermanentFailure",
			},
			failureCode: ending.failureCode ?? "Internal",
			diagnosticId: ending.diagnosticId ?? crypto.randomUUID(),
			failureMessage: safeFailureMessage(ending.message),
			updatedAt: Date.now(),
		});
	}
	await finishSegmentResolution(ctx, session.segmentId, ending.kind);
	return { kind: ending.kind };
}
