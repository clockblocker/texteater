import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { scheduleKnowledgeGeneration } from "./knowledgeGeneration";
import { inspectionJson } from "./model/inspection";
import {
	advanceResolutionSession,
	claimResolutionRun,
	deleteResolutionSessions,
	failResolutionRun,
	loadResolutionNote,
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
			assertSegmentIndex(args.clickedSegmentIndex);

			const sentence = await ctx.db.get(args.sentenceId);
			if (!sentence) throw new Error("Sentence does not exist.");
			const segment = await ctx.db
				.query("segments")
				.withIndex("by_sentence_id_and_index", (q) =>
					q
						.eq("sentenceId", args.sentenceId)
						.eq("index", args.clickedSegmentIndex),
				)
				.unique();
			if (segment?.kind !== "ResolvableText") {
				throw new Error(
					"Only a ResolvableText Segment can be clicked.",
				);
			}

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
				const attestation = await ctx.db.get(attestationId);
				if (!attestation)
					throw new Error("Attestation does not exist.");
				const reading = await ctx.db.get(attestation.readingId);
				if (!reading) throw new Error("Reading does not exist.");
				const surface = await ctx.db.get(attestation.surfaceId);
				if (surface?.language !== "de") {
					throw new Error(
						"Surface does not exist or is unsupported.",
					);
				}
				if (surface.lemmaId !== reading.lemmaId) {
					throw new Error(
						"Surface and Reading must share one Lemma.",
					);
				}
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
					readingId: reading._id,
					attestationId,
				});
				return {
					kind: "Available" as const,
					canonical: {
						readingId: reading._id,
						lemmaId: reading.lemmaId,
						surfaceId: surface._id,
						surfaceLanguage: surface.language,
						normalizedSurface: surface.normalizedSurface,
						attestationId,
					},
					target: args.routeNoteRequested
						? {
								kind: "Attestation" as const,
								attestationId,
							}
						: {
								kind: "Reading" as const,
								readingId: reading._id,
							},
				};
			}

			await ensureVisitorEncounter(ctx, {
				requestId: args.requestId,
				visitorId: args.visitorId,
				textId: sentence.textId,
				sentenceId: sentence._id,
				segmentId: segment._id,
			});
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
			v.literal("Committing"),
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
		const expiredRuns = await ctx.db
			.query("resolutionRuns")
			.withIndex("by_expires_at", (q) => q.lte("expiresAt", Date.now()))
			.take(CLEANUP_BATCH_SIZE);
		if (expiredRuns.length > 0) {
			await Promise.all(expiredRuns.map((run) => ctx.db.delete(run._id)));
			return {
				deleted: expiredRuns.length,
				hasMore: expiredRuns.length === CLEANUP_BATCH_SIZE,
			};
		}
		const activeRows = await ctx.db
			.query("resolutionSessions")
			.withIndex("by_lifecycle_state_and_updated_at", (q) =>
				q
					.eq("lifecycle.state", "Active")
					.lte("updatedAt", args.staleBefore),
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
								.lte("updatedAt", args.terminalBefore),
						)
						.take(CLEANUP_BATCH_SIZE - activeRows.length);
		const terminalReadingExists = await Promise.all(
			terminalRows.map((row) =>
				row.lifecycle.state === "Terminal" &&
				row.lifecycle.outcome === "Complete" &&
				row.readingId
					? ctx.db.get(row.readingId).then(Boolean)
					: Promise.resolve(true),
			),
		);
		const rowsToDelete = [
			...activeRows,
			...terminalRows.filter(
				(_row, index) => terminalReadingExists[index],
			),
		];
		await deleteResolutionSessions(ctx, rowsToDelete);
		return {
			deleted: rowsToDelete.length,
			hasMore: rowsToDelete.length === CLEANUP_BATCH_SIZE,
		};
	},
});

function assertIdentifier(value: string, name: string): void {
	if (value.trim().length === 0 || value.length > MAX_IDENTIFIER_LENGTH) {
		throw new Error(`${name} must contain 1 to 200 characters.`);
	}
}

function assertSegmentIndex(value: number): void {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new Error(
			"clickedSegmentIndex must be a non-negative safe integer.",
		);
	}
}

function assertCleanupCutoff(value: number, name: string): void {
	if (!Number.isFinite(value) || value < 0 || value > Date.now()) {
		throw new Error(`${name} must be a finite past timestamp.`);
	}
}
