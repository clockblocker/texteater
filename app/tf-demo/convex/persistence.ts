import { type Infer, v } from "convex/values";
import type * as Dumling from "dumling/types";
import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import {
	parseGermanAttestation,
	parseGermanReading,
} from "../server/operationalParsing";
import type { Id } from "./_generated/dataModel";
import {
	internalMutation,
	type MutationCtx,
	type QueryCtx,
} from "./_generated/server";
import {
	createDumdictTransaction,
	type DumdictTransactionOutcome,
} from "./dumdictTransaction";
import {
	assertIndex,
	assertMatchingRetry,
	assertNonEmpty,
	assertVisitorInput,
	requireClickableSegment,
} from "./model/resolutionLookup";
import {
	type CommittedOccurrence,
	completeResolutionSession,
	requireCommittingSession,
	settleResolutionSession,
} from "./model/resolutionSessions";
import {
	occurrenceAttestationInputValidator,
	readingDecisionValidator,
	readingValueValidator,
	resolutionSessionGuardValidator,
	resolvedClickCommitValidator,
	reusedResolvedClickCommitValidator,
	sentenceInputValidator,
	unresolvedClickPersistenceResultValidator,
} from "./model/validators";
import { ensureVisitorEncounter } from "./model/visitorClicks";
import { persistSubmittedText as persistSubmittedTextImplementation } from "./modules/text/submission";

async function findClickByRequestId(
	ctx: MutationCtx | QueryCtx,
	requestId: string,
) {
	return ctx.db
		.query("visitorClicks")
		.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
		.unique();
}

/** The commit result for a Segment another occurrence already owns. */
function reusedCommit(
	committed: CommittedOccurrence,
	existing: { readonly attestationId?: Id<"attestations"> } | null,
) {
	return {
		status: "Reused" as const,
		clickId: committed.clickId,
		readingId: committed.readingId,
		attestationId: committed.attestationId,
		deduplicated: existing?.attestationId === committed.attestationId,
		occurrence: committed.occurrence,
	};
}

function emptyNote() {
	return {
		attestedTranslations: [] as string[],
		attestations: [] as string[],
		notes: "",
	};
}

/**
 * Plans the dictionary side of a resolved occurrence inside this transaction.
 * A New Reading becomes a Reading Note owning the attested Surface; a reused
 * Reading only gains the Surface if the dictionary does not own it yet.
 */
async function planAndCommitDictionary(
	ctx: MutationCtx,
	args: {
		readonly reading: Infer<typeof readingValueValidator>;
		readonly readingDecision: Infer<typeof readingDecisionValidator>;
		readonly occurrence: Infer<typeof occurrenceAttestationInputValidator>;
	},
): Promise<DumdictTransactionOutcome> {
	const dictionary = createDumdictTransaction(ctx);
	const reading = parseGermanReading(args.reading);
	const ownedSurface = {
		surface: parseGermanAttestation(args.occurrence.attestation).surface,
		note: emptyNote(),
	};
	return args.readingDecision === "Reuse"
		? dictionary.ensureOwnedSurface({ reading, ownedSurface })
		: dictionary.addNewNote({
				draft: {
					reading,
					note: emptyNote(),
					ownedSurfaces: [ownedSurface],
				},
			});
}

export const persistSubmittedText = internalMutation({
	args: {
		submissionKey: v.string(),
		sourceText: v.string(),
		sentences: v.array(sentenceInputValidator),
	},
	returns: v.object({
		textId: v.id("texts"),
		sentenceIds: v.array(v.id("sentences")),
		deduplicated: v.boolean(),
	}),
	handler: persistSubmittedTextImplementation,
});

export const persistUnresolvedClick = internalMutation({
	args: {
		requestId: v.string(),
		visitorId: v.string(),
		sentenceId: v.id("sentences"),
		clickedSegmentIndex: v.number(),
		sessionGuard: resolutionSessionGuardValidator,
	},
	returns: unresolvedClickPersistenceResultValidator,
	handler: async (ctx, args) => {
		assertVisitorInput(args.visitorId, args.requestId);
		const [session, { sentence, segment }, existing] = await Promise.all([
			requireCommittingSession(ctx, args.sessionGuard, args),
			requireClickableSegment(
				ctx,
				args.sentenceId,
				args.clickedSegmentIndex,
			),
			findClickByRequestId(ctx, args.requestId),
		]);
		if (existing) {
			assertMatchingRetry(existing, {
				visitorId: args.visitorId,
				segmentId: segment._id,
			});
		}
		// Segment Selection recorded the Visitor Encounter under this
		// requestId, so finding it is not yet a retry.
		const clickId = existing
			? existing._id
			: (
					await ensureVisitorEncounter(ctx, {
						requestId: args.requestId,
						visitorId: args.visitorId,
						textId: sentence.textId,
						sentenceId: sentence._id,
						segmentId: segment._id,
					})
				).clickId;
		const settled = await settleResolutionSession(ctx, session, {
			kind: "Unresolved",
		});
		return settled.kind === "Complete"
			? reusedCommit(settled, existing)
			: {
					status: "Unresolved" as const,
					clickId,
					deduplicated: existing !== null,
				};
	},
});

export const persistReusedResolvedClick = internalMutation({
	args: {
		requestId: v.string(),
		visitorId: v.string(),
		sentenceId: v.id("sentences"),
		clickedSegmentIndex: v.number(),
		attestationId: v.id("attestations"),
		sessionGuard: resolutionSessionGuardValidator,
	},
	returns: reusedResolvedClickCommitValidator,
	handler: async (ctx, args) => {
		assertVisitorInput(args.visitorId, args.requestId);
		const session = await requireCommittingSession(
			ctx,
			args.sessionGuard,
			args,
		);
		const { segment } = await requireClickableSegment(
			ctx,
			args.sentenceId,
			args.clickedSegmentIndex,
		);
		if (
			segment.attestationMembership?.attestationId !== args.attestationId
		) {
			throw new Error(
				"Clicked Segment is not a member of the Attestation.",
			);
		}
		const existing = await findClickByRequestId(ctx, args.requestId);
		if (existing) {
			assertMatchingRetry(existing, {
				visitorId: args.visitorId,
				segmentId: segment._id,
			});
			if (
				existing.attestationId &&
				existing.attestationId !== args.attestationId
			) {
				throw new Error(
					"requestId already records a different result.",
				);
			}
		}
		const committed = await completeResolutionSession(
			ctx,
			session,
			args.attestationId,
		);
		return {
			status: "Reused" as const,
			clickId: committed.clickId,
			readingId: committed.readingId,
			attestationId: committed.attestationId,
			deduplicated: existing?.attestationId === args.attestationId,
		};
	},
});

export const persistResolvedClick = internalMutation({
	args: {
		knowledgeDraftJson: v.optional(v.string()),
		requestId: v.string(),
		visitorId: v.string(),
		sentenceId: v.id("sentences"),
		clickedSegmentIndex: v.number(),
		occurrence: occurrenceAttestationInputValidator,
		reading: readingValueValidator,
		readingKey: v.string(),
		readingDecision: readingDecisionValidator,
		sessionGuard: resolutionSessionGuardValidator,
	},
	returns: resolvedClickCommitValidator,
	handler: async (ctx, args) => {
		assertVisitorInput(args.visitorId, args.requestId);
		const session = await requireCommittingSession(
			ctx,
			args.sessionGuard,
			args,
		);
		assertNonEmpty(args.readingKey, "readingKey");
		const { segment: clickedSegment } = await requireClickableSegment(
			ctx,
			args.sentenceId,
			args.clickedSegmentIndex,
		);
		const existingClick = await findClickByRequestId(ctx, args.requestId);
		if (existingClick) {
			assertMatchingRetry(existingClick, {
				visitorId: args.visitorId,
				segmentId: clickedSegment._id,
			});
		}
		// Segment Selection recorded the Visitor Encounter before the run, so
		// an unresolved one is this session's own. A committed occurrence on
		// the clicked Segment wins over this proposal (ADR-0004).
		const committedAttestationId =
			existingClick?.attestationId ??
			clickedSegment.attestationMembership?.attestationId;
		if (committedAttestationId) {
			return reusedCommit(
				await completeResolutionSession(
					ctx,
					session,
					committedAttestationId,
				),
				existingClick,
			);
		}
		if (
			readingIdentityKey(args.reading as Dumling.Reading<"de">) !==
			args.readingKey
		) {
			throw new Error(
				"readingKey does not match the selected Reading identity.",
			);
		}
		if (
			lemmaIdentityKey(args.reading.lemma) !== args.occurrence.lemmaKey ||
			lemmaIdentityKey(args.occurrence.attestation.surface.lemma) !==
				args.occurrence.lemmaKey
		) {
			throw new Error(
				"Attestation Surface and Reading must share the proposed Lemma.",
			);
		}

		const memberIndices = args.occurrence.memberSegmentIndices;
		const attestedMembers = args.occurrence.attestation.members;
		if (memberIndices.length === 0) {
			throw new Error(
				"An Attestation needs at least one member Segment.",
			);
		}
		if (memberIndices.length !== attestedMembers.length) {
			throw new Error(
				"Attestation members must match member Segment indices.",
			);
		}
		let previous = -1;
		for (const index of memberIndices) {
			assertIndex(index, "memberSegmentIndex");
			if (index <= previous) {
				throw new Error(
					"Attestation member Segment indices must be ordered and unique.",
				);
			}
			previous = index;
		}
		const queriedMembers = await Promise.all(
			memberIndices.map((index) =>
				ctx.db
					.query("segments")
					.withIndex("by_sentence_id_and_index", (q) =>
						q.eq("sentenceId", args.sentenceId).eq("index", index),
					)
					.unique(),
			),
		);
		const members = queriedMembers.map((member, memberPosition) => {
			if (member?.kind !== "ResolvableText") {
				throw new Error(
					"Attestation members must refer to ResolvableText Segments.",
				);
			}
			// A fusion component is attested as the word it stands for.
			if (
				(member.surface ?? member.text) !==
				attestedMembers[memberPosition]?.attested
			) {
				throw new Error(
					"Attestation member text must equal its Segment text.",
				);
			}
			return member;
		});
		if (!memberIndices.includes(args.clickedSegmentIndex)) {
			throw new Error(
				"The Attestation must contain the clicked Segment.",
			);
		}
		const conflictingAttestationIds = [
			...new Set(
				members.flatMap((member) =>
					member.attestationMembership
						? [member.attestationMembership.attestationId]
						: [],
				),
			),
		];
		if (conflictingAttestationIds.length > 0) {
			await settleResolutionSession(ctx, session, {
				kind: "PermanentFailure",
				message:
					"This occurrence overlaps a different saved occurrence.",
			});
			return {
				status: "MembershipConflict" as const,
				code: "partialOverlap" as const,
				message:
					"Proposed Attestation members partially overlap committed membership.",
				conflictingAttestationIds: conflictingAttestationIds.sort(),
			};
		}

		// The dictionary plan is built and applied here, against the state this
		// transaction reads, so the occurrence never carries a stale plan.
		const dictionaryCommit = await planAndCommitDictionary(ctx, args);
		if (dictionaryCommit.status !== "committed") {
			await settleResolutionSession(ctx, session, {
				kind: "PermanentFailure",
				message:
					"The shared dictionary rejected this resolution before it could be saved.",
			});
			return {
				status: "DictionaryConflict" as const,
				code:
					dictionaryCommit.status === "conflict"
						? dictionaryCommit.code
						: ("semanticPreconditionFailed" as const),
				message:
					dictionaryCommit.message ??
					"The Shared Demo Dictionary rejected this click.",
				...(dictionaryCommit.status === "conflict" &&
				dictionaryCommit.latestRevision
					? { latestRevision: dictionaryCommit.latestRevision }
					: {}),
			};
		}

		const [reading, surface, lemma] = await Promise.all([
			ctx.db
				.query("readings")
				.withIndex("by_reading_key", (q) =>
					q.eq("readingKey", args.readingKey),
				)
				.unique(),
			ctx.db
				.query("surfaces")
				.withIndex("by_surface_key", (q) =>
					q.eq("surfaceKey", args.occurrence.surfaceKey),
				)
				.unique(),
			ctx.db
				.query("lemmas")
				.withIndex("by_lemma_key", (q) =>
					q.eq("lemmaKey", args.occurrence.lemmaKey),
				)
				.unique(),
		]);
		if (!reading || !surface || !lemma) {
			throw new Error(
				"Canonical Lemma, Surface, and Reading must be committed first.",
			);
		}
		if (reading.lemmaId !== lemma._id || surface.lemmaId !== lemma._id) {
			throw new Error(
				"Attestation Surface and Reading must share one Lemma.",
			);
		}
		if (reading.emojiDescription !== args.reading.emojiDescription) {
			throw new Error(
				"Stored Reading does not match the selected Reading value.",
			);
		}
		if (
			lemmaIdentityKey(args.occurrence.attestation.surface.lemma) !==
			lemma.lemmaKey
		) {
			throw new Error(
				"Attestation Surface Lemma does not match lemmaKey.",
			);
		}

		const attestationId = await ctx.db.insert("attestations", {
			...(args.occurrence.attestation.expletiveEvidence === undefined
				? {}
				: {
						expletiveEvidence:
							args.occurrence.attestation.expletiveEvidence,
					}),
			...(args.occurrence.attestation.governedPrepositionEvidence ===
			undefined
				? {}
				: {
						governedPrepositionEvidence:
							args.occurrence.attestation
								.governedPrepositionEvidence,
					}),
			...(args.occurrence.attestation.articleEvidence === undefined
				? {}
				: {
						articleEvidence:
							args.occurrence.attestation.articleEvidence,
					}),
			surfaceId: surface._id,
			readingId: reading._id,
			realizationCoverage:
				args.occurrence.attestation.realizationCoverage,
		});
		await Promise.all(
			members.map((member, memberPosition) => {
				const attested = attestedMembers[memberPosition];
				if (!attested)
					throw new Error("Missing Attestation member evidence.");
				return ctx.db.patch(member._id, {
					resolutionState: undefined,
					attestationMembership: {
						attestationId,
						orthography: attested.orthography,
					},
				});
			}),
		);
		return {
			status: "Committed" as const,
			...(await completeResolutionSession(ctx, session, attestationId, {
				...(args.knowledgeDraftJson
					? { knowledgeDraftJson: args.knowledgeDraftJson }
					: {}),
			})),
			deduplicated: false,
		};
	},
});
