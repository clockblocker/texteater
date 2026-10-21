import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import {
	occurrenceCommitArgs,
	openOccurrenceCommit,
	reusedCommit,
} from "./model/occurrenceCommit";
import {
	advanceResolutionSession,
	completeResolutionSession,
	recordResolutionRunSuccess,
	settleResolutionSession,
} from "./model/resolutionSessions";
import {
	commitResolvedClick,
	resolvedClickCommitArgs,
} from "./model/resolvedClickCommit";
import {
	languageValidator,
	readingCheckpointValidator,
	resolutionGenerationEventValidator,
	resolutionPhaseValidator,
	resolutionReadingProjectionValidator,
	resolvedClickCommitValidator,
	reusedResolvedClickCommitValidator,
	sentenceInputValidator,
	storedSegmentInputValidator,
	storedUnitValidator,
	unresolvedClickPersistenceResultValidator,
} from "./model/validators";
import { ensureVisitorEncounter } from "./model/visitorEncounters";
import { storeResegmentation } from "./modules/scroll/resegmentation";
import {
	findAnalyzedSubmission,
	findStoredExtractedText,
	persistSubmittedScroll as persistSubmittedScrollImplementation,
} from "./modules/scroll/submission";

export const persistSubmittedScroll = internalMutation({
	args: {
		targetLanguage: v.optional(languageValidator),
		submissionKey: v.string(),
		sourceText: v.string(),
		/** The Scroll's Extracted Text, Dumgen's `Scroll`, as intake read it. */
		extractedText: v.optional(v.any()),
		sentences: v.array(sentenceInputValidator),
		/** A new Scroll from a link: its title, page, Original and owner. */
		link: v.optional(
			v.object({
				title: v.optional(v.string()),
				url: v.string(),
				original: v.id("_storage"),
				owner: v.string(),
			}),
		),
	},
	returns: v.object({
		scrollId: v.id("scrolls"),
		sentenceIds: v.array(v.id("sentences")),
		deduplicated: v.boolean(),
	}),
	handler: persistSubmittedScrollImplementation,
});

/** The Extracted Text a stored Scroll re-runs from, unchecked, if any. */
export const storedExtractedText = internalQuery({
	args: { submissionKey: v.string(), sourceText: v.string() },
	returns: v.any(),
	handler: findStoredExtractedText,
});

/** The stored Scroll a re-submission would only reproduce, if any. */
export const analyzedSubmission = internalQuery({
	args: {
		submissionKey: v.string(),
		sourceText: v.string(),
		targetLanguage: v.optional(languageValidator),
	},
	returns: v.union(v.null(), v.id("scrolls")),
	handler: findAnalyzedSubmission,
});

/**
 * Stores what a click's re-segmentation of a failed Sentence found (#861);
 * `storeResegmentation` holds the rules.
 */
export const storeResegmentedSentence = internalMutation({
	args: {
		...occurrenceCommitArgs,
		segments: v.array(storedSegmentInputValidator),
		units: v.array(storedUnitValidator),
	},
	returns: v.object({ clickedSegmentIndex: v.number() }),
	handler: storeResegmentation,
});

export const persistUnresolvedClick = internalMutation({
	args: occurrenceCommitArgs,
	returns: unresolvedClickPersistenceResultValidator,
	handler: async (ctx, args) => {
		const { session, sentence, segment, existing } =
			await openOccurrenceCommit(ctx, args);
		// Segment Selection recorded the Visitor Encounter under this
		// requestId, so finding it is not yet a retry.
		const encounterId = existing
			? existing._id
			: (
					await ensureVisitorEncounter(ctx, {
						requestId: args.requestId,
						visitorId: args.visitorId,
						scrollId: sentence.scrollId,
						sentenceId: sentence._id,
						segmentId: segment._id,
					})
				).encounterId;
		const settled = await settleResolutionSession(ctx, session, {
			kind: "Unresolved",
		});
		return settled.kind === "Complete"
			? reusedCommit(settled, existing)
			: {
					status: "Unresolved" as const,
					encounterId,
					deduplicated: existing !== null,
				};
	},
});

export const persistReusedResolvedClick = internalMutation({
	args: { ...occurrenceCommitArgs, attestationId: v.id("attestations") },
	returns: reusedResolvedClickCommitValidator,
	handler: async (ctx, args) => {
		const { session, segment, existing } = await openOccurrenceCommit(
			ctx,
			args,
		);
		if (
			segment.attestationMembership?.attestationId !== args.attestationId
		) {
			throw new Error(
				"Clicked Segment is not a member of the Attestation.",
			);
		}
		if (
			existing?.attestationId &&
			existing.attestationId !== args.attestationId
		) {
			throw new Error("requestId already records a different result.");
		}
		const { occurrence: _occurrence, ...commit } = reusedCommit(
			await completeResolutionSession(ctx, session, args.attestationId),
			existing,
		);
		return commit;
	},
});

/**
 * Commits a resolved click and, in the same transaction, saves what the
 * run would otherwise send as two more mutations: the ReadingAvailable
 * progress first, so a conflict still ends the session showing its
 * Reading, and the run's success record last, unless the New is refused as
 * stale and the click judges again.
 */
export const persistResolvedClick = internalMutation({
	args: {
		...resolvedClickCommitArgs,
		/** The Reading this run resolved; absent when a checkpoint holds it. */
		readingAvailable: v.optional(
			v.object({
				reading: resolutionReadingProjectionValidator,
				readingCheckpoint: readingCheckpointValidator,
			}),
		),
		/** The run's success record, written once the commit stands. */
		succeeded: v.optional(
			v.object({
				phase: resolutionPhaseValidator,
				generationEvents: v.array(resolutionGenerationEventValidator),
			}),
		),
	},
	returns: resolvedClickCommitValidator,
	handler: async (ctx, { readingAvailable, succeeded, ...args }) => {
		if (readingAvailable)
			await advanceResolutionSession(ctx, {
				guard: args.sessionGuard,
				progress: "ReadingAvailable",
				...readingAvailable,
			});
		const committed = await commitResolvedClick(ctx, args);
		if (succeeded && committed.status !== "StaleReading")
			await recordResolutionRunSuccess(ctx, {
				guard: args.sessionGuard,
				...succeeded,
			});
		return committed;
	},
});
