import { type Infer, v } from "convex/values";
import { internal } from "./_generated/api";
import {
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import { scheduleKnowledgeGeneration } from "./knowledgeGeneration";
import {
	assertResolutionProgressTransition,
	loadResolutionNote,
	type ResolutionLifecycleSource,
	type ResolutionProgress,
	requireActiveResolutionSession,
	resolutionNoteValidator,
	resolutionProgressHasReached,
	settleComplete,
	settleFailed,
	settleUnresolved,
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
import {
	ensureVisitorEncounter,
	findVisitorEncounter,
} from "./model/visitorClicks";

const MAX_IDENTIFIER_LENGTH = 200;
const CLEANUP_BATCH_SIZE = 200;
export const STALE_RUN_AFTER_MS = 11 * 60 * 1_000;
export const DURABLE_RETRY_DEADLINE_MS = 15 * 60 * 1_000;
export const MAX_RESOLUTION_RUNS = 3;
const DURABLE_RETRY_BASE_DELAY_MS = 5_000;
const RESOLUTION_RUN_RETENTION_MS = 24 * 60 * 60 * 1_000;

export const selectSegment = mutation({
	args: {
		requestId: v.string(),
		visitorId: v.string(),
		sentenceId: v.id("sentences"),
		clickedSegmentIndex: v.number(),
		routeNoteRequested: v.boolean(),
	},
	returns: v.union(
		v.object({
			kind: v.literal("Available"),
			target: v.union(
				v.object({
					kind: v.literal("UnitReadingNote"),
					readingId: v.id("readings"),
				}),
				v.object({
					kind: v.literal("RouteNote"),
					routeKind: v.literal("Attestation"),
					id: v.id("attestations"),
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
			throw new Error("Only a ResolvableText Segment can be clicked.");
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
				Boolean(existing.routeNoteRequested) !== args.routeNoteRequested
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
			if (!attestation) throw new Error("Attestation does not exist.");
			const reading = await ctx.db.get(attestation.readingId);
			if (!reading) throw new Error("Reading does not exist.");
			await ensureVisitorEncounter(ctx, {
				requestId: args.requestId,
				visitorId: args.visitorId,
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
				target: args.routeNoteRequested
					? {
							kind: "RouteNote" as const,
							routeKind: "Attestation" as const,
							id: attestationId,
						}
					: {
							kind: "UnitReadingNote" as const,
							readingId: reading._id,
						},
			};
		}

		const now = Date.now();
		const runToken = crypto.randomUUID();
		await ctx.db.insert("resolutionSessions", {
			requestId: args.requestId,
			visitorId: args.visitorId,
			sentenceId: args.sentenceId,
			segmentId: segment._id,
			clickedSegmentIndex: args.clickedSegmentIndex,
			routeNoteRequested: args.routeNoteRequested,
			runToken,
			lifecycle: {
				state: "Active",
				progress: "Starting",
				activity: "Scheduled",
			},
			runNumber: 1,
			retryDeadlineAt: now + DURABLE_RETRY_DEADLINE_MS,
			route: {
				textId: sentence.textId,
				sentenceId: sentence._id,
				stitchedText: sentence.stitchedText,
				clickedSegmentIndex: args.clickedSegmentIndex,
				selectedSegment: segment.text,
			},
			createdAt: now,
			updatedAt: now,
		});
		await ctx.scheduler.runAfter(
			0,
			internal.orchestration.runResolutionSession,
			{
				requestId: args.requestId,
				runToken,
				segmentId: segment._id,
			},
		);
		await ctx.scheduler.runAfter(
			STALE_RUN_AFTER_MS,
			internal.resolutionSessions.recoverStaleRun,
			{ requestId: args.requestId, runToken },
		);
		return {
			kind: "Resolving" as const,
			requestId: args.requestId,
			progress: "Starting" as const,
			activity: "Scheduled" as const,
			deduplicated: false,
		};
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
		const session = await ctx.db
			.query("resolutionSessions")
			.withIndex("by_request_id", (q) =>
				q.eq("requestId", args.requestId),
			)
			.unique();
		if (!session || session.visitorId !== args.visitorId) {
			return { retried: false };
		}
		const { lifecycle } = session;
		if (
			lifecycle.state !== "Terminal" ||
			lifecycle.outcome !== "PermanentFailure"
		) {
			return { retried: false };
		}
		// Manual retry intentionally resets every permanent failure category.
		// Unlike automatic retry, it represents an operator/learner decision made
		// after provider configuration, model policy, or catalog data may change.

		const now = Date.now();
		const runToken = crypto.randomUUID();
		await ctx.db.patch(session._id, {
			runToken,
			runNumber: 1,
			lifecycle: {
				state: "Active",
				progress: lifecycle.progress,
				activity: "Scheduled",
			},
			retryDeadlineAt: now + DURABLE_RETRY_DEADLINE_MS,
			nextRetryAt: undefined,
			failureCode: undefined,
			diagnosticId: undefined,
			failureMessage: undefined,
			updatedAt: now,
		});
		await ctx.scheduler.runAfter(
			0,
			internal.orchestration.runResolutionSession,
			{
				requestId: session.requestId,
				runToken,
				segmentId: session.segmentId,
			},
		);
		await ctx.scheduler.runAfter(
			STALE_RUN_AFTER_MS,
			internal.resolutionSessions.recoverStaleRun,
			{ requestId: session.requestId, runToken },
		);
		return { retried: true };
	},
});

export const getRunInput = internalQuery({
	args: { guard: resolutionSessionGuardValidator },
	returns: v.union(
		v.null(),
		v.object({
			requestId: v.string(),
			visitorId: v.string(),
			sentenceId: v.id("sentences"),
			clickedSegmentIndex: v.number(),
			runNumber: v.number(),
			grammaticalCheckpoint: v.optional(resolvedGrammaticalValidator),
			readingCheckpoint: v.optional(
				v.object({
					resolution: v.object({
						decision: v.union(v.literal("Reuse"), v.literal("New")),
						emojiDescription: v.string(),
					}),
					reading: readingValueValidator,
				}),
			),
		}),
	),
	handler: async (ctx, { guard }) => {
		const session = await ctx.db
			.query("resolutionSessions")
			.withIndex("by_request_id", (q) =>
				q.eq("requestId", guard.requestId),
			)
			.unique();
		if (
			!session ||
			session.runToken !== guard.runToken ||
			session.segmentId !== guard.segmentId ||
			session.lifecycle.state === "Terminal"
		) {
			return null;
		}
		const segment = await ctx.db.get(guard.segmentId);
		if (
			!segment ||
			segment.sentenceId !== session.sentenceId ||
			segment.index !== session.clickedSegmentIndex ||
			segment.kind !== "ResolvableText"
		) {
			return null;
		}
		return {
			requestId: session.requestId,
			visitorId: session.visitorId,
			sentenceId: session.sentenceId,
			clickedSegmentIndex: session.clickedSegmentIndex,
			runNumber: session.runNumber ?? 1,
			...(session.grammaticalCheckpoint
				? { grammaticalCheckpoint: session.grammaticalCheckpoint }
				: {}),
			...(session.readingCheckpoint
				? { readingCheckpoint: session.readingCheckpoint }
				: {}),
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
		readingCheckpoint: v.optional(
			v.object({
				resolution: v.object({
					decision: v.union(v.literal("Reuse"), v.literal("New")),
					emojiDescription: v.string(),
				}),
				reading: readingValueValidator,
			}),
		),
	},
	returns: v.boolean(),
	handler: async (ctx, args) => {
		const session = await requireActiveResolutionSession(ctx, args.guard);
		const { lifecycle } = session;
		if (lifecycle.progress === args.progress) return false;
		if (resolutionProgressHasReached(lifecycle.progress, args.progress)) {
			return false;
		}
		assertResolutionProgressTransition(lifecycle.progress, args.progress);
		if (args.progress === "GrammarAvailable" && !args.grammar) {
			throw new Error("GrammarAvailable requires a Grammar projection.");
		}
		if (args.progress === "ReadingAvailable" && !args.reading) {
			throw new Error("ReadingAvailable requires a Reading projection.");
		}
		await ctx.db.patch(session._id, {
			lifecycle: {
				state: "Active",
				progress: args.progress,
				activity: "Running",
			},
			...(args.grammar ? { grammar: args.grammar } : {}),
			...(args.reading ? { reading: args.reading } : {}),
			...(args.grammaticalCheckpoint
				? { grammaticalCheckpoint: args.grammaticalCheckpoint }
				: {}),
			...(args.readingCheckpoint
				? { readingCheckpoint: args.readingCheckpoint }
				: {}),
			updatedAt: Date.now(),
		});
		return true;
	},
});

export const recoverStaleRun = internalMutation({
	args: { requestId: v.string(), runToken: v.string() },
	returns: v.boolean(),
	handler: async (ctx, args) => {
		const session = await ctx.db
			.query("resolutionSessions")
			.withIndex("by_request_id", (q) =>
				q.eq("requestId", args.requestId),
			)
			.unique();
		if (
			!session ||
			session.runToken !== args.runToken ||
			session.lifecycle.state === "Terminal"
		) {
			return false;
		}

		const now = Date.now();
		const age = now - session.updatedAt;
		if (age < STALE_RUN_AFTER_MS) {
			await ctx.scheduler.runAfter(
				STALE_RUN_AFTER_MS - age,
				internal.resolutionSessions.recoverStaleRun,
				args,
			);
			return false;
		}

		const runNumber = session.runNumber ?? 1;
		const diagnosticId = crypto.randomUUID();
		const progress = session.lifecycle.progress;
		await upsertResolutionRun(ctx, session, {
			phase: phaseForProgress(progress),
			state: "Failed",
			failureCode: "Internal",
			diagnosticId,
			errorName: "StaleResolutionRun",
			errorFingerprint: "stale-run-timeout",
		});
		if (
			runNumber >= MAX_RESOLUTION_RUNS ||
			now >= (session.retryDeadlineAt ?? now + DURABLE_RETRY_DEADLINE_MS)
		) {
			await settleFailed(
				ctx,
				session,
				"Resolution could not be completed.",
				"Internal",
				diagnosticId,
			);
			return true;
		}

		const runToken = crypto.randomUUID();
		await ctx.db.patch(session._id, {
			runToken,
			runNumber: runNumber + 1,
			lifecycle: {
				state: "Active",
				progress,
				activity: "Scheduled",
			},
			readingId: undefined,
			attestationId: undefined,
			failureCode: undefined,
			diagnosticId: undefined,
			failureMessage: undefined,
			nextRetryAt: undefined,
			updatedAt: Date.now(),
		});
		await ctx.scheduler.runAfter(
			0,
			internal.orchestration.runResolutionSession,
			{
				requestId: session.requestId,
				runToken,
				segmentId: session.segmentId,
			},
		);
		await ctx.scheduler.runAfter(
			STALE_RUN_AFTER_MS,
			internal.resolutionSessions.recoverStaleRun,
			{ requestId: session.requestId, runToken },
		);
		return true;
	},
});

export const markRunStarted = internalMutation({
	args: { guard: resolutionSessionGuardValidator },
	returns: v.boolean(),
	handler: async (ctx, { guard }) => {
		const session = await requireActiveResolutionSession(ctx, guard);
		const { lifecycle } = session;
		if (lifecycle.state === "Active" && lifecycle.activity === "Running") {
			return false;
		}
		await upsertResolutionRun(ctx, session, {
			phase: phaseForProgress(lifecycle.progress),
			state: "Running",
		});
		await ctx.db.patch(session._id, {
			lifecycle: {
				state: "Active",
				progress: lifecycle.progress,
				activity: "Running",
			},
			updatedAt: Date.now(),
		});
		return true;
	},
});

export const recordRunFailure = internalMutation({
	args: {
		guard: resolutionSessionGuardValidator,
		phase: resolutionPhaseValidator,
		failure: safeGenerationFailureValidator,
		generationEvents: v.optional(
			v.array(resolutionGenerationEventValidator),
		),
	},
	returns: v.object({ scheduled: v.boolean() }),
	handler: async (ctx, { guard, phase, failure, generationEvents }) => {
		assertSafeGenerationFailure(failure);
		const session = await requireActiveResolutionSession(ctx, guard);
		const { lifecycle } = session;
		const now = Date.now();
		const runNumber = session.runNumber ?? 1;
		const diagnosticId = crypto.randomUUID();
		const retryDeadlineAt =
			session.retryDeadlineAt ?? now + DURABLE_RETRY_DEADLINE_MS;
		const delayMs = Math.max(
			Math.min(
				60_000,
				DURABLE_RETRY_BASE_DELAY_MS * 2 ** (runNumber - 1),
			),
			failure.retryAfterMs ?? 0,
		);
		const canRetry =
			failure.retryable &&
			runNumber < MAX_RESOLUTION_RUNS &&
			now + delayMs <= retryDeadlineAt;
		await upsertResolutionRun(ctx, session, {
			phase,
			state: "Failed",
			failure,
			failureCode: failure.category,
			diagnosticId,
			...(canRetry ? { delayMs } : {}),
			...(generationEvents ? { generationEvents } : {}),
		});
		if (!canRetry) {
			await ctx.db.patch(session._id, {
				lifecycle: {
					state: "Terminal",
					progress: lifecycle.progress,
					outcome: "PermanentFailure",
				},
				failureCode: failure.category,
				diagnosticId,
				failureMessage: publicFailureMessage(phase, failure.category),
				nextRetryAt: undefined,
				updatedAt: now,
			});
			return { scheduled: false };
		}

		const runToken = crypto.randomUUID();
		await ctx.db.patch(session._id, {
			runToken,
			runNumber: runNumber + 1,
			lifecycle: {
				state: "Active",
				progress: lifecycle.progress,
				activity: "WaitingForRetry",
			},
			failureCode: failure.category,
			diagnosticId,
			failureMessage: publicFailureMessage(phase, failure.category),
			nextRetryAt: now + delayMs,
			updatedAt: now,
		});
		await ctx.scheduler.runAfter(
			delayMs,
			internal.orchestration.runResolutionSession,
			{
				requestId: session.requestId,
				runToken,
				segmentId: session.segmentId,
			},
		);
		await ctx.scheduler.runAfter(
			delayMs + STALE_RUN_AFTER_MS,
			internal.resolutionSessions.recoverStaleRun,
			{ requestId: session.requestId, runToken },
		);
		return { scheduled: true };
	},
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
	handler: async (ctx, { guard, phase, generationEvents }) => {
		const session = await ctx.db
			.query("resolutionSessions")
			.withIndex("by_request_id", (q) =>
				q.eq("requestId", guard.requestId),
			)
			.unique();
		if (
			!session ||
			session.runToken !== guard.runToken ||
			session.segmentId !== guard.segmentId
		) {
			return false;
		}
		await upsertResolutionRun(ctx, session, {
			phase,
			state: "Succeeded",
			...(generationEvents ? { generationEvents } : {}),
		});
		return true;
	},
});

export const recordInternalRunFailure = internalMutation({
	args: {
		guard: resolutionSessionGuardValidator,
		phase: resolutionPhaseValidator,
		diagnosticId: v.string(),
		errorName: v.string(),
		errorFingerprint: v.string(),
		generationEvents: v.optional(
			v.array(resolutionGenerationEventValidator),
		),
	},
	returns: v.boolean(),
	handler: async (ctx, args) => {
		assertIdentifier(args.diagnosticId, "diagnosticId");
		assertSafeOperationalString(args.errorName, "errorName");
		assertSafeOperationalString(args.errorFingerprint, "errorFingerprint");
		const session = await requireActiveResolutionSession(ctx, args.guard);
		await upsertResolutionRun(ctx, session, {
			phase: args.phase,
			state: "Failed",
			failureCode: "Internal",
			diagnosticId: args.diagnosticId,
			errorName: args.errorName,
			errorFingerprint: args.errorFingerprint,
			...(args.generationEvents
				? { generationEvents: args.generationEvents }
				: {}),
		});
		await settleFailed(
			ctx,
			session,
			"Resolution could not be completed.",
			"Internal",
			args.diagnosticId,
		);
		return true;
	},
});

export const settleAfterRun = internalMutation({
	args: {
		guard: resolutionSessionGuardValidator,
		result: v.union(
			v.object({
				kind: v.literal("Complete"),
				readingId: v.id("readings"),
				attestationId: v.id("attestations"),
				grammar: resolutionGrammarProjectionValidator,
				reading: resolutionReadingProjectionValidator,
			}),
			v.object({ kind: v.literal("Unresolved") }),
			v.object({
				kind: v.literal("Failed"),
				message: v.string(),
			}),
		),
	},
	returns: v.boolean(),
	handler: async (ctx, { guard, result }) => {
		const session = await requireActiveResolutionSession(ctx, guard);
		if (session.lifecycle.state === "Terminal") return false;
		if (result.kind === "Complete") {
			const [reading, attestation, encounter] = await Promise.all([
				ctx.db.get(result.readingId),
				ctx.db.get(result.attestationId),
				findVisitorEncounter(ctx, {
					visitorId: session.visitorId,
					segmentId: session.segmentId,
				}),
			]);
			if (
				!reading ||
				!attestation ||
				attestation.readingId !== reading._id ||
				encounter?.attestationId !== attestation._id
			) {
				throw new Error(
					"The completed Resolution Session has no matching Visitor Encounter.",
				);
			}
			await settleComplete(ctx, session, result);
			await markRunSucceeded(ctx, session);
			await scheduleKnowledgeGeneration(ctx, {
				attemptKey: session.requestId,
				visitorId: session.visitorId,
				readingId: result.readingId,
				attestationId: result.attestationId,
			});
			return true;
		}
		if (result.kind === "Unresolved") {
			await settleUnresolved(ctx, session);
			await markRunSucceeded(ctx, session);
			return true;
		}
		const diagnosticId = await settleFailed(ctx, session, result.message);
		await markRunFailed(ctx, session, diagnosticId);
		return true;
	},
});

export const cleanup = mutation({
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
			for (const run of expiredRuns) await ctx.db.delete(run._id);
			return {
				deleted: expiredRuns.length,
				hasMore: expiredRuns.length === CLEANUP_BATCH_SIZE,
			};
		}
		let deleted = 0;
		for (const state of ["Active", "Terminal"] as const) {
			const cutoff =
				state === "Terminal" ? args.terminalBefore : args.staleBefore;
			const rows = await ctx.db
				.query("resolutionSessions")
				.withIndex("by_lifecycle_state_and_updated_at", (q) =>
					q.eq("lifecycle.state", state).lte("updatedAt", cutoff),
				)
				.take(CLEANUP_BATCH_SIZE - deleted);
			for (const row of rows) {
				if (
					row.lifecycle.state === "Terminal" &&
					row.lifecycle.outcome === "Complete"
				) {
					if (!row.readingId || !(await ctx.db.get(row.readingId))) {
						continue;
					}
				}
				await ctx.db.delete(row._id);
				deleted += 1;
			}
			if (deleted === CLEANUP_BATCH_SIZE) break;
		}
		return {
			deleted,
			hasMore: deleted === CLEANUP_BATCH_SIZE,
		};
	},
});

function assertIdentifier(value: string, name: string): void {
	if (value.trim().length === 0 || value.length > MAX_IDENTIFIER_LENGTH) {
		throw new Error(`${name} must contain 1 to 200 characters.`);
	}
}

function assertSafeOperationalString(value: string, name: string): void {
	if (value.length === 0 || value.length > 200) {
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

async function markRunSucceeded(
	ctx: Parameters<typeof requireActiveResolutionSession>[0],
	session: ResolutionRunIdentity,
): Promise<void> {
	await upsertResolutionRun(ctx, session, {
		phase: "Commit",
		state: "Succeeded",
	});
}

async function markRunFailed(
	ctx: Parameters<typeof requireActiveResolutionSession>[0],
	session: ResolutionRunIdentity,
	diagnosticId: string,
): Promise<void> {
	await upsertResolutionRun(ctx, session, {
		phase: phaseForProgress(session.lifecycle.progress),
		state: "Failed",
		failureCode: "Internal",
		diagnosticId,
	});
}

type SafeGenerationFailure = Infer<typeof safeGenerationFailureValidator>;
type ResolutionGenerationEvent = Infer<
	typeof resolutionGenerationEventValidator
>;

type ResolutionRunIdentity = ResolutionLifecycleSource & {
	readonly requestId: string;
	readonly runToken: string;
	readonly runNumber?: number;
};

type ResolutionRunUpdate = {
	readonly phase: Infer<typeof resolutionPhaseValidator>;
	readonly state: "Running" | "Failed" | "Succeeded";
	readonly failure?: SafeGenerationFailure;
	readonly failureCode?:
		| SafeGenerationFailure["category"]
		| "CatalogMiss"
		| "Internal";
	readonly diagnosticId?: string;
	readonly errorName?: string;
	readonly errorFingerprint?: string;
	readonly generationEvents?: readonly ResolutionGenerationEvent[];
	readonly delayMs?: number;
};

async function upsertResolutionRun(
	ctx: Parameters<typeof requireActiveResolutionSession>[0],
	session: ResolutionRunIdentity,
	update: ResolutionRunUpdate,
): Promise<void> {
	const now = Date.now();
	const run = await ctx.db
		.query("resolutionRuns")
		.withIndex("by_request_id_and_run_token", (q) =>
			q
				.eq("requestId", session.requestId)
				.eq("runToken", session.runToken),
		)
		.unique();
	const values = {
		phase: update.phase,
		state: update.state,
		...(update.failure ? { failure: update.failure } : {}),
		...(update.failureCode ? { failureCode: update.failureCode } : {}),
		...(update.diagnosticId ? { diagnosticId: update.diagnosticId } : {}),
		...(update.errorName ? { errorName: update.errorName } : {}),
		...(update.errorFingerprint
			? { errorFingerprint: update.errorFingerprint }
			: {}),
		...(update.generationEvents
			? { generationEvents: [...update.generationEvents] }
			: {}),
		...(update.delayMs === undefined ? {} : { delayMs: update.delayMs }),
		...(update.state === "Running" ? {} : { finishedAt: now }),
		expiresAt: now + RESOLUTION_RUN_RETENTION_MS,
	};
	if (run) {
		await ctx.db.patch(run._id, values);
		return;
	}
	await ctx.db.insert("resolutionRuns", {
		requestId: session.requestId,
		runToken: session.runToken,
		runNumber: session.runNumber ?? 1,
		startedAt: now,
		...values,
	});
}

function phaseForProgress(
	progress: ResolutionProgress,
): Infer<typeof resolutionPhaseValidator> {
	return progress === "Starting"
		? "Route"
		: progress === "RouteAvailable"
			? "Grammar"
			: progress === "GrammarAvailable"
				? "Reading"
				: "Commit";
}

function assertSafeGenerationFailure(failure: SafeGenerationFailure): void {
	if (
		!Number.isSafeInteger(failure.attempts) ||
		failure.attempts < 0 ||
		failure.attempts > 10
	) {
		throw new Error("Generation failure attempts are invalid.");
	}
	if (
		failure.status !== undefined &&
		(!Number.isSafeInteger(failure.status) ||
			failure.status < 100 ||
			failure.status > 599)
	) {
		throw new Error("Generation failure status is invalid.");
	}
	if (
		failure.retryAfterMs !== undefined &&
		(!Number.isSafeInteger(failure.retryAfterMs) ||
			failure.retryAfterMs < 0)
	) {
		throw new Error("Generation failure Retry-After is invalid.");
	}
	for (const value of [failure.providerCode, failure.providerRequestId]) {
		if (value !== undefined && (value.length === 0 || value.length > 200)) {
			throw new Error("Generation failure metadata is invalid.");
		}
	}
}

function publicFailureMessage(
	phase: Infer<typeof resolutionPhaseValidator>,
	category: SafeGenerationFailure["category"],
): string {
	const subject = phase === "Reading" ? "Reading generation" : "Resolution";
	return category === "Network" ||
		category === "RateLimited" ||
		category === "ProviderUnavailable"
		? `${subject} is temporarily unavailable.`
		: `${subject} could not be completed.`;
}
