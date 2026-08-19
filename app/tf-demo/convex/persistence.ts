import { v } from "convex/values";
import { type Reading, readingFingerprint } from "dumling/reading";
import type { Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
	type QueryCtx,
} from "./_generated/server";
import { applyDumdictPlanInTransaction } from "./dumdictStorage";
import { lemmaKeyFor } from "./model/linguisticKeys";
import {
	loadOccurrenceAttestation,
	readingValue,
} from "./model/occurrenceAttestations";
import {
	projectResolutionGrammar,
	projectResolutionReading,
	type ResolutionSessionGuard,
	requireActiveResolutionSession,
	settleComplete,
	settleFailed,
	settleUnresolved,
} from "./model/resolutionSessions";
import { replaceAccumulatedKnowledge } from "./model/shadows";
import {
	dictionaryPlanValidator,
	knowledgeOwnerKindValidator,
	languageValidator,
	occurrenceAttestationInputValidator,
	readingValueValidator,
	recordedClickValidator,
	resolutionSessionGuardValidator,
	resolvedClickCommitValidator,
	reusableAttestationValidator,
	reusedResolvedClickCommitValidator,
	segmentKindValidator,
	sentenceInputValidator,
	unresolvedClickPersistenceResultValidator,
} from "./model/validators";
import { ensureVisitorEncounter } from "./model/visitorClicks";

const MAX_SENTENCES_PER_SUBMISSION = 9;
const MAX_SEGMENTS_PER_SENTENCE = 512;

function assertNonEmpty(value: string, name: string): void {
	if (value.trim().length === 0)
		throw new Error(`${name} must not be empty.`);
}

function assertIndex(value: number, name: string): void {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new Error(`${name} must be a non-negative safe integer.`);
	}
}

function assertVisitorInput(visitorId: string, requestId: string): void {
	assertNonEmpty(visitorId, "visitorId");
	assertNonEmpty(requestId, "requestId");
	if (visitorId.length > 200 || requestId.length > 200) {
		throw new Error(
			"Visitor and request identifiers are limited to 200 characters.",
		);
	}
}

async function requireClickableSegment(
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

async function findClickByRequestId(
	ctx: MutationCtx | QueryCtx,
	requestId: string,
) {
	return ctx.db
		.query("visitorClicks")
		.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
		.unique();
}

async function requireMatchingActiveSession(
	ctx: MutationCtx,
	input: {
		requestId: string;
		visitorId: string;
		sentenceId: Id<"sentences">;
		clickedSegmentIndex: number;
	},
	guard?: ResolutionSessionGuard,
) {
	if (!guard) return null;
	const session = await requireActiveResolutionSession(ctx, guard);
	if (
		session.requestId !== input.requestId ||
		session.visitorId !== input.visitorId ||
		session.sentenceId !== input.sentenceId ||
		session.clickedSegmentIndex !== input.clickedSegmentIndex
	) {
		throw new Error("Resolution Session does not match the Click commit.");
	}
	return session;
}

async function settleResolvedSession(
	ctx: MutationCtx,
	session: Awaited<ReturnType<typeof requireMatchingActiveSession>>,
	result: {
		readingId: Id<"readings">;
		attestationId: Id<"attestations">;
		occurrence: {
			grammatical: Parameters<typeof projectResolutionGrammar>[0];
			reading: Parameters<typeof projectResolutionReading>[0];
		};
	},
): Promise<void> {
	if (!session) return;
	await settleComplete(ctx, session, {
		readingId: result.readingId,
		attestationId: result.attestationId,
		grammar: projectResolutionGrammar(result.occurrence.grammatical),
		reading: projectResolutionReading(result.occurrence.reading),
	});
}

async function reconstructReusableAttestation(
	ctx: MutationCtx | QueryCtx,
	attestationId: Id<"attestations">,
	clickedSegmentIndex: number,
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
				markedContext: occurrence.markedContext,
				attestation: occurrence.publicAttestation,
				interaction: {
					segmentedSentenceId:
						occurrence.sentence.segmentedSentenceId,
					clickedSegmentIndex,
					memberSegmentIndices: occurrence.memberSegmentIndices,
				},
			},
			reading: occurrence.publicReading,
		},
	};
}

async function recordClickAgainstCommittedAttestation(
	ctx: MutationCtx,
	input: {
		requestId: string;
		visitorId: string;
		segmentId: Id<"segments">;
		clickedSegmentIndex: number;
		attestationId: Id<"attestations">;
	},
) {
	const { value: occurrence } = await reconstructReusableAttestation(
		ctx,
		input.attestationId,
		input.clickedSegmentIndex,
	);
	const attestation = await ctx.db.get(input.attestationId);
	if (!attestation) throw new Error("Attestation does not exist.");
	const { clickId } = await ensureVisitorEncounter(ctx, input);
	return {
		status: "Reused" as const,
		clickId,
		readingId: attestation.readingId,
		attestationId: input.attestationId,
		deduplicated: false,
		occurrence,
	};
}

function assertMatchingRetry(
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
	handler: async (ctx, args) => {
		assertNonEmpty(args.submissionKey, "submissionKey");
		if (args.sentences.length > MAX_SENTENCES_PER_SUBMISSION) {
			throw new Error(
				`At most ${MAX_SENTENCES_PER_SUBMISSION} sentences are allowed.`,
			);
		}
		const positions = new Set<number>();
		const sentenceKeys = new Set<string>();
		for (const sentence of args.sentences) {
			assertIndex(sentence.position, "sentence.position");
			assertNonEmpty(sentence.segmentedSentenceId, "segmentedSentenceId");
			assertNonEmpty(sentence.stitchedText, "stitchedText");
			if (positions.has(sentence.position)) {
				throw new Error("Sentence positions must be unique.");
			}
			if (sentenceKeys.has(sentence.segmentedSentenceId)) {
				throw new Error("Segmented Sentence IDs must be unique.");
			}
			positions.add(sentence.position);
			sentenceKeys.add(sentence.segmentedSentenceId);
			if (
				sentence.segments.length === 0 ||
				sentence.segments.length > MAX_SEGMENTS_PER_SENTENCE
			) {
				throw new Error(
					`A sentence must contain 1-${MAX_SEGMENTS_PER_SENTENCE} Segments.`,
				);
			}
			if (
				sentence.segments.map(({ text }) => text).join("") !==
				sentence.stitchedText
			) {
				throw new Error(
					"Segments must reconstruct stitchedText exactly.",
				);
			}
			for (const segment of sentence.segments) {
				if (segment.text.length === 0) {
					throw new Error("segment.text must not be empty.");
				}
				if (segment.kind === "Whitespace" && segment.text !== " ") {
					throw new Error(
						"Whitespace Segments must contain one ASCII space.",
					);
				}
			}
		}

		const existingText = await ctx.db
			.query("texts")
			.withIndex("by_submission_key", (q) =>
				q.eq("submissionKey", args.submissionKey),
			)
			.unique();
		if (existingText) {
			if (existingText.sourceText !== args.sourceText) {
				throw new Error(
					"submissionKey was already used for different text.",
				);
			}
			const existingSentences = await ctx.db
				.query("sentences")
				.withIndex("by_text_id_and_position", (q) =>
					q.eq("textId", existingText._id),
				)
				.take(MAX_SENTENCES_PER_SUBMISSION);
			const submittedSentences = [...args.sentences].sort(
				(left, right) => left.position - right.position,
			);
			const existingSegments = await Promise.all(
				existingSentences.map((sentence) =>
					ctx.db
						.query("segments")
						.withIndex("by_sentence_id_and_index", (q) =>
							q.eq("sentenceId", sentence._id),
						)
						.take(MAX_SEGMENTS_PER_SENTENCE),
				),
			);
			if (existingSegments.some((segments) => segments.length > 0)) {
				const completeExactAnalysis =
					existingSentences.length === submittedSentences.length &&
					existingSentences.every((existing, sentenceIndex) => {
						const submitted = submittedSentences[sentenceIndex];
						const segments = existingSegments[sentenceIndex] ?? [];
						return (
							submitted !== undefined &&
							existing.position === submitted.position &&
							existing.segmentedSentenceId ===
								submitted.segmentedSentenceId &&
							existing.language === submitted.language &&
							existing.stitchedText === submitted.stitchedText &&
							segments.length === submitted.segments.length &&
							segments.every(
								(segment, segmentIndex) =>
									segment.index === segmentIndex &&
									segment.kind ===
										submitted.segments[segmentIndex]
											?.kind &&
									segment.text ===
										submitted.segments[segmentIndex]?.text,
							)
						);
					});
				if (!completeExactAnalysis) {
					throw new Error(
						"Existing Text analysis is incomplete or differs from the submitted analysis; retry after stripping completes.",
					);
				}
				return {
					textId: existingText._id,
					sentenceIds: existingSentences.map(({ _id }) => _id),
					deduplicated: true,
				};
			}
			if (submittedSentences.length === 0) {
				return {
					textId: existingText._id,
					sentenceIds: existingSentences.map(({ _id }) => _id),
					deduplicated: true,
				};
			}

			const existingByPosition = new Map(
				existingSentences.map((sentence) => [
					sentence.position,
					sentence,
				]),
			);
			if (
				existingSentences.some(
					(sentence) => !positions.has(sentence.position),
				)
			) {
				throw new Error(
					"Existing Sentences do not match the submitted analysis.",
				);
			}
			for (const submitted of submittedSentences) {
				const existing = existingByPosition.get(submitted.position);
				const collision = await ctx.db
					.query("sentences")
					.withIndex("by_segmented_sentence_id", (q) =>
						q.eq(
							"segmentedSentenceId",
							submitted.segmentedSentenceId,
						),
					)
					.unique();
				if (collision && collision._id !== existing?._id) {
					throw new Error(
						"Segmented Sentence ID already belongs to another submission.",
					);
				}
			}

			const sentenceIds: Id<"sentences">[] = [];
			for (const submitted of submittedSentences) {
				const existing = existingByPosition.get(submitted.position);
				const sentenceValue = {
					segmentedSentenceId: submitted.segmentedSentenceId,
					textId: existingText._id,
					position: submitted.position,
					language: submitted.language,
					stitchedText: submitted.stitchedText,
				};
				const sentenceId =
					existing?._id ??
					(await ctx.db.insert("sentences", sentenceValue));
				if (existing) await ctx.db.replace(existing._id, sentenceValue);
				sentenceIds.push(sentenceId);
				for (const [index, segment] of submitted.segments.entries()) {
					await ctx.db.insert("segments", {
						sentenceId,
						index,
						...segment,
					});
				}
			}
			return {
				textId: existingText._id,
				sentenceIds,
				deduplicated: true,
			};
		}

		for (const sentence of args.sentences) {
			const collision = await ctx.db
				.query("sentences")
				.withIndex("by_segmented_sentence_id", (q) =>
					q.eq("segmentedSentenceId", sentence.segmentedSentenceId),
				)
				.unique();
			if (collision) {
				throw new Error(
					"Segmented Sentence ID already belongs to another submission.",
				);
			}
		}

		const textId = await ctx.db.insert("texts", {
			submissionKey: args.submissionKey,
			sourceText: args.sourceText,
		});
		const sentenceIds: Id<"sentences">[] = [];
		for (const sentence of [...args.sentences].sort(
			(left, right) => left.position - right.position,
		)) {
			const sentenceId = await ctx.db.insert("sentences", {
				segmentedSentenceId: sentence.segmentedSentenceId,
				textId,
				position: sentence.position,
				language: sentence.language,
				stitchedText: sentence.stitchedText,
			});
			sentenceIds.push(sentenceId);
			for (const [index, segment] of sentence.segments.entries()) {
				await ctx.db.insert("segments", {
					sentenceId,
					index,
					...segment,
				});
			}
		}
		return { textId, sentenceIds, deduplicated: false };
	},
});

export const getSentenceForResolution = internalQuery({
	args: { sentenceId: v.id("sentences") },
	returns: v.union(
		v.null(),
		v.object({
			sentenceId: v.id("sentences"),
			textId: v.id("texts"),
			segmentedSentenceId: v.string(),
			language: languageValidator,
			stitchedText: v.string(),
			segments: v.array(
				v.object({
					index: v.number(),
					kind: segmentKindValidator,
					text: v.string(),
				}),
			),
		}),
	),
	handler: async (ctx, { sentenceId }) => {
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
	},
});

export const findAttestationForSegment = internalQuery({
	args: {
		sentenceId: v.id("sentences"),
		clickedSegmentIndex: v.number(),
	},
	returns: v.union(v.null(), reusableAttestationValidator),
	handler: async (ctx, { sentenceId, clickedSegmentIndex }) => {
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
	},
});

export const findClickResultByRequestId = internalQuery({
	args: {
		requestId: v.string(),
		visitorId: v.string(),
		sentenceId: v.id("sentences"),
		clickedSegmentIndex: v.number(),
	},
	returns: v.union(v.null(), recordedClickValidator),
	handler: async (ctx, args) => {
		assertVisitorInput(args.visitorId, args.requestId);
		const { segment } = await requireClickableSegment(
			ctx,
			args.sentenceId,
			args.clickedSegmentIndex,
		);
		const click = await ctx.db
			.query("visitorClicks")
			.withIndex("by_request_id", (q) =>
				q.eq("requestId", args.requestId),
			)
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
		return { clickId: click._id, status: "Unresolved" as const };
	},
});

export const persistUnresolvedClick = internalMutation({
	args: {
		requestId: v.string(),
		visitorId: v.string(),
		sentenceId: v.id("sentences"),
		clickedSegmentIndex: v.number(),
		sessionGuard: v.optional(resolutionSessionGuardValidator),
	},
	returns: unresolvedClickPersistenceResultValidator,
	handler: async (ctx, args) => {
		assertVisitorInput(args.visitorId, args.requestId);
		const session = await requireMatchingActiveSession(
			ctx,
			args,
			args.sessionGuard,
		);
		const { segment } = await requireClickableSegment(
			ctx,
			args.sentenceId,
			args.clickedSegmentIndex,
		);
		const existing = await findClickByRequestId(ctx, args.requestId);
		if (existing) {
			assertMatchingRetry(existing, {
				visitorId: args.visitorId,
				segmentId: segment._id,
			});
			if (existing.attestationId) {
				throw new Error("requestId already records a resolved click.");
			}
			if (session) await settleUnresolved(ctx, session);
			return {
				status: "Unresolved" as const,
				clickId: existing._id,
				deduplicated: true,
			};
		}
		const committedAttestationId =
			segment.attestationMembership?.attestationId;
		if (committedAttestationId) {
			const result = await recordClickAgainstCommittedAttestation(ctx, {
				...args,
				segmentId: segment._id,
				attestationId: committedAttestationId,
			});
			await settleResolvedSession(ctx, session, result);
			return result;
		}
		const { clickId } = await ensureVisitorEncounter(ctx, {
			requestId: args.requestId,
			visitorId: args.visitorId,
			segmentId: segment._id,
		});
		if (session) await settleUnresolved(ctx, session);
		return {
			status: "Unresolved" as const,
			clickId,
			deduplicated: false,
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
		sessionGuard: v.optional(resolutionSessionGuardValidator),
	},
	returns: reusedResolvedClickCommitValidator,
	handler: async (ctx, args) => {
		assertVisitorInput(args.visitorId, args.requestId);
		const session = await requireMatchingActiveSession(
			ctx,
			args,
			args.sessionGuard,
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
		const attestation = await ctx.db.get(args.attestationId);
		if (!attestation) throw new Error("Attestation does not exist.");
		const existing = await findClickByRequestId(ctx, args.requestId);
		if (existing) {
			assertMatchingRetry(existing, {
				visitorId: args.visitorId,
				segmentId: segment._id,
			});
			if (existing.attestationId !== args.attestationId) {
				throw new Error(
					"requestId already records a different result.",
				);
			}
			const result = {
				status: "Reused" as const,
				clickId: existing._id,
				readingId: attestation.readingId,
				attestationId: args.attestationId,
				deduplicated: true,
			};
			const occurrence = await reconstructReusableAttestation(
				ctx,
				args.attestationId,
				args.clickedSegmentIndex,
			);
			await settleResolvedSession(ctx, session, {
				...result,
				occurrence: occurrence.value,
			});
			return result;
		}
		const { clickId } = await ensureVisitorEncounter(ctx, {
			requestId: args.requestId,
			visitorId: args.visitorId,
			segmentId: segment._id,
			attestationId: args.attestationId,
		});
		const result = {
			status: "Reused" as const,
			clickId,
			readingId: attestation.readingId,
			attestationId: args.attestationId,
			deduplicated: false,
		};
		const occurrence = await reconstructReusableAttestation(
			ctx,
			args.attestationId,
			args.clickedSegmentIndex,
		);
		await settleResolvedSession(ctx, session, {
			...result,
			occurrence: occurrence.value,
		});
		return result;
	},
});

export const persistResolvedClick = internalMutation({
	args: {
		requestId: v.string(),
		visitorId: v.string(),
		sentenceId: v.id("sentences"),
		clickedSegmentIndex: v.number(),
		occurrence: occurrenceAttestationInputValidator,
		reading: readingValueValidator,
		readingKey: v.string(),
		dictionaryPlan: dictionaryPlanValidator,
		sessionGuard: v.optional(resolutionSessionGuardValidator),
	},
	returns: resolvedClickCommitValidator,
	handler: async (ctx, args) => {
		assertVisitorInput(args.visitorId, args.requestId);
		const session = await requireMatchingActiveSession(
			ctx,
			args,
			args.sessionGuard,
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
			if (!existingClick.attestationId) {
				throw new Error(
					"requestId already records an unresolved click.",
				);
			}
			const { value: occurrence } = await reconstructReusableAttestation(
				ctx,
				existingClick.attestationId,
				args.clickedSegmentIndex,
			);
			const existingAttestation = await ctx.db.get(
				existingClick.attestationId,
			);
			if (!existingAttestation)
				throw new Error("Attestation does not exist.");
			const result = {
				status: "Reused" as const,
				clickId: existingClick._id,
				readingId: existingAttestation.readingId,
				attestationId: existingClick.attestationId,
				deduplicated: true,
				occurrence,
			};
			await settleResolvedSession(ctx, session, result);
			return result;
		}
		const committedAttestationId =
			clickedSegment.attestationMembership?.attestationId;
		if (committedAttestationId) {
			const result = await recordClickAgainstCommittedAttestation(ctx, {
				...args,
				segmentId: clickedSegment._id,
				attestationId: committedAttestationId,
			});
			await settleResolvedSession(ctx, session, result);
			return result;
		}
		if (
			readingFingerprint(args.reading as Reading<"de">) !==
			args.readingKey
		) {
			throw new Error(
				"readingKey does not match the selected Reading identity.",
			);
		}
		if (
			lemmaKeyFor(args.reading.lemma) !== args.occurrence.lemmaKey ||
			lemmaKeyFor(args.occurrence.attestation.surface.lemma) !==
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
		const members = [];
		let previous = -1;
		for (const [memberPosition, index] of memberIndices.entries()) {
			assertIndex(index, "memberSegmentIndex");
			if (index <= previous) {
				throw new Error(
					"Attestation member Segment indices must be ordered and unique.",
				);
			}
			const member = await ctx.db
				.query("segments")
				.withIndex("by_sentence_id_and_index", (q) =>
					q.eq("sentenceId", args.sentenceId).eq("index", index),
				)
				.unique();
			if (member?.kind !== "ResolvableText") {
				throw new Error(
					"Attestation members must refer to ResolvableText Segments.",
				);
			}
			if (member.text !== attestedMembers[memberPosition]?.attested) {
				throw new Error(
					"Attestation member text must equal its Segment text.",
				);
			}
			members.push(member);
			previous = index;
		}
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
			if (session) {
				await settleFailed(
					ctx,
					session,
					"This occurrence overlaps a different saved occurrence.",
				);
			}
			return {
				status: "MembershipConflict" as const,
				code: "partialOverlap" as const,
				message:
					"Proposed Attestation members partially overlap committed membership.",
				conflictingAttestationIds: conflictingAttestationIds.sort(),
			};
		}

		const dictionaryCommit = await applyDumdictPlanInTransaction(
			ctx,
			args.dictionaryPlan,
		);
		if (dictionaryCommit.status === "conflict") {
			if (session) {
				await settleFailed(
					ctx,
					session,
					"The shared dictionary changed before this resolution could be saved.",
				);
			}
			return {
				status: "DictionaryConflict" as const,
				code: dictionaryCommit.code,
				message:
					"The Shared Demo Dictionary changed before this click committed.",
				latestRevision: dictionaryCommit.latestRevision,
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
			lemmaKeyFor(args.occurrence.attestation.surface.lemma) !==
			lemma.lemmaKey
		) {
			throw new Error(
				"Attestation Surface Lemma does not match lemmaKey.",
			);
		}

		const attestationId = await ctx.db.insert("attestations", {
			surfaceId: surface._id,
			readingId: reading._id,
			realizationCoverage:
				args.occurrence.attestation.realizationCoverage,
		});
		for (const [memberPosition, member] of members.entries()) {
			const attested = attestedMembers[memberPosition];
			if (!attested)
				throw new Error("Missing Attestation member evidence.");
			await ctx.db.patch(member._id, {
				attestationMembership: {
					attestationId,
					orthography: attested.orthography,
				},
			});
		}
		const { clickId } = await ensureVisitorEncounter(ctx, {
			requestId: args.requestId,
			visitorId: args.visitorId,
			segmentId: clickedSegment._id,
			attestationId,
		});
		const { value: occurrence } = await reconstructReusableAttestation(
			ctx,
			attestationId,
			args.clickedSegmentIndex,
		);
		const result = {
			status: "Committed" as const,
			clickId,
			readingId: reading._id,
			attestationId,
			deduplicated: false,
			occurrence,
		};
		await settleResolvedSession(ctx, session, result);
		return result;
	},
});

export const getKnowledgeOwner = internalQuery({
	args: {
		ownerKind: knowledgeOwnerKindValidator,
		ownerKey: v.string(),
	},
	returns: v.union(
		v.null(),
		v.object({
			owner: v.any(),
			knowledge: v.optional(v.any()),
		}),
	),
	handler: async (ctx, args) => {
		const accumulated = await ctx.db
			.query("accumulatedKnowledge")
			.withIndex("by_owner_kind_and_owner_key", (q) =>
				q.eq("ownerKind", args.ownerKind).eq("ownerKey", args.ownerKey),
			)
			.unique();
		if (args.ownerKind === "Lemma") {
			const lemma = await ctx.db
				.query("lemmas")
				.withIndex("by_lemma_key", (q) =>
					q.eq("lemmaKey", args.ownerKey),
				)
				.unique();
			return lemma
				? {
						owner: {
							language: lemma.language,
							family: lemma.family,
							kind: lemma.kind,
							canonicalForm: lemma.canonicalForm,
							coreFeatures: lemma.coreFeatures,
						},
						...(accumulated
							? { knowledge: accumulated.knowledge }
							: {}),
					}
				: null;
		}
		const reading = await ctx.db
			.query("readings")
			.withIndex("by_reading_key", (q) =>
				q.eq("readingKey", args.ownerKey),
			)
			.unique();
		if (!reading) return null;
		const lemma = await ctx.db.get(reading.lemmaId);
		return lemma
			? {
					owner: readingValue(reading, lemma),
					...(accumulated
						? { knowledge: accumulated.knowledge }
						: {}),
				}
			: null;
	},
});

export const persistKnowledgeContribution = internalMutation({
	args: {
		contributionKey: v.string(),
		ownerKind: knowledgeOwnerKindValidator,
		ownerKey: v.string(),
		change: v.any(),
		knowledge: v.any(),
	},
	returns: v.object({
		contributionId: v.id("knowledgeContributions"),
		accumulatedKnowledgeId: v.id("accumulatedKnowledge"),
		deduplicated: v.boolean(),
	}),
	handler: async (ctx, args) => {
		assertNonEmpty(args.contributionKey, "contributionKey");
		assertNonEmpty(args.ownerKey, "ownerKey");
		const existingContribution = await ctx.db
			.query("knowledgeContributions")
			.withIndex("by_contribution_key", (q) =>
				q.eq("contributionKey", args.contributionKey),
			)
			.unique();
		const existingAccumulated = await ctx.db
			.query("accumulatedKnowledge")
			.withIndex("by_owner_kind_and_owner_key", (q) =>
				q.eq("ownerKind", args.ownerKind).eq("ownerKey", args.ownerKey),
			)
			.unique();
		if (existingContribution) {
			if (
				existingContribution.ownerKind !== args.ownerKind ||
				existingContribution.ownerKey !== args.ownerKey ||
				!existingAccumulated
			) {
				throw new Error(
					"contributionKey collides with a different contribution.",
				);
			}
			return {
				contributionId: existingContribution._id,
				accumulatedKnowledgeId: existingAccumulated._id,
				deduplicated: true,
			};
		}

		if (args.ownerKind === "Lemma") {
			const lemma = await ctx.db
				.query("lemmas")
				.withIndex("by_lemma_key", (q) =>
					q.eq("lemmaKey", args.ownerKey),
				)
				.unique();
			if (!lemma)
				throw new Error("Knowledge owner Lemma does not exist.");
		} else {
			const reading = await ctx.db
				.query("readings")
				.withIndex("by_reading_key", (q) =>
					q.eq("readingKey", args.ownerKey),
				)
				.unique();
			if (!reading)
				throw new Error("Knowledge owner Reading does not exist.");
			const entry = await ctx.db
				.query("readingEntries")
				.withIndex("by_reading_id", (q) =>
					q.eq("readingId", reading._id),
				)
				.unique();
			if (entry) {
				const record =
					entry.record !== null &&
					typeof entry.record === "object" &&
					!Array.isArray(entry.record)
						? entry.record
						: {};
				await ctx.db.patch(entry._id, {
					record: { ...record, knowledge: args.knowledge },
				});
			}
		}
		const now = Date.now();
		const accumulatedKnowledgeId = await replaceAccumulatedKnowledge(
			ctx,
			args.ownerKind,
			args.ownerKey,
			args.knowledge,
		);
		if (!accumulatedKnowledgeId) {
			throw new Error(
				"A Knowledge contribution must accumulate Knowledge.",
			);
		}
		const contributionId = await ctx.db.insert("knowledgeContributions", {
			contributionKey: args.contributionKey,
			ownerKind: args.ownerKind,
			ownerKey: args.ownerKey,
			change: args.change,
			createdAt: now,
		});
		return { contributionId, accumulatedKnowledgeId, deduplicated: false };
	},
});
