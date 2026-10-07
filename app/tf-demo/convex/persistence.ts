import { type Infer, type ObjectType, v } from "convex/values";
import { authoredReading } from "dumcorpus/inventories";
import { makeSurfaceId } from "dumdict/planning";
import {
	emojiDescriptionOf,
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import {
	parseGermanAttestation,
	parseGermanReading,
} from "../server/operationalParsing";
import type { ResolutionSessionGuard } from "../server/resolutionLifecycle";
import { assertSentenceUnits } from "../server/storedSegments";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "./_generated/server";
import {
	createDumdictTransaction,
	type DumdictTransactionOutcome,
	findReadingByKey,
	findSurface,
	storedReadingsOf,
} from "./dumdictTransaction";
import {
	assertIndex,
	assertMatchingRetry,
	assertNonEmpty,
	assertVisitorInput,
	requireClickableSegment,
} from "./model/resolutionLookup";
import {
	advanceResolutionSession,
	type CommittedOccurrence,
	completeResolutionSession,
	recordResolutionRunSuccess,
	requireCommittingSession,
	settleResolutionSession,
} from "./model/resolutionSessions";
import { loadStoredSegments } from "./model/storedSegments";
import {
	occurrenceAttestationInputValidator,
	readingCheckpointValidator,
	readingDecisionValidator,
	readingValueValidator,
	resolutionGenerationEventValidator,
	resolutionPhaseValidator,
	resolutionReadingProjectionValidator,
	resolutionSessionGuardValidator,
	resolvedClickCommitValidator,
	reusedResolvedClickCommitValidator,
	sentenceInputValidator,
	storedSegmentInputValidator,
	storedUnitValidator,
	unresolvedClickPersistenceResultValidator,
} from "./model/validators";
import {
	advanceMemberEncounters,
	ensureVisitorEncounter,
} from "./model/visitorClicks";
import {
	findAnalyzedSubmission,
	persistSubmittedText as persistSubmittedTextImplementation,
} from "./modules/text/submission";

/** What every Occurrence commit names: the click and the session committing it. */
const occurrenceCommitArgs = {
	requestId: v.string(),
	visitorId: v.string(),
	sentenceId: v.id("sentences"),
	clickedSegmentIndex: v.number(),
	sessionGuard: resolutionSessionGuardValidator,
};

/**
 * The rules every Occurrence commit starts with: the session must still be
 * committing, the clicked Segment must be clickable, and a requestId already
 * recorded must be this Visitor's retry on the same Segment.
 */
async function openOccurrenceCommit(
	ctx: MutationCtx,
	args: {
		readonly requestId: string;
		readonly visitorId: string;
		readonly sentenceId: Id<"sentences">;
		readonly clickedSegmentIndex: number;
		readonly sessionGuard: ResolutionSessionGuard;
	},
) {
	assertVisitorInput(args.visitorId, args.requestId);
	const [session, { sentence, segment }, existing] = await Promise.all([
		requireCommittingSession(ctx, args.sessionGuard, args),
		requireClickableSegment(ctx, args.sentenceId, args.clickedSegmentIndex),
		ctx.db
			.query("visitorClicks")
			.withIndex("by_request_id", (q) =>
				q.eq("requestId", args.requestId),
			)
			.unique(),
	]);
	if (existing) {
		assertMatchingRetry(existing, {
			visitorId: args.visitorId,
			segmentId: segment._id,
		});
	}
	return { session, sentence, segment, existing };
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
 *
 * A New decision was made before this transaction, so it is checked against
 * the state read here. A Reading another commit stored since is reused, and
 * a Surface already stored, as when a homonym's Lemma owns it, is left out of
 * the new Reading Note and ensured afterwards.
 */
async function planAndCommitDictionary(
	ctx: MutationCtx,
	args: {
		readonly reading: Infer<typeof readingValueValidator>;
		readonly readingKey: string;
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
	if (
		args.readingDecision === "Reuse" ||
		(await findReadingByKey(ctx, args.readingKey))
	)
		return dictionary.ensureOwnedSurface({ reading, ownedSurface });
	const surfaceStored =
		(await findSurface(ctx, makeSurfaceId("de", ownedSurface.surface))) !==
		null;
	const added = await dictionary.addNewNote({
		draft: {
			reading,
			note: emptyNote(),
			ownedSurfaces: surfaceStored ? [] : [ownedSurface],
		},
	});
	return added.status === "committed" && surfaceStored
		? dictionary.ensureOwnedSurface({ reading, ownedSurface })
		: added;
}

/**
 * The Lemma's stored Emoji Descriptions when a New must be refused as stale:
 * its judge saw `readingCandidates`, and the Lemma has gained a Reading
 * outside them since (ADR 0031). Undefined when the New stands: no judge
 * took part (an authored or Foreign Reading), or the Reading is stored by
 * now, which the commit reuses.
 */
async function staleNewReading(
	ctx: MutationCtx,
	args: {
		readonly reading: Infer<typeof readingValueValidator>;
		readonly readingKey: string;
		readonly readingDecision: Infer<typeof readingDecisionValidator>;
		readonly readingCandidates?: readonly string[];
		readonly occurrence: Infer<typeof occurrenceAttestationInputValidator>;
	},
): Promise<readonly string[] | undefined> {
	const seen = args.readingCandidates;
	if (args.readingDecision !== "New" || seen === undefined) return undefined;
	if (authoredReading(args.reading)) return undefined;
	if (await findReadingByKey(ctx, args.readingKey)) return undefined;
	const { lemma } = parseGermanReading(args.reading);
	const keyOf = (emojiDescription: string) =>
		readingIdentityKey({ unitKind: "Reading", lemma, emojiDescription });
	const judged = new Set(seen.map(keyOf));
	const stored = await storedReadingsOf(ctx, args.occurrence.lemmaKey);
	return stored.some((reading) => !judged.has(readingIdentityKey(reading)))
		? stored.flatMap(
				(reading) =>
					emojiDescriptionOf(parseGermanReading(reading)) ?? [],
			)
		: undefined;
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

/** The stored Text a re-submission would only reproduce, if any. */
export const analyzedSubmission = internalQuery({
	args: { submissionKey: v.string(), sourceText: v.string() },
	returns: v.union(v.null(), v.id("texts")),
	handler: findAnalyzedSubmission,
});

/**
 * Stores what a click's re-segmentation of a failed Sentence found (#861):
 * its units, its Segments when they came out differently, and the end of
 * its failure mark. The clicked Segment's row moves to the new Segment at
 * the same place in the Stitched Text, so the session that ran the click
 * keeps its Segment; any other row is reused, added or removed. A Sentence
 * another click already segmented again is left as it is. A failed
 * Sentence has no occurrence, and another session holding one of its
 * Segments makes the click fail; the next click is a fresh attempt.
 */
export const storeResegmentedSentence = internalMutation({
	args: {
		...occurrenceCommitArgs,
		segments: v.array(storedSegmentInputValidator),
		units: v.array(storedUnitValidator),
	},
	returns: v.object({ clickedSegmentIndex: v.number() }),
	handler: async (ctx, args) => {
		const session = await requireCommittingSession(
			ctx,
			args.sessionGuard,
			args,
		);
		const sentence = await ctx.db.get(args.sentenceId);
		if (!sentence)
			throw new Error("The requested sentence does not exist.");
		if (!sentence.segmentationFailed)
			return { clickedSegmentIndex: args.clickedSegmentIndex };
		if (
			args.segments.map(({ text }) => text).join("") !==
			sentence.stitchedText
		)
			throw new Error("The new Segments do not spell the Sentence.");
		assertSentenceUnits({ segments: args.segments, units: args.units });
		const rows = await loadStoredSegments(ctx, args.sentenceId);
		const same =
			rows.length === args.segments.length &&
			rows.every((row, index) => {
				const segment = args.segments[index];
				return (
					segment !== undefined &&
					row.index === index &&
					row.kind === segment.kind &&
					row.text === segment.text &&
					row.surface === segment.surface
				);
			});
		let clickedSegmentIndex = args.clickedSegmentIndex;
		if (!same) {
			const clicked = rows.find(
				(row) => row.index === args.clickedSegmentIndex,
			);
			if (!clicked)
				throw new Error("The clicked Segment does not exist.");
			if (
				rows.some(
					(row) =>
						row.attestationMembership !== undefined ||
						(row._id !== clicked._id &&
							row.resolutionState !== undefined),
				)
			)
				throw new Error(
					"Another click holds this Sentence's Segments; click it again.",
				);
			const offset = rows
				.filter((row) => row.index < clicked.index)
				.reduce((length, row) => length + row.text.length, 0);
			let start = 0;
			const placed = args.segments.map((segment, index) => {
				const at = { index, start, end: start + segment.text.length };
				start = at.end;
				return { ...at, segment };
			});
			clickedSegmentIndex =
				placed.find(
					({ segment, start: from, end }) =>
						segment.kind === "ResolvableText" &&
						from <= offset &&
						offset < end,
				)?.index ??
				placed.find(
					({ segment, start: from }) =>
						segment.kind === "ResolvableText" && from >= offset,
				)?.index ??
				-1;
			if (clickedSegmentIndex < 0)
				throw new Error("No new Segment sits where the click was.");
			const spare = rows.filter((row) => row._id !== clicked._id);
			for (const { index, segment } of placed) {
				const fields = {
					index,
					kind: segment.kind,
					text: segment.text,
					surface: segment.surface,
				};
				const row =
					index === clickedSegmentIndex ? clicked : spare.shift();
				if (row) await ctx.db.patch(row._id, fields);
				else
					await ctx.db.insert("segments", {
						sentenceId: args.sentenceId,
						index,
						kind: segment.kind,
						text: segment.text,
						...(segment.surface === undefined
							? {}
							: { surface: segment.surface }),
					});
			}
			for (const row of spare) await ctx.db.delete(row._id);
			await ctx.db.patch(session._id, { clickedSegmentIndex });
		}
		await ctx.db.patch(args.sentenceId, {
			units: args.units,
			segmentationFailed: undefined,
		});
		return { clickedSegmentIndex };
	},
});

export const persistUnresolvedClick = internalMutation({
	args: occurrenceCommitArgs,
	returns: unresolvedClickPersistenceResultValidator,
	handler: async (ctx, args) => {
		const { session, sentence, segment, existing } =
			await openOccurrenceCommit(ctx, args);
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

const resolvedClickCommitArgs = {
	...occurrenceCommitArgs,
	occurrence: occurrenceAttestationInputValidator,
	reading: readingValueValidator,
	readingKey: v.string(),
	readingDecision: readingDecisionValidator,
	/** For a New its judge decided: the stored Emoji Descriptions it saw. */
	readingCandidates: v.optional(v.array(v.string())),
};

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

/** The proposal fields a resolved click's identity and member checks read. */
type ResolvedClickProposal = {
	readonly readingKey: string;
	readonly reading: { readonly lemma: unknown };
	readonly occurrence: {
		readonly lemmaKey: string;
		readonly memberSegmentIndices: readonly number[];
		readonly attestation: {
			readonly surface: { readonly lemma: unknown };
			readonly members: readonly unknown[];
		};
	};
};

type ResolvedClickArgs = ObjectType<typeof resolvedClickCommitArgs>;

/**
 * A resolved click proposal's own consistency: its Reading matches
 * `readingKey`, its Reading and Attestation Surface share the proposed Lemma,
 * and its member Segment indices are ordered, unique and one per attested
 * member.
 */
export function assertResolvedClickProposal(args: ResolvedClickProposal): void {
	if (readingIdentityKey(args.reading) !== args.readingKey) {
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
	if (memberIndices.length === 0) {
		throw new Error("An Attestation needs at least one member Segment.");
	}
	if (memberIndices.length !== args.occurrence.attestation.members.length) {
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
}

/**
 * The member Segments the proposal names, each a ResolvableText Segment
 * whose text is its attested letters, among them the clicked Segment.
 */
async function loadAttestationMembers(
	ctx: MutationCtx,
	args: ResolvedClickArgs,
) {
	const memberIndices = args.occurrence.memberSegmentIndices;
	const attestedMembers = args.occurrence.attestation.members;
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
		// A piece of a fused word is attested as its own letters.
		if (member.text !== attestedMembers[memberPosition]?.attested) {
			throw new Error(
				"Attestation member text must equal its Segment text.",
			);
		}
		return member;
	});
	if (!memberIndices.includes(args.clickedSegmentIndex)) {
		throw new Error("The Attestation must contain the clicked Segment.");
	}
	return members;
}

/** Inserts the Attestation and makes each member Segment one of its members. */
async function insertAttestation(
	ctx: MutationCtx,
	args: ResolvedClickArgs,
	surfaceId: Id<"surfaces">,
	readingId: Id<"readings">,
	members: readonly Doc<"segments">[],
): Promise<Id<"attestations">> {
	const { attestation } = args.occurrence;
	const attestationId = await ctx.db.insert("attestations", {
		...(attestation.expletiveEvidence === undefined
			? {}
			: { expletiveEvidence: attestation.expletiveEvidence }),
		...(attestation.valencyEvidence === undefined
			? {}
			: { valencyEvidence: attestation.valencyEvidence }),
		...(attestation.articleEvidence === undefined
			? {}
			: { articleEvidence: attestation.articleEvidence }),
		surfaceId,
		readingId,
		realizationCoverage: attestation.realizationCoverage,
	});
	await Promise.all(
		members.map((member, memberPosition) => {
			const attested = attestation.members[memberPosition];
			if (!attested)
				throw new Error("Missing Attestation member evidence.");
			return ctx.db.patch(member._id, {
				resolutionState: undefined,
				attestationMembership:
					attested.orthography === "Fused"
						? {
								attestationId,
								orthography: attested.orthography,
								fusion: attested.fusion,
								component: attested.component,
							}
						: {
								attestationId,
								orthography: attested.orthography,
							},
			});
		}),
	);
	return attestationId;
}

/** The occurrence commit itself: the Segment's owner, the dictionary, the Attestation. */
async function commitResolvedClick(
	ctx: MutationCtx,
	args: ResolvedClickArgs,
): Promise<Infer<typeof resolvedClickCommitValidator>> {
	assertNonEmpty(args.readingKey, "readingKey");
	const {
		session,
		segment: clickedSegment,
		existing: existingClick,
	} = await openOccurrenceCommit(ctx, args);
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
	assertResolvedClickProposal(args);
	const members = await loadAttestationMembers(ctx, args);
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
			message: "This occurrence overlaps a different saved occurrence.",
			failureCode: "MembershipConflict",
		});
		return {
			status: "MembershipConflict" as const,
			code: "partialOverlap" as const,
			message:
				"Proposed Attestation members partially overlap committed membership.",
			conflictingAttestationIds: conflictingAttestationIds.sort(),
		};
	}

	// A New whose judge never saw a Reading the Lemma has now is refused
	// before anything is written; the click judges again (ADR 0031).
	const stale = await staleNewReading(ctx, args);
	if (stale)
		return { status: "StaleReading" as const, candidates: [...stale] };

	// The dictionary plan is built and applied here, against the state this
	// transaction reads, so the occurrence never carries a stale plan.
	const dictionaryCommit = await planAndCommitDictionary(ctx, args);
	if (dictionaryCommit.status !== "committed") {
		await settleResolutionSession(ctx, session, {
			kind: "PermanentFailure",
			message:
				"The shared dictionary rejected this resolution before it could be saved.",
			failureCode: "DictionaryConflict",
		});
		return {
			status: "DictionaryConflict" as const,
			code: "semanticPreconditionFailed" as const,
			message:
				dictionaryCommit.message ??
				"The Shared Demo Dictionary rejected this click.",
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
	if (
		reading.emojiDescription !==
		emojiDescriptionOf(parseGermanReading(args.reading))
	) {
		throw new Error(
			"Stored Reading does not match the selected Reading value.",
		);
	}
	if (
		lemmaIdentityKey(args.occurrence.attestation.surface.lemma) !==
		lemma.lemmaKey
	) {
		throw new Error("Attestation Surface Lemma does not match lemmaKey.");
	}

	const attestationId = await insertAttestation(
		ctx,
		args,
		surface._id,
		reading._id,
		members,
	);
	await advanceMemberEncounters(ctx, {
		segmentIds: members.map(({ _id }) => _id),
		attestationId,
	});
	return {
		status: "Committed" as const,
		...(await completeResolutionSession(ctx, session, attestationId)),
		deduplicated: false,
	};
}
