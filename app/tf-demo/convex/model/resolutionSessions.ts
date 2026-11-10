import type { Infer } from "convex/values";
import {
	assertResolutionProgressTransition,
	guardMatches,
	MAX_RESOLUTION_RUNS,
	phaseForProgress,
	RECOVERY_DEADLINE_MS,
	type ResolutionProgress,
	type ResolutionSessionGuard,
	resolutionProgressHasReached,
	STALE_RUN_AFTER_MS,
	type StoredResolutionGrammar,
	type StoredResolutionReading,
} from "../../server/resolutionLifecycle";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { restoreGrammaticalCheckpoint } from "./grammarCheckpoint";
import { inspectionRequested } from "./inspection";
import { upsertResolutionRun } from "./resolutionRunRecords";
import {
	beginSegmentResolution,
	finishSegmentResolution,
} from "./resolutionSegmentState";
import {
	completeResolutionSession,
	settleResolutionSession,
} from "./resolutionSessionEndings";
import {
	findResolutionSession,
	type ResolutionSession,
} from "./resolutionSessionRow";
import type {
	readingCheckpointValidator,
	resolvedGrammaticalValidator,
} from "./validators";

/**
 * The Resolution Session module. It owns every session transition: start,
 * claim, progress, restart, stale recovery and deletion here, each Terminal
 * outcome in `resolutionSessionEndings.ts`, and each run's record in
 * `resolutionRunRecords.ts`. Each transition keeps the Segment Resolution
 * State (ADR-0004, `resolutionSegmentState.ts`) in step, and one scheduling
 * path starts every run. Callers ask these modules to move a session;
 * nothing else writes a session row. The rules they apply that need no
 * database live in `server/resolutionLifecycle.ts`.
 */

type ReadingCheckpoint = Infer<typeof readingCheckpointValidator>;

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
	const session = await findResolutionSession(ctx, guard.requestId);
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
		runToken,
		lifecycle: {
			state: "Active",
			progress: "Starting",
			activity: "Scheduled",
		},
		runNumber: 1,
		retryDeadlineAt: now + RECOVERY_DEADLINE_MS,
		route: {
			scrollId: input.sentence.scrollId,
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
	const session = await findResolutionSession(ctx, input.requestId);
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
	const session = await findResolutionSession(ctx, guard.requestId);
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
	const session = await findResolutionSession(ctx, args.requestId);
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

/**
 * Deletes sessions for cleanup, Visitor clear, Analysis Stripping, or a
 * re-segmented Sentence's ended sessions (`removeEndedSegments`). Each
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
