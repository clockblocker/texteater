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
import { unitsByMember } from "../../server/storedSegments";
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

/**
 * The clicked Segment's row while it is still a word of the session's
 * Sentence, else null. The session stores only `segmentId`: the Segment's
 * place in the Sentence is read from its row, which a re-segmentation (#861)
 * moves, so no session can hold an index its row disagrees with.
 */
async function sessionSegment(
	ctx: QueryCtx,
	session: ResolutionSession,
): Promise<Doc<"segments"> | null> {
	const segment = await ctx.db.get(session.segmentId);
	return segment !== null &&
		segment.sentenceId === session.sentenceId &&
		segment.kind === "ResolvableText"
		? segment
		: null;
}

async function requireActiveSessionAndSegment(
	ctx: MutationCtx,
	guard: ResolutionSessionGuard,
): Promise<{ session: ResolutionSession; segment: Doc<"segments"> }> {
	const session = await findResolutionSession(ctx, guard.requestId);
	if (
		!session ||
		!guardMatches(session, guard) ||
		session.lifecycle.state === "Terminal"
	) {
		throw new Error("Resolution Session is no longer active.");
	}
	const segment = await sessionSegment(ctx, session);
	if (!segment) {
		throw new Error(
			"Resolution Session source Segment is no longer valid.",
		);
	}
	return { session, segment };
}

export async function requireActiveResolutionSession(
	ctx: MutationCtx,
	guard: ResolutionSessionGuard,
): Promise<ResolutionSession> {
	return (await requireActiveSessionAndSegment(ctx, guard)).session;
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
	const { session, segment } = await requireActiveSessionAndSegment(
		ctx,
		guard,
	);
	// A run holds the index it was claimed with; a Segment its Sentence's
	// re-segmentation moved since makes the commit fail.
	if (
		session.requestId !== selection.requestId ||
		session.visitorId !== selection.visitorId ||
		session.sentenceId !== selection.sentenceId ||
		segment.index !== selection.clickedSegmentIndex
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
 * The Visitor's Active session on the clicked Segment's unit: on the Segment
 * itself, else on another member of the unit intake stored there. A repeat
 * Segment Selection of any member joins it instead of starting another run,
 * since the run resolves the whole unit and its commit gives every member
 * the same occurrence (ADR-0004). Other Visitors' sessions stay independent.
 */
export async function findActiveVisitorSessionOnUnit(
	ctx: QueryCtx,
	visitorId: string,
	sentence: Doc<"sentences">,
	clickedSegmentIndex: number,
): Promise<ResolutionSession | null> {
	const members =
		unitsByMember(sentence.units).get(clickedSegmentIndex)?.segments ?? [];
	for (const index of new Set([clickedSegmentIndex, ...members])) {
		const segment = await ctx.db
			.query("segments")
			.withIndex("by_sentence_id_and_index", (q) =>
				q.eq("sentenceId", sentence._id).eq("index", index),
			)
			.unique();
		if (!segment) continue;
		const session = await ctx.db
			.query("resolutionSessions")
			.withIndex("by_visitor_id_and_segment_id", (q) =>
				q.eq("visitorId", visitorId).eq("segmentId", segment._id),
			)
			.filter((q) => q.eq(q.field("lifecycle.state"), "Active"))
			.first();
		if (session) return session;
	}
	return null;
}

type SegmentSelection = {
	readonly requestId: string;
	readonly visitorId: string;
	readonly sentence: Doc<"sentences">;
	readonly segment: Doc<"segments">;
};

/** The fields every session a Segment Selection starts holds from the start. */
function selectedSession(input: SegmentSelection, now: number) {
	return {
		requestId: input.requestId,
		visitorId: input.visitorId,
		sentenceId: input.sentence._id,
		segmentId: input.segment._id,
		runToken: crypto.randomUUID(),
		createdAt: now,
		updatedAt: now,
	};
}

/**
 * Settles a Segment Selection whose unit needs no model (`routedUnit`):
 * its session is Unresolved from the start, with no run, as the run would
 * have settled it. It joins and leaves the Segment's shared state as a run's
 * session does, so another session still Active there keeps it Active.
 */
export async function settleUnresolvedSelection(
	ctx: MutationCtx,
	input: SegmentSelection,
): Promise<void> {
	await beginSegmentResolution(ctx, input.segment._id);
	await ctx.db.insert("resolutionSessions", {
		...selectedSession(input, Date.now()),
		lifecycle: {
			state: "Terminal",
			progress: "RouteAvailable",
			outcome: "Unresolved",
		},
	});
	await finishSegmentResolution(ctx, input.segment._id, "Unresolved");
}

/**
 * Starts the Resolution Session a Segment Selection asked for. The caller
 * has recorded the Visitor Encounter (ADR-0002).
 */
export async function startResolutionSession(
	ctx: MutationCtx,
	input: SegmentSelection & { readonly inspect: boolean },
): Promise<void> {
	const now = Date.now();
	const session = selectedSession(input, now);
	const { runToken } = session;
	await beginSegmentResolution(ctx, input.segment._id);
	await ctx.db.insert("resolutionSessions", {
		...session,
		lifecycle: {
			state: "Active",
			progress: "Starting",
			activity: "Scheduled",
		},
		runNumber: 1,
		retryDeadlineAt: now + RECOVERY_DEADLINE_MS,
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
 * the Visitor's later click on the Segment's unit still runs, a retry starts
 * nothing.
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
	const segment = await ctx.db.get(session.segmentId);
	const committed = segment?.attestationMembership?.attestationId;
	if (committed) {
		await completeResolutionSession(ctx, session, committed);
		return true;
	}
	// The Visitor clicked the unit again since, and that session runs it.
	const sentence = await ctx.db.get(session.sentenceId);
	if (
		segment &&
		sentence &&
		(await findActiveVisitorSessionOnUnit(
			ctx,
			session.visitorId,
			sentence,
			segment.index,
		))
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
 * resumes from, or null when the run is stale or already claimed, or when
 * its Segment is gone, which ends the session.
 */
export async function claimResolutionRun(
	ctx: MutationCtx,
	guard: ResolutionSessionGuard,
): Promise<{
	session: ResolutionSession;
	/** The clicked Segment's index as its row has it now. */
	clickedSegmentIndex: number;
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
		session.lifecycle.activity === "Running"
	) {
		return null;
	}
	const segment = await sessionSegment(ctx, session);
	// Its Segment left the Sentence: no later run could claim it either, so
	// the session ends now instead of holding the Segment until stale
	// recovery.
	if (!segment) {
		await settleResolutionSession(ctx, session, {
			kind: "PermanentFailure",
			message: "The clicked word is no longer in its Sentence.",
			failureCode: "Internal",
		});
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
		clickedSegmentIndex: segment.index,
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
