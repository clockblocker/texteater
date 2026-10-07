import type { Infer } from "convex/values";
import { assertIdentifier } from "../../server/identifiers";
import {
	assertSafeGenerationFailure,
	type GenerationFailure,
	publicFailureMessage,
	type ResolutionGenerationEvent,
	safeFailureMessage,
} from "../../server/resolutionFailure";
import {
	assertOperationalString,
	assertResolutionProgressTransition,
	guardMatches,
	MAX_RESOLUTION_RUNS,
	phaseForProgress,
	RECOVERY_DEADLINE_MS,
	RESOLUTION_RETENTION_MS,
	type ResolutionFailureCode,
	type ResolutionPhase,
	type ResolutionProgress,
	type ResolutionSessionGuard,
	resolutionProgressHasReached,
	STALE_RUN_AFTER_MS,
	type StoredResolutionGrammar,
	type StoredResolutionReading,
} from "../../server/resolutionLifecycle";
import {
	projectResolutionGrammar,
	projectResolutionReading,
} from "../../server/resolutionSessionProjection";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { restoreGrammaticalCheckpoint } from "./grammarCheckpoint";
import { inspectionRequested } from "./inspection";
import { scheduleKnowledgeGeneration } from "./knowledgeScheduling";
import { reconstructReusableAttestation } from "./resolutionLookup";
import type {
	readingCheckpointValidator,
	resolvedGrammaticalValidator,
} from "./validators";
import { ensureVisitorEncounter } from "./visitorClicks";

/**
 * The Resolution Session module. It owns every session transition: start,
 * claim, progress, restart, stale recovery, each Terminal outcome, and
 * deletion. Each transition keeps the Segment Resolution State (ADR-0004) in
 * step inside this module, and one scheduling path starts every run. Callers
 * ask it to move a session; nothing else writes a session row. The rules it
 * applies that need no database live in `server/resolutionLifecycle.ts`.
 */

type ReadingCheckpoint = Infer<typeof readingCheckpointValidator>;
type ResolutionSession = Doc<"resolutionSessions">;

async function findSession(ctx: QueryCtx, requestId: string) {
	return ctx.db
		.query("resolutionSessions")
		.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
		.unique();
}

async function sourceSegmentStillMatches(
	ctx: QueryCtx,
	session: ResolutionSession,
): Promise<boolean> {
	const segment = await ctx.db.get(session.segmentId);
	return (
		segment !== null &&
		segment.sentenceId === session.sentenceId &&
		segment.index === session.clickedSegmentIndex &&
		segment.kind === "ResolvableText"
	);
}

export async function requireActiveResolutionSession(
	ctx: MutationCtx,
	guard: ResolutionSessionGuard,
): Promise<ResolutionSession> {
	const session = await findSession(ctx, guard.requestId);
	if (
		!session ||
		!guardMatches(session, guard) ||
		session.lifecycle.state === "Terminal"
	) {
		throw new Error("Resolution Session is no longer active.");
	}
	if (!(await sourceSegmentStillMatches(ctx, session))) {
		throw new Error(
			"Resolution Session source Segment is no longer valid.",
		);
	}
	return session;
}

/**
 * The active session an Occurrence commit runs under. The commit settles it
 * in the same transaction, so the first valid commit wins (ADR-0004).
 */
export async function requireCommittingSession(
	ctx: MutationCtx,
	guard: ResolutionSessionGuard,
	selection: {
		readonly requestId: string;
		readonly visitorId: string;
		readonly sentenceId: Id<"sentences">;
		readonly clickedSegmentIndex: number;
	},
): Promise<ResolutionSession> {
	const session = await requireActiveResolutionSession(ctx, guard);
	if (
		session.requestId !== selection.requestId ||
		session.visitorId !== selection.visitorId ||
		session.sentenceId !== selection.sentenceId ||
		session.clickedSegmentIndex !== selection.clickedSegmentIndex
	) {
		throw new Error("Resolution Session does not match the Click commit.");
	}
	return session;
}

type SegmentTerminalResolutionState = "Unresolved" | "PermanentFailure";

async function beginSegmentResolution(
	ctx: MutationCtx,
	segmentId: Id<"segments">,
): Promise<boolean> {
	const segment = await ctx.db.get(segmentId);
	if (!segment || segment.attestationMembership) return false;
	const activeSessionCount =
		segment.resolutionState?.kind === "Active"
			? segment.resolutionState.activeSessionCount
			: 0;
	await ctx.db.patch(segmentId, {
		resolutionState: {
			kind: "Active",
			activeSessionCount: activeSessionCount + 1,
		},
	});
	return true;
}

/** Ends `endedSessionCount` Active sessions' contributions to one Segment. */
async function finishSegmentResolution(
	ctx: MutationCtx,
	segmentId: Id<"segments">,
	outcome: SegmentTerminalResolutionState,
	endedSessionCount = 1,
): Promise<void> {
	const segment = await ctx.db.get(segmentId);
	if (!segment) return;
	if (segment.attestationMembership) {
		if (segment.resolutionState) {
			await ctx.db.patch(segmentId, { resolutionState: undefined });
		}
		return;
	}
	if (
		segment.resolutionState?.kind === "Active" &&
		segment.resolutionState.activeSessionCount > endedSessionCount
	) {
		await ctx.db.patch(segmentId, {
			resolutionState: {
				kind: "Active",
				activeSessionCount:
					segment.resolutionState.activeSessionCount -
					endedSessionCount,
			},
		});
		return;
	}
	await ctx.db.patch(segmentId, { resolutionState: { kind: outcome } });
}

async function scheduleRun(
	ctx: MutationCtx,
	run: {
		readonly requestId: string;
		readonly runToken: string;
		readonly segmentId: Id<"segments">;
	},
	inspect: boolean,
): Promise<void> {
	await ctx.scheduler.runAfter(
		0,
		internal.orchestration.runResolutionSession,
		{
			requestId: run.requestId,
			runToken: run.runToken,
			segmentId: run.segmentId,
			...(inspect ? { inspect } : {}),
		},
	);
	await ctx.scheduler.runAfter(
		STALE_RUN_AFTER_MS,
		internal.resolutionSessions.recoverStaleRun,
		{ requestId: run.requestId, runToken: run.runToken },
	);
}

/**
 * Starts a fresh run of `session` under a new run token. It resumes from the
 * session's checkpoints unless `resolveAgain` discards them.
 */
async function restartRun(
	ctx: MutationCtx,
	session: ResolutionSession,
	values: {
		readonly runNumber: number;
		readonly retryDeadlineAt?: number;
		readonly resolveAgain?: boolean;
	},
): Promise<void> {
	const runToken = crypto.randomUUID();
	await ctx.db.patch(session._id, {
		runToken,
		runNumber: values.runNumber,
		...(values.retryDeadlineAt === undefined
			? {}
			: { retryDeadlineAt: values.retryDeadlineAt }),
		lifecycle: {
			state: "Active",
			progress: values.resolveAgain
				? "Starting"
				: session.lifecycle.progress,
			activity: "Scheduled",
		},
		...(values.resolveAgain
			? {
					grammar: undefined,
					reading: undefined,
					grammaticalCheckpoint: undefined,
					readingCheckpoint: undefined,
				}
			: {}),
		readingId: undefined,
		attestationId: undefined,
		failureCode: undefined,
		diagnosticId: undefined,
		failureMessage: undefined,
		updatedAt: Date.now(),
	});
	await scheduleRun(
		ctx,
		{
			requestId: session.requestId,
			runToken,
			segmentId: session.segmentId,
		},
		await inspectionRequested(ctx, session.requestId),
	);
}

/**
 * The Visitor's Active session on a Segment, which a repeat Segment Selection
 * joins instead of starting another run. Other Visitors' sessions stay
 * independent (ADR-0004).
 */
export async function findActiveVisitorSession(
	ctx: QueryCtx,
	visitorId: string,
	segmentId: Id<"segments">,
): Promise<ResolutionSession | null> {
	return ctx.db
		.query("resolutionSessions")
		.withIndex("by_visitor_id_and_segment_id", (q) =>
			q.eq("visitorId", visitorId).eq("segmentId", segmentId),
		)
		.filter((q) => q.eq(q.field("lifecycle.state"), "Active"))
		.first();
}

/**
 * Starts the Resolution Session a Segment Selection asked for. The caller
 * has recorded the Visitor Encounter (ADR-0002).
 */
export async function startResolutionSession(
	ctx: MutationCtx,
	input: {
		readonly requestId: string;
		readonly visitorId: string;
		readonly sentence: Doc<"sentences">;
		readonly segment: Doc<"segments">;
		readonly routeNoteRequested: boolean;
		readonly inspect: boolean;
	},
): Promise<void> {
	const now = Date.now();
	const runToken = crypto.randomUUID();
	await beginSegmentResolution(ctx, input.segment._id);
	await ctx.db.insert("resolutionSessions", {
		requestId: input.requestId,
		visitorId: input.visitorId,
		sentenceId: input.sentence._id,
		segmentId: input.segment._id,
		clickedSegmentIndex: input.segment.index,
		routeNoteRequested: input.routeNoteRequested,
		runToken,
		lifecycle: {
			state: "Active",
			progress: "Starting",
			activity: "Scheduled",
		},
		runNumber: 1,
		retryDeadlineAt: now + RECOVERY_DEADLINE_MS,
		route: {
			textId: input.sentence.textId,
			sentenceId: input.sentence._id,
			stitchedText: input.sentence.stitchedText,
			clickedSegmentIndex: input.segment.index,
			selectedSegment: input.segment.text,
		},
		createdAt: now,
		updatedAt: now,
	});
	await scheduleRun(
		ctx,
		{ requestId: input.requestId, runToken, segmentId: input.segment._id },
		input.inspect,
	);
}

/**
 * A learner's retry of a PermanentFailure. Unlike stale recovery it retries
 * every failure category, since provider configuration, model policy, or
 * catalog data may have changed since. A retry after a commit conflict
 * resolves again from the start, because its saved decisions would only
 * conflict again; any other retry resumes from the saved checkpoints. While
 * the Visitor's later click on the Segment still runs, a retry starts nothing.
 */
export async function retryResolutionSession(
	ctx: MutationCtx,
	input: { readonly requestId: string; readonly visitorId: string },
): Promise<boolean> {
	const session = await findSession(ctx, input.requestId);
	if (!session || session.visitorId !== input.visitorId) return false;
	const { lifecycle } = session;
	if (
		lifecycle.state !== "Terminal" ||
		lifecycle.outcome !== "PermanentFailure"
	) {
		return false;
	}
	// Another session committed the Segment since: the retry lands on it.
	const committed = (await ctx.db.get(session.segmentId))
		?.attestationMembership?.attestationId;
	if (committed) {
		await completeResolutionSession(ctx, session, committed);
		return true;
	}
	// The Visitor clicked the Segment again since, and that session runs it.
	if (
		await findActiveVisitorSession(
			ctx,
			session.visitorId,
			session.segmentId,
		)
	) {
		return false;
	}
	if (!(await beginSegmentResolution(ctx, session.segmentId))) return false;
	await restartRun(ctx, session, {
		runNumber: 1,
		retryDeadlineAt: Date.now() + RECOVERY_DEADLINE_MS,
		resolveAgain:
			session.failureCode === "DictionaryConflict" ||
			session.failureCode === "MembershipConflict",
	});
	return true;
}

/**
 * Claims a scheduled run and returns its session with the checkpoints it
 * resumes from, or null when the run is stale or already claimed.
 */
export async function claimResolutionRun(
	ctx: MutationCtx,
	guard: ResolutionSessionGuard,
): Promise<{
	session: ResolutionSession;
	checkpoints: {
		grammatical?: Infer<typeof resolvedGrammaticalValidator>;
		reading?: ReadingCheckpoint;
	};
} | null> {
	const session = await findSession(ctx, guard.requestId);
	if (
		!session ||
		!guardMatches(session, guard) ||
		session.lifecycle.state === "Terminal" ||
		session.lifecycle.activity === "Running" ||
		!(await sourceSegmentStillMatches(ctx, session))
	) {
		return null;
	}
	await upsertResolutionRun(ctx, session, {
		phase: phaseForProgress(session.lifecycle.progress),
		state: "Running",
	});
	await ctx.db.patch(session._id, {
		lifecycle: {
			state: "Active",
			progress:
				session.lifecycle.progress === "Starting"
					? "RouteAvailable"
					: session.lifecycle.progress,
			activity: "Running",
		},
		updatedAt: Date.now(),
	});
	const grammatical = restoreGrammaticalCheckpoint(session);
	return {
		session,
		checkpoints: {
			...(grammatical ? { grammatical } : {}),
			...(grammatical && session.readingCheckpoint
				? { reading: session.readingCheckpoint }
				: {}),
		},
	};
}

export async function advanceResolutionSession(
	ctx: MutationCtx,
	args: {
		readonly guard: ResolutionSessionGuard;
		/** Committing is written only by the commit transaction itself. */
		readonly progress: Exclude<
			ResolutionProgress,
			"Starting" | "Committing"
		>;
		readonly grammar?: StoredResolutionGrammar;
		readonly reading?: StoredResolutionReading;
		readonly grammaticalCheckpoint?: Infer<
			typeof resolvedGrammaticalValidator
		>;
		readonly readingCheckpoint?: ReadingCheckpoint;
	},
): Promise<boolean> {
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
}

/**
 * Recovers a run that went quiet: a crashed or lost action. It restarts the
 * run until the run limit or the recovery deadline, then fails the session.
 */
export async function recoverStaleResolutionRun(
	ctx: MutationCtx,
	args: { readonly requestId: string; readonly runToken: string },
): Promise<boolean> {
	const session = await findSession(ctx, args.requestId);
	if (
		!session ||
		!guardMatches(session, args) ||
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
	await upsertResolutionRun(ctx, session, {
		phase: phaseForProgress(session.lifecycle.progress),
		state: "Failed",
		failureCode: "Internal",
		diagnosticId,
		errorName: "StaleResolutionRun",
		errorFingerprint: "stale-run-timeout",
	});
	if (
		runNumber >= MAX_RESOLUTION_RUNS ||
		now >= (session.retryDeadlineAt ?? now + RECOVERY_DEADLINE_MS)
	) {
		await settleResolutionSession(ctx, session, {
			kind: "PermanentFailure",
			message: "Resolution could not be completed.",
			failureCode: "Internal",
			diagnosticId,
		});
		return true;
	}
	await restartRun(ctx, session, { runNumber: runNumber + 1 });
	return true;
}

export async function recordResolutionRunSuccess(
	ctx: MutationCtx,
	args: {
		readonly guard: ResolutionSessionGuard;
		readonly phase: ResolutionPhase;
		readonly generationEvents?: readonly ResolutionGenerationEvent[];
	},
): Promise<boolean> {
	const session = await findSession(ctx, args.guard.requestId);
	if (!session || !guardMatches(session, args.guard)) return false;
	await upsertResolutionRun(ctx, session, {
		phase: args.phase,
		state: "Succeeded",
		...(args.generationEvents
			? { generationEvents: args.generationEvents }
			: {}),
	});
	return true;
}

export type ResolutionRunFailure =
	| {
			readonly kind: "Generation";
			readonly phase: ResolutionPhase;
			readonly failure: GenerationFailure;
			readonly generationEvents?: readonly ResolutionGenerationEvent[];
	  }
	| {
			readonly kind: "Internal";
			readonly phase: ResolutionPhase;
			readonly diagnosticId: string;
			readonly errorName: string;
			readonly errorFingerprint: string;
			readonly generationEvents?: readonly ResolutionGenerationEvent[];
	  };

/**
 * A failed run ends its session: tf-demo never retries a failure itself. A
 * run whose guard went stale records nothing.
 */
export async function failResolutionRun(
	ctx: MutationCtx,
	guard: ResolutionSessionGuard,
	failure: ResolutionRunFailure,
): Promise<boolean> {
	const session = await findSession(ctx, guard.requestId);
	if (
		!session ||
		!guardMatches(session, guard) ||
		session.lifecycle.state === "Terminal"
	) {
		return false;
	}
	const generationEvents = failure.generationEvents
		? { generationEvents: failure.generationEvents }
		: {};
	if (failure.kind === "Generation") {
		assertSafeGenerationFailure(failure.failure);
		const diagnosticId = crypto.randomUUID();
		await upsertResolutionRun(ctx, session, {
			phase: failure.phase,
			state: "Failed",
			failure: failure.failure,
			failureCode: failure.failure.category,
			diagnosticId,
			...generationEvents,
		});
		await settleResolutionSession(ctx, session, {
			kind: "PermanentFailure",
			message: publicFailureMessage(
				failure.phase,
				failure.failure.category,
			),
			failureCode: failure.failure.category,
			diagnosticId,
		});
		return true;
	}
	assertIdentifier(failure.diagnosticId, "diagnosticId");
	assertOperationalString(failure.errorName, "errorName");
	assertOperationalString(failure.errorFingerprint, "errorFingerprint");
	await upsertResolutionRun(ctx, session, {
		phase: failure.phase,
		state: "Failed",
		failureCode: "Internal",
		diagnosticId: failure.diagnosticId,
		errorName: failure.errorName,
		errorFingerprint: failure.errorFingerprint,
		...generationEvents,
	});
	await settleResolutionSession(ctx, session, {
		kind: "PermanentFailure",
		message: "Resolution could not be completed.",
		failureCode: "Internal",
		diagnosticId: failure.diagnosticId,
	});
	return true;
}

export type CommittedOccurrence = Awaited<
	ReturnType<typeof completeResolutionSession>
>;

/**
 * Completes `session` with a committed occurrence: the Visitor's Encounter
 * advances to it (ADR-0002), the session converges on its projections, and
 * the occurrence's Reading is asked for Knowledge.
 */
export async function completeResolutionSession(
	ctx: MutationCtx,
	session: ResolutionSession,
	attestationId: Id<"attestations">,
) {
	const { clickId } = await ensureVisitorEncounter(ctx, {
		requestId: session.requestId,
		visitorId: session.visitorId,
		textId: session.route.textId,
		sentenceId: session.sentenceId,
		segmentId: session.segmentId,
		attestationId,
	});
	const { readingId, value: occurrence } =
		await reconstructReusableAttestation(ctx, attestationId);
	await ctx.db.patch(session._id, {
		lifecycle: {
			state: "Terminal",
			progress: "Committing",
			outcome: "Complete",
		},
		grammar: projectResolutionGrammar(occurrence.grammatical),
		reading: projectResolutionReading(occurrence.reading),
		readingId,
		attestationId,
		failureMessage: undefined,
		failureCode: undefined,
		diagnosticId: undefined,
		updatedAt: Date.now(),
	});
	// Committed Attestation Membership replaces and clears the shared state.
	const segment = await ctx.db.get(session.segmentId);
	if (segment?.resolutionState) {
		await ctx.db.patch(session.segmentId, { resolutionState: undefined });
	}
	await scheduleKnowledgeGeneration(ctx, {
		attemptKey: session.requestId,
		visitorId: session.visitorId,
		readingId,
		attestationId,
	});
	return { clickId, readingId, attestationId, occurrence };
}

export type ResolutionSessionEnding =
	| { readonly kind: "Unresolved" }
	| {
			readonly kind: "PermanentFailure";
			readonly message: string;
			readonly failureCode?: ResolutionFailureCode;
			readonly diagnosticId?: string;
	  };

/**
 * Ends `session` without an occurrence of its own. When another session has
 * already committed the clicked Segment, that occurrence wins instead: a
 * later terminal write never replaces it (ADR-0004).
 */
export async function settleResolutionSession(
	ctx: MutationCtx,
	session: ResolutionSession,
	ending: ResolutionSessionEnding,
): Promise<
	| ({ readonly kind: "Complete" } & CommittedOccurrence)
	| { readonly kind: ResolutionSessionEnding["kind"] }
> {
	const committed = (await ctx.db.get(session.segmentId))
		?.attestationMembership?.attestationId;
	if (committed) {
		return {
			kind: "Complete",
			...(await completeResolutionSession(ctx, session, committed)),
		};
	}
	const progress = session.lifecycle.progress;
	if (ending.kind === "Unresolved") {
		await ctx.db.patch(session._id, {
			lifecycle: { state: "Terminal", progress, outcome: "Unresolved" },
			failureMessage: undefined,
			updatedAt: Date.now(),
		});
	} else {
		await ctx.db.patch(session._id, {
			lifecycle: {
				state: "Terminal",
				progress,
				outcome: "PermanentFailure",
			},
			failureCode: ending.failureCode ?? "Internal",
			diagnosticId: ending.diagnosticId ?? crypto.randomUUID(),
			failureMessage: safeFailureMessage(ending.message),
			updatedAt: Date.now(),
		});
	}
	await finishSegmentResolution(ctx, session.segmentId, ending.kind);
	return { kind: ending.kind };
}

/**
 * Deletes sessions for cleanup, Visitor clear, or Analysis Stripping. Each
 * Active one ends its Segment Resolution State contribution once, even when
 * several share a Segment.
 */
export async function deleteResolutionSessions(
	ctx: MutationCtx,
	sessions: readonly ResolutionSession[],
): Promise<void> {
	const endedBySegment = new Map<Id<"segments">, number>();
	for (const session of sessions) {
		if (session.lifecycle.state !== "Active") continue;
		endedBySegment.set(
			session.segmentId,
			(endedBySegment.get(session.segmentId) ?? 0) + 1,
		);
	}
	for (const [segmentId, endedSessionCount] of endedBySegment) {
		await finishSegmentResolution(
			ctx,
			segmentId,
			"PermanentFailure",
			endedSessionCount,
		);
	}
	await Promise.all(sessions.map((session) => ctx.db.delete(session._id)));
}

type ResolutionRunUpdate = {
	readonly phase: ResolutionPhase;
	readonly state: "Running" | "Failed" | "Succeeded";
	readonly failure?: GenerationFailure;
	readonly failureCode?: ResolutionFailureCode;
	readonly diagnosticId?: string;
	readonly errorName?: string;
	readonly errorFingerprint?: string;
	readonly generationEvents?: readonly ResolutionGenerationEvent[];
};

async function upsertResolutionRun(
	ctx: MutationCtx,
	session: ResolutionSession,
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
		...(update.state === "Running" ? {} : { finishedAt: now }),
		expiresAt: now + RESOLUTION_RETENTION_MS,
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
