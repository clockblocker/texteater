import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
	internalMutation,
	type MutationCtx,
	mutation,
	query,
} from "./_generated/server";
import { inspectionJson } from "./model/inspection";
import { scheduleKnowledgeGeneration } from "./model/knowledgeScheduling";
import { requireClickableSegment } from "./model/resolutionLookup";
import {
	advanceResolutionSession,
	claimResolutionRun,
	deleteResolutionSessions,
	failResolutionRun,
	findActiveVisitorSession,
	loadCanonicalOccurrence,
	loadResolutionNote,
	occurrenceNoteTarget,
	RESOLUTION_RETENTION_MS,
	recordResolutionRunSuccess,
	recoverStaleResolutionRun,
	resolutionNoteValidator,
	retryResolutionSession,
	settleResolutionRun,
	startResolutionSession,
} from "./model/resolutionSessions";
import {
	readingValueValidator,
	resolutionActivityValidator,
	resolutionGenerationEventValidator,
	resolutionGrammarProjectionValidator,
	resolutionPhaseValidator,
	resolutionProgressValidator,
	resolutionReadingProjectionValidator,
	resolutionSessionGuardValidator,
	resolvedGrammaticalValidator,
	safeGenerationFailureValidator,
} from "./model/validators";
import { ensureVisitorEncounter } from "./model/visitorClicks";
import {
	loadResolutionContext,
	resolutionContextValidator,
} from "./resolutionContext";
import { saveInspectionStep } from "./resolutionInspection";

const MAX_IDENTIFIER_LENGTH = 200;
const CLEANUP_BATCH_SIZE = 200;

const readingCheckpointValidator = v.object({
	resolution: v.object({
		decision: v.union(v.literal("Reuse"), v.literal("New")),
		emojiDescription: v.string(),
	}),
	reading: readingValueValidator,
});

export const selectSegment = mutation({
	args: {
		requestId: v.string(),
		visitorId: v.string(),
		sentenceId: v.id("sentences"),
		clickedSegmentIndex: v.number(),
		routeNoteRequested: v.boolean(),
		inspect: v.optional(v.boolean()),
	},
	returns: v.union(
		v.object({
			kind: v.literal("Available"),
			canonical: v.object({
				readingId: v.id("readings"),
				lemmaId: v.id("lemmas"),
				surfaceId: v.id("surfaces"),
				surfaceLanguage: v.literal("de"),
				normalizedSurface: v.string(),
				attestationId: v.id("attestations"),
			}),
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
		}),
		v.object({
			kind: v.literal("Resolving"),
			requestId: v.string(),
			progress: resolutionProgressValidator,
			activity: resolutionActivityValidator,
			deduplicated: v.boolean(),
		}),
	),
	handler: async (ctx, args) => {
		const startedAt = Date.now();
		const select = async () => {
			assertIdentifier(args.requestId, "requestId");
			assertIdentifier(args.visitorId, "visitorId");
			const { sentence, segment } = await requireClickableSegment(
				ctx,
				args.sentenceId,
				args.clickedSegmentIndex,
			);

			const existing = await ctx.db
				.query("resolutionSessions")
				.withIndex("by_request_id", (q) =>
					q.eq("requestId", args.requestId),
				)
				.unique();
			if (existing) {
				if (
					existing.visitorId !== args.visitorId ||
					existing.sentenceId !== args.sentenceId ||
					existing.clickedSegmentIndex !== args.clickedSegmentIndex ||
					existing.segmentId !== segment._id ||
					Boolean(existing.routeNoteRequested) !==
						args.routeNoteRequested
				) {
					throw new Error(
						"requestId was already used for a different click.",
					);
				}
				const { lifecycle } = existing;
				if (
					lifecycle.state === "Terminal" &&
					lifecycle.outcome === "Complete" &&
					existing.readingId &&
					existing.attestationId
				) {
					await scheduleKnowledgeGeneration(ctx, {
						attemptKey: existing.requestId,
						visitorId: existing.visitorId,
						readingId: existing.readingId,
						attestationId: existing.attestationId,
					});
				}
				return {
					kind: "Resolving" as const,
					requestId: existing.requestId,
					progress: lifecycle.progress,
					activity:
						lifecycle.state === "Active"
							? lifecycle.activity
							: ("Terminal" as const),
					deduplicated: true,
				};
			}

			const attestationId = segment.attestationMembership?.attestationId;
			if (attestationId) {
				const canonical = await loadCanonicalOccurrence(
					ctx,
					attestationId,
				);
				if (!canonical)
					throw new Error(
						"The committed occurrence's Reading and Surface disagree.",
					);
				await ensureVisitorEncounter(ctx, {
					requestId: args.requestId,
					visitorId: args.visitorId,
					textId: sentence.textId,
					sentenceId: sentence._id,
					segmentId: segment._id,
					attestationId,
				});
				await scheduleKnowledgeGeneration(ctx, {
					attemptKey: args.requestId,
					visitorId: args.visitorId,
					readingId: canonical.readingId,
					attestationId,
				});
				return {
					kind: "Available" as const,
					canonical,
					target: occurrenceNoteTarget(
						args.routeNoteRequested,
						canonical.readingId,
						attestationId,
					),
				};
			}

			await ensureVisitorEncounter(ctx, {
				requestId: args.requestId,
				visitorId: args.visitorId,
				textId: sentence.textId,
				sentenceId: sentence._id,
				segmentId: segment._id,
			});
			const running = await findActiveVisitorSession(
				ctx,
				args.visitorId,
				segment._id,
			);
			if (running?.lifecycle.state === "Active") {
				return {
					kind: "Resolving" as const,
					requestId: running.requestId,
					progress: running.lifecycle.progress,
					activity: running.lifecycle.activity,
					deduplicated: true,
				};
			}
			await startResolutionSession(ctx, {
				requestId: args.requestId,
				visitorId: args.visitorId,
				sentence,
				segment,
				routeNoteRequested: args.routeNoteRequested,
				inspect: args.inspect === true,
			});
			return {
				kind: "Resolving" as const,
				requestId: args.requestId,
				progress: "Starting" as const,
				activity: "Scheduled" as const,
				deduplicated: false,
			};
		};
		const result = await select();
		if (args.inspect) {
			const existing = await ctx.db
				.query("inspectionClicks")
				.withIndex("by_request_id", (q) =>
					q.eq("requestId", args.requestId),
				)
				.unique();
			if (!existing) {
				const sentence = await ctx.db.get(args.sentenceId);
				const segment = await ctx.db
					.query("segments")
					.withIndex("by_sentence_id_and_index", (q) =>
						q
							.eq("sentenceId", args.sentenceId)
							.eq("index", args.clickedSegmentIndex),
					)
					.unique();
				await ctx.db.insert("inspectionClicks", {
					requestId: args.requestId,
					visitorId: args.visitorId,
					sentenceId: args.sentenceId,
					selectedSegment: segment?.text ?? "",
					sentence: sentence?.stitchedText ?? "",
					startedAt,
					selectionKind: result.kind,
				});
				await saveInspectionStep(ctx, args.requestId, {
					id: `${args.requestId}:selection`,
					name:
						result.kind === "Available"
							? "Reuse stored Attestation"
							: "Select segment and schedule resolution",
					kind: "Code",
					owner: "app/tf-demo · resolutionSessions.selectSegment",
					startedAt,
					durationMs: 0,
					timing: "Unmeasured",
					status: "Success",
					payloadJson: inspectionJson({
						input: args,
						output: result,
						timing: "Convex mutation clock is transaction-frozen; duration is not measured.",
					}),
				});
			}
		}
		return result;
	},
});

export const getResolutionNote = query({
	args: { requestId: v.string() },
	returns: v.union(v.null(), resolutionNoteValidator),
	handler: async (ctx, { requestId }) => loadResolutionNote(ctx, requestId),
});

export const retryResolution = mutation({
	args: { requestId: v.string(), visitorId: v.string() },
	returns: v.object({ retried: v.boolean() }),
	handler: async (ctx, args) => {
		assertIdentifier(args.requestId, "requestId");
		assertIdentifier(args.visitorId, "visitorId");
		return { retried: await retryResolutionSession(ctx, args) };
	},
});

export const beginRun = internalMutation({
	args: { guard: resolutionSessionGuardValidator },
	returns: v.union(
		v.null(),
		v.object({
			context: resolutionContextValidator,
			selection: v.object({
				requestId: v.string(),
				visitorId: v.string(),
				sentenceId: v.id("sentences"),
				clickedSegmentIndex: v.number(),
			}),
			checkpoints: v.object({
				grammatical: v.optional(resolvedGrammaticalValidator),
				reading: v.optional(readingCheckpointValidator),
			}),
		}),
	),
	handler: async (ctx, { guard }) => {
		const claimed = await claimResolutionRun(ctx, guard);
		if (!claimed) return null;
		const { session, checkpoints } = claimed;
		return {
			context: await loadResolutionContext(
				ctx,
				session,
				!checkpoints.grammatical,
			),
			selection: {
				requestId: session.requestId,
				visitorId: session.visitorId,
				sentenceId: session.sentenceId,
				clickedSegmentIndex: session.clickedSegmentIndex,
			},
			checkpoints,
		};
	},
});

export const advance = internalMutation({
	args: {
		guard: resolutionSessionGuardValidator,
		progress: v.union(
			v.literal("RouteAvailable"),
			v.literal("GrammarAvailable"),
			v.literal("ReadingAvailable"),
		),
		grammar: v.optional(resolutionGrammarProjectionValidator),
		reading: v.optional(resolutionReadingProjectionValidator),
		grammaticalCheckpoint: v.optional(resolvedGrammaticalValidator),
		readingCheckpoint: v.optional(readingCheckpointValidator),
	},
	returns: v.boolean(),
	handler: (ctx, args) => advanceResolutionSession(ctx, args),
});

export const recoverStaleRun = internalMutation({
	args: { requestId: v.string(), runToken: v.string() },
	returns: v.boolean(),
	handler: (ctx, args) => recoverStaleResolutionRun(ctx, args),
});

export const recordRunSuccess = internalMutation({
	args: {
		guard: resolutionSessionGuardValidator,
		phase: resolutionPhaseValidator,
		generationEvents: v.optional(
			v.array(resolutionGenerationEventValidator),
		),
	},
	returns: v.boolean(),
	handler: (ctx, args) => recordResolutionRunSuccess(ctx, args),
});

export const recordRunFailure = internalMutation({
	args: {
		guard: resolutionSessionGuardValidator,
		failure: v.union(
			v.object({
				kind: v.literal("Generation"),
				phase: resolutionPhaseValidator,
				failure: safeGenerationFailureValidator,
				generationEvents: v.optional(
					v.array(resolutionGenerationEventValidator),
				),
			}),
			v.object({
				kind: v.literal("Internal"),
				phase: resolutionPhaseValidator,
				diagnosticId: v.string(),
				errorName: v.string(),
				errorFingerprint: v.string(),
				generationEvents: v.optional(
					v.array(resolutionGenerationEventValidator),
				),
			}),
		),
	},
	returns: v.boolean(),
	handler: (ctx, { guard, failure }) =>
		failResolutionRun(ctx, guard, failure),
});

export const settleAfterRun = internalMutation({
	args: {
		guard: resolutionSessionGuardValidator,
		result: v.union(
			v.object({
				kind: v.literal("Complete"),
				attestationId: v.id("attestations"),
			}),
			v.object({ kind: v.literal("Unresolved") }),
		),
	},
	returns: v.null(),
	handler: async (ctx, { guard, result }) => {
		await settleResolutionRun(ctx, guard, result);
		return null;
	},
});

export const cleanup = internalMutation({
	args: {
		staleBefore: v.number(),
		terminalBefore: v.number(),
	},
	returns: v.object({ deleted: v.number(), hasMore: v.boolean() }),
	handler: async (ctx, args) => {
		assertCleanupCutoff(args.staleBefore, "staleBefore");
		assertCleanupCutoff(args.terminalBefore, "terminalBefore");
		return cleanupBatch(ctx, args);
	},
});

/**
 * The scheduled cleanup: deletes what outlived `RESOLUTION_RETENTION_MS`, one
 * batch per transaction, until nothing expired is left.
 */
export const cleanupExpired = internalMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const cutoff = Date.now() - RESOLUTION_RETENTION_MS;
		const { hasMore } = await cleanupBatch(ctx, {
			staleBefore: cutoff,
			terminalBefore: cutoff,
		});
		if (hasMore) {
			await ctx.scheduler.runAfter(
				0,
				internal.resolutionSessions.cleanupExpired,
				{},
			);
		}
		return null;
	},
});

/**
 * Deletes one batch of expired runs, else of Active sessions untouched since
 * `staleBefore` and Terminal ones since `terminalBefore`. Every row it reads
 * is deleted, so repeated batches always make progress.
 */
async function cleanupBatch(
	ctx: MutationCtx,
	cutoffs: { readonly staleBefore: number; readonly terminalBefore: number },
): Promise<{ deleted: number; hasMore: boolean }> {
	const expiredRuns = await ctx.db
		.query("resolutionRuns")
		.withIndex("by_expires_at", (q) => q.lte("expiresAt", Date.now()))
		.take(CLEANUP_BATCH_SIZE);
	if (expiredRuns.length > 0) {
		await Promise.all(expiredRuns.map((run) => ctx.db.delete(run._id)));
		// Sessions come after the runs, so there may be more.
		return { deleted: expiredRuns.length, hasMore: true };
	}
	const activeRows = await ctx.db
		.query("resolutionSessions")
		.withIndex("by_lifecycle_state_and_updated_at", (q) =>
			q
				.eq("lifecycle.state", "Active")
				.lte("updatedAt", cutoffs.staleBefore),
		)
		.take(CLEANUP_BATCH_SIZE);
	const terminalRows =
		activeRows.length === CLEANUP_BATCH_SIZE
			? []
			: await ctx.db
					.query("resolutionSessions")
					.withIndex("by_lifecycle_state_and_updated_at", (q) =>
						q
							.eq("lifecycle.state", "Terminal")
							.lte("updatedAt", cutoffs.terminalBefore),
					)
					.take(CLEANUP_BATCH_SIZE - activeRows.length);
	const rowsToDelete = [...activeRows, ...terminalRows];
	await deleteResolutionSessions(ctx, rowsToDelete);
	return {
		deleted: rowsToDelete.length,
		hasMore: rowsToDelete.length === CLEANUP_BATCH_SIZE,
	};
}

function assertIdentifier(value: string, name: string): void {
	if (value.trim().length === 0 || value.length > MAX_IDENTIFIER_LENGTH) {
		throw new Error(`${name} must contain 1 to 200 characters.`);
	}
}

function assertCleanupCutoff(value: number, name: string): void {
	if (!Number.isFinite(value) || value < 0 || value > Date.now()) {
		throw new Error(`${name} must be a finite past timestamp.`);
	}
}
