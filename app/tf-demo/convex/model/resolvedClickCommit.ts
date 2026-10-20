import { type Infer, type ObjectType, v } from "convex/values";
import { assertNonEmpty } from "../../server/identifiers";
import {
	emojiDescriptionOf,
	lemmaIdentityKey,
	readingIdentityKey,
} from "../../server/linguisticIdentity";
import { parseGermanReading } from "../../server/operationalParsing";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
	occurrenceCommitArgs,
	openOccurrenceCommit,
	reusedCommit,
} from "./occurrenceCommit";
import { assertIndex } from "./resolutionLookup";
import {
	completeResolutionSession,
	settleResolutionSession,
} from "./resolutionSessions";
import {
	planAndCommitDictionary,
	staleNewReading,
} from "./resolvedClickDictionary";
import {
	occurrenceAttestationInputValidator,
	readingDecisionValidator,
	readingValueValidator,
	type resolvedClickCommitValidator,
} from "./validators";
import { advanceMemberEncounters } from "./visitorEncounters";

export const resolvedClickCommitArgs = {
	...occurrenceCommitArgs,
	occurrence: occurrenceAttestationInputValidator,
	reading: readingValueValidator,
	readingKey: v.string(),
	readingDecision: readingDecisionValidator,
	/** For a New its judge decided: the stored Emoji Descriptions it saw. */
	readingCandidates: v.optional(v.array(v.string())),
};

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
export async function commitResolvedClick(
	ctx: MutationCtx,
	args: ResolvedClickArgs,
): Promise<Infer<typeof resolvedClickCommitValidator>> {
	assertNonEmpty(args.readingKey, "readingKey");
	const {
		session,
		segment: clickedSegment,
		existing: existingEncounter,
	} = await openOccurrenceCommit(ctx, args);
	// Segment Selection recorded the Visitor Encounter before the run, so
	// an unresolved one is this session's own. A committed occurrence on
	// the clicked Segment wins over this proposal (ADR-0004).
	const committedAttestationId =
		existingEncounter?.attestationId ??
		clickedSegment.attestationMembership?.attestationId;
	if (committedAttestationId) {
		return reusedCommit(
			await completeResolutionSession(
				ctx,
				session,
				committedAttestationId,
			),
			existingEncounter,
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
