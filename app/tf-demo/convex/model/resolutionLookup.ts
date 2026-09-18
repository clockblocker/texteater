import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { loadOccurrenceAttestation } from "./occurrenceAttestations";

const MAX_SEGMENTS_PER_SENTENCE = 512;

export function assertNonEmpty(value: string, name: string): void {
	if (value.trim().length === 0)
		throw new Error(`${name} must not be empty.`);
}

export function assertIndex(value: number, name: string): void {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new Error(`${name} must be a non-negative safe integer.`);
	}
}

export function assertVisitorInput(visitorId: string, requestId: string): void {
	assertNonEmpty(visitorId, "visitorId");
	assertNonEmpty(requestId, "requestId");
	if (visitorId.length > 200 || requestId.length > 200) {
		throw new Error(
			"Visitor and request identifiers are limited to 200 characters.",
		);
	}
}

export async function requireClickableSegment(
	ctx: MutationCtx | QueryCtx,
	sentenceId: Id<"sentences">,
	clickedSegmentIndex: number,
) {
	assertIndex(clickedSegmentIndex, "clickedSegmentIndex");
	const sentence = await ctx.db.get(sentenceId);
	if (!sentence) throw new Error("Sentence does not exist.");
	const segment = await ctx.db
		.query("segments")
		.withIndex("by_sentence_id_and_index", (q) =>
			q.eq("sentenceId", sentenceId).eq("index", clickedSegmentIndex),
		)
		.unique();
	if (segment?.kind !== "ResolvableText") {
		throw new Error("Only a ResolvableText Segment can be clicked.");
	}
	return { sentence, segment };
}

export async function reconstructReusableAttestation(
	ctx: MutationCtx | QueryCtx,
	attestationId: Id<"attestations">,
	_clickedSegmentIndex: number,
) {
	const occurrence = await loadOccurrenceAttestation(ctx, attestationId);
	if (!occurrence) {
		throw new Error("Click refers to an invalid Attestation.");
	}
	return {
		sentenceId: occurrence.sentence._id,
		readingId: occurrence.reading._id,
		value: {
			attestationId,
			grammatical: {
				decision: "Resolved" as const,
				language: "de" as const,
				encounter: occurrence.encounter,
				attestation: occurrence.publicAttestation,
			},
			reading: occurrence.publicReading,
		},
	};
}

export function assertMatchingRetry(
	click: {
		visitorId: string;
		segmentId: Id<"segments">;
	},
	args: {
		visitorId: string;
		segmentId: Id<"segments">;
	},
): void {
	if (
		click.visitorId !== args.visitorId ||
		click.segmentId !== args.segmentId
	) {
		throw new Error("requestId was already used for a different click.");
	}
}

export async function loadSentenceForResolution(
	ctx: QueryCtx,
	{ sentenceId }: { sentenceId: Id<"sentences"> },
) {
	const sentence = await ctx.db.get(sentenceId);
	if (!sentence) return null;
	const segments = await ctx.db
		.query("segments")
		.withIndex("by_sentence_id_and_index", (q) =>
			q.eq("sentenceId", sentenceId),
		)
		.take(MAX_SEGMENTS_PER_SENTENCE);
	return {
		sentenceId,
		textId: sentence.textId,
		segmentedSentenceId: sentence.segmentedSentenceId,
		language: sentence.language,
		stitchedText: sentence.stitchedText,
		segments: segments.map(({ index, kind, text }) => ({
			index,
			kind,
			text,
		})),
	};
}

export async function findAttestationForSegmentValue(
	ctx: QueryCtx,
	{
		sentenceId,
		clickedSegmentIndex,
	}: { sentenceId: Id<"sentences">; clickedSegmentIndex: number },
) {
	assertIndex(clickedSegmentIndex, "clickedSegmentIndex");
	const { segment } = await requireClickableSegment(
		ctx,
		sentenceId,
		clickedSegmentIndex,
	);
	const attestationId = segment.attestationMembership?.attestationId;
	if (!attestationId) return null;
	const reusable = await reconstructReusableAttestation(
		ctx,
		attestationId,
		clickedSegmentIndex,
	);
	return reusable.sentenceId === sentenceId ? reusable.value : null;
}

export async function findClickResult(
	ctx: QueryCtx,
	args: {
		requestId: string;
		visitorId: string;
		sentenceId: Id<"sentences">;
		clickedSegmentIndex: number;
	},
) {
	assertVisitorInput(args.visitorId, args.requestId);
	const { segment } = await requireClickableSegment(
		ctx,
		args.sentenceId,
		args.clickedSegmentIndex,
	);
	const click = await ctx.db
		.query("visitorClicks")
		.withIndex("by_request_id", (q) => q.eq("requestId", args.requestId))
		.unique();
	if (!click) return null;
	assertMatchingRetry(click, {
		visitorId: args.visitorId,
		segmentId: segment._id,
	});
	if (click.attestationId) {
		const reusable = await reconstructReusableAttestation(
			ctx,
			click.attestationId,
			args.clickedSegmentIndex,
		);
		return {
			clickId: click._id,
			status: "Resolved" as const,
			readingId: reusable.readingId,
			occurrence: reusable.value,
		};
	}

	const session = await ctx.db
		.query("resolutionSessions")
		.withIndex("by_request_id", (q) => q.eq("requestId", args.requestId))
		.unique();
	// Selecting a Segment records the Visitor Encounter before resolution starts.
	if (
		session &&
		(session.lifecycle.state !== "Terminal" ||
			session.lifecycle.outcome !== "Unresolved")
	)
		return null;
	return { clickId: click._id, status: "Unresolved" as const };
}
