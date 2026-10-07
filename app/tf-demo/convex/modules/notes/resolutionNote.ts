import { type Infer, v } from "convex/values";
import type {
	ResolutionGrammarProjection,
	ResolutionReadingProjection,
} from "../../../server/resolutionSessionProjection";
import { type StoredUnit, unitsByMember } from "../../../server/storedSegments";
import { textTitle } from "../../../shared/text-title";
import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { loadCompleteOccurrenceMembers } from "../../model/occurrenceAttestations";
import { MAX_IDENTIFIER_LENGTH } from "../../model/resolutionSessions";
import { loadStoredSegments } from "../../model/storedSegments";
import {
	activeResolutionActivityValidator,
	resolutionFailureCodeValidator,
	resolutionGrammarProjectionValidator,
	resolutionProgressValidator,
	resolutionReadingProjectionValidator,
	segmentKindValidator,
	storedUnitValidator,
} from "../../model/validators";

/**
 * The Resolution Note: the read-side projection of a Resolution Session that
 * the client renders while a click resolves, and the canonical occurrence a
 * committed one opens. It writes nothing; every Session transition stays in
 * `model/resolutionSessions.ts`.
 */

type ResolutionSession = Doc<"resolutionSessions">;

const canonicalOccurrenceValidator = v.object({
	readingId: v.id("readings"),
	lemmaId: v.id("lemmas"),
	surfaceId: v.id("surfaces"),
	surfaceLanguage: v.literal("de"),
	normalizedSurface: v.string(),
	attestationId: v.id("attestations"),
});

/**
 * A Resolution Note's lifecycle: the Session's lifecycle with each Terminal
 * outcome carrying what the client shows for it.
 */
const resolutionNoteLifecycleValidator = v.union(
	v.object({
		state: v.literal("Active"),
		progress: resolutionProgressValidator,
		activity: activeResolutionActivityValidator,
	}),
	v.object({
		state: v.literal("Terminal"),
		progress: v.literal("Committing"),
		outcome: v.literal("Complete"),
		attestationId: v.id("attestations"),
		target: v.union(
			v.object({
				kind: v.literal("Reading"),
				readingId: v.id("readings"),
			}),
			v.object({
				kind: v.literal("Attestation"),
				attestationId: v.id("attestations"),
			}),
		),
		canonical: v.optional(canonicalOccurrenceValidator),
	}),
	v.object({
		state: v.literal("Terminal"),
		progress: resolutionProgressValidator,
		outcome: v.literal("Unresolved"),
	}),
	v.object({
		state: v.literal("Terminal"),
		progress: resolutionProgressValidator,
		outcome: v.literal("PermanentFailure"),
		failureCode: resolutionFailureCodeValidator,
		diagnosticId: v.string(),
		message: v.string(),
	}),
);

const resolutionRouteValidator = v.object({
	textId: v.id("texts"),
	sentenceId: v.id("sentences"),
	stitchedText: v.string(),
	clickedSegmentIndex: v.number(),
	selectedSegment: v.string(),
});

/**
 * The clicked Sentence's stored Segments and the stored indices of the
 * occurrence's members, so the pending Note quotes what the stored Note will,
 * and its Text's title, so Go to source from that quote names the Text.
 */
const resolutionSourceValidator = v.object({
	segments: v.array(
		v.object({ kind: segmentKindValidator, text: v.string() }),
	),
	memberSegmentIndices: v.array(v.number()),
	textTitle: v.string(),
});
type ResolutionSource = Infer<typeof resolutionSourceValidator>;

export const resolutionNoteValidator = v.object({
	kind: v.literal("ResolutionNote"),
	target: v.object({
		kind: v.literal("Resolution"),
		requestId: v.string(),
	}),
	lifecycle: resolutionNoteLifecycleValidator,
	route: resolutionRouteValidator,
	source: resolutionSourceValidator,
	/**
	 * The biggest unit intake stored at the clicked Segment: what a click
	 * selects, and what its card shows while resolution is rebuilt (#848).
	 */
	unit: v.optional(storedUnitValidator),
	grammar: v.optional(resolutionGrammarProjectionValidator),
	reading: v.optional(resolutionReadingProjectionValidator),
	updatedAt: v.number(),
});

/**
 * The validator stores Family and Kind as strings; the Note keeps the
 * per-Kind projections the Session was written from.
 */
export type ResolutionNote = Omit<
	Infer<typeof resolutionNoteValidator>,
	"grammar" | "reading"
> & {
	grammar?: ResolutionGrammarProjection;
	reading?: ResolutionReadingProjection;
};
export type ResolutionNoteLifecycle = Infer<
	typeof resolutionNoteLifecycleValidator
>;

export async function loadResolutionNote(
	ctx: QueryCtx,
	requestId: string,
): Promise<ResolutionNote | null> {
	if (requestId.length === 0 || requestId.length > MAX_IDENTIFIER_LENGTH) {
		return null;
	}
	const session = await ctx.db
		.query("resolutionSessions")
		.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
		.unique();
	if (!session) return null;
	const [sentence, segments, text] = await Promise.all([
		ctx.db.get(session.sentenceId),
		loadStoredSegments(ctx, session.sentenceId),
		ctx.db.get(session.route.textId),
	]);
	const unit = unitsByMember(sentence?.units).get(
		session.clickedSegmentIndex,
	);
	return {
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId },
		lifecycle: await resolutionNoteLifecycle(ctx, session),
		route: session.route,
		source: await resolutionSource(ctx, session, segments, unit, text),
		...(unit ? { unit } : {}),
		// The Session stores what projectResolutionGrammar and
		// projectResolutionReading produced.
		...(session.grammar
			? { grammar: session.grammar as ResolutionGrammarProjection }
			: {}),
		...(session.reading
			? { reading: session.reading as ResolutionReadingProjection }
			: {}),
		updatedAt: session.updatedAt,
	};
}

/**
 * The members are the committed ones once the occurrence exists, the ones
 * Grammar chose while the run is pending, and before that the clicked
 * Segment's stored unit, or the clicked Segment alone without one.
 */
async function resolutionSource(
	ctx: QueryCtx,
	session: ResolutionSession,
	segments: readonly Doc<"segments">[],
	unit: StoredUnit | undefined,
	text: Doc<"texts"> | null,
): Promise<ResolutionSource> {
	const committed = session.attestationId
		? await loadCompleteOccurrenceMembers(ctx, session.attestationId)
		: null;
	const encounterMembers =
		session.grammaticalCheckpoint?.encounter.target.memberSegmentIndices;
	let memberSegmentIndices = unit
		? [...unit.segments]
		: [session.clickedSegmentIndex];
	if (committed) {
		memberSegmentIndices = committed.memberSegmentIndices;
	} else if (encounterMembers) {
		// Encounter indices are stored indices: both hold a fused word's pieces.
		memberSegmentIndices = [...encounterMembers];
	}
	return {
		segments: segments.map(({ kind, text }) => ({ kind, text })),
		memberSegmentIndices,
		textTitle: textTitle(
			text ?? { sourceText: session.route.stitchedText },
		),
	};
}

async function resolutionNoteLifecycle(
	ctx: QueryCtx,
	session: ResolutionSession,
): Promise<ResolutionNoteLifecycle> {
	const { lifecycle } = session;
	if (lifecycle.state === "Active") return lifecycle;
	switch (lifecycle.outcome) {
		case "Complete": {
			const { readingId, attestationId } = session;
			if (!readingId || !attestationId)
				throw new Error(
					"A complete Resolution Session must name its Reading and Attestation.",
				);
			const canonical = await loadCanonicalOccurrence(ctx, attestationId);
			return {
				state: "Terminal",
				progress: "Committing",
				outcome: "Complete",
				attestationId,
				target: occurrenceNoteTarget(
					Boolean(session.routeNoteRequested),
					readingId,
					attestationId,
				),
				...(canonical ? { canonical } : {}),
			};
		}
		case "Unresolved":
			return {
				state: "Terminal",
				progress: lifecycle.progress,
				outcome: "Unresolved",
			};
		case "PermanentFailure":
			return {
				state: "Terminal",
				progress: lifecycle.progress,
				outcome: "PermanentFailure",
				failureCode: session.failureCode ?? "Internal",
				diagnosticId: session.diagnosticId ?? session.requestId,
				message:
					session.failureMessage ??
					"Resolution could not be completed.",
			};
	}
}

/**
 * The canonical Reading, Lemma and Surface a committed occurrence opens, or
 * null when its rows are missing or disagree. Segment Selection's fast path
 * and the Resolution Note both read it.
 */
export async function loadCanonicalOccurrence(
	ctx: QueryCtx,
	attestationId: Id<"attestations">,
) {
	const attestation = await ctx.db.get(attestationId);
	if (!attestation) return null;
	const [reading, surface] = await Promise.all([
		ctx.db.get(attestation.readingId),
		ctx.db.get(attestation.surfaceId),
	]);
	if (
		!reading ||
		!surface ||
		surface.lemmaId !== reading.lemmaId ||
		surface.language !== "de"
	)
		return null;
	return {
		readingId: reading._id,
		lemmaId: reading.lemmaId,
		surfaceId: surface._id,
		surfaceLanguage: surface.language,
		normalizedSurface: surface.normalizedSurface,
		attestationId,
	};
}

/** The Note a committed occurrence opens: its Attestation when a route Note was requested. */
export function occurrenceNoteTarget(
	routeNoteRequested: boolean,
	readingId: Id<"readings">,
	attestationId: Id<"attestations">,
) {
	return routeNoteRequested
		? { kind: "Attestation" as const, attestationId }
		: { kind: "Reading" as const, readingId };
}
