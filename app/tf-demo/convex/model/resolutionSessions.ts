import { type Infer, v } from "convex/values";
import { restoreStoredGrammar } from "../../server/resolutionGrammar";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { inspectionRequested } from "./inspection";

export {
	projectResolutionGrammar,
	projectResolutionReading,
} from "../../server/resolutionSessionProjection";

import {
	type readingValueValidator,
	resolutionActivityValidator,
	type resolutionFailureCodeValidator,
	type resolutionGenerationEventValidator,
	resolutionGrammarProjectionValidator,
	type resolutionLifecycleValidator,
	resolutionOutcomeValidator,
	type resolutionPhaseValidator,
	resolutionProgressValidator,
	resolutionReadingProjectionValidator,
	type resolutionSessionGuardValidator,
	type resolvedGrammaticalValidator,
	type safeGenerationFailureValidator,
} from "./validators";
import { findVisitorEncounter } from "./visitorClicks";

/**
 * The Resolution Session module. It owns every session transition: start,
 * claim, progress, restart, stale recovery, each Terminal outcome, and
 * deletion. Each transition keeps the Segment Resolution State (ADR-0004) in
 * step inside this module, and one scheduling path starts every run. Callers
 * ask it to move a session; nothing else writes a session row.
 */

const MAX_IDENTIFIER_LENGTH = 200;
export const STALE_RUN_AFTER_MS = 11 * 60 * 1_000;
/** A crashed run is recovered until this long after its session started. */
export const DURABLE_RETRY_DEADLINE_MS = 15 * 60 * 1_000;
export const MAX_RESOLUTION_RUNS = 3;
const RESOLUTION_RUN_RETENTION_MS = 24 * 60 * 60 * 1_000;

export type ResolutionProgress = Infer<typeof resolutionProgressValidator>;
export type ResolutionActivity = Infer<typeof resolutionActivityValidator>;
export type ResolutionOutcome = Infer<typeof resolutionOutcomeValidator>;
export type ResolutionLifecycle = Infer<typeof resolutionLifecycleValidator>;
export type ResolutionSessionGuard = Infer<
	typeof resolutionSessionGuardValidator
>;
export type ResolutionGrammarProjection = Infer<
	typeof resolutionGrammarProjectionValidator
>;
export type ResolutionReadingProjection = Infer<
	typeof resolutionReadingProjectionValidator
>;
export type ResolutionPhase = Infer<typeof resolutionPhaseValidator>;
export type ResolutionFailureCode = Infer<
	typeof resolutionFailureCodeValidator
>;
type SafeGenerationFailure = Infer<typeof safeGenerationFailureValidator>;
type ResolutionGenerationEvent = Infer<
	typeof resolutionGenerationEventValidator
>;
type ReadingCheckpoint = {
	resolution: { decision: "Reuse" | "New"; emojiDescription: string };
	reading: Infer<typeof readingValueValidator>;
};
type ResolutionSession = Doc<"resolutionSessions">;

const progressPosition: Readonly<Record<ResolutionProgress, number>> = {
	Starting: 0,
	RouteAvailable: 1,
	GrammarAvailable: 2,
	ReadingAvailable: 3,
	Committing: 4,
};

export type ResolutionLifecycleSource = {
	readonly lifecycle: ResolutionLifecycle;
};

export function assertResolutionLifecycle(
	value: unknown,
): asserts value is ResolutionLifecycle {
	if (!value || typeof value !== "object") {
		throw new Error("Resolution lifecycle must be an object.");
	}
	const lifecycle = value as Record<string, unknown>;
	if (!isResolutionProgress(lifecycle.progress)) {
		throw new Error("Resolution lifecycle progress is invalid.");
	}
	if (lifecycle.state === "Active") {
		if (
			!isActiveResolutionActivity(lifecycle.activity) ||
			"outcome" in lifecycle
		) {
			throw new Error(
				"An active Resolution lifecycle requires an active activity and no outcome.",
			);
		}
		return;
	}
	if (lifecycle.state !== "Terminal" || "activity" in lifecycle) {
		throw new Error(
			"A terminal Resolution lifecycle cannot have activity.",
		);
	}
	if (
		lifecycle.outcome !== "Complete" &&
		lifecycle.outcome !== "Unresolved" &&
		lifecycle.outcome !== "PermanentFailure"
	) {
		throw new Error("A terminal Resolution lifecycle requires an outcome.");
	}
	if (
		lifecycle.outcome === "Complete" &&
		lifecycle.progress !== "Committing"
	) {
		throw new Error("Complete requires Committing progress.");
	}
}

export const resolutionNoteValidator = v.object({
	kind: v.literal("ResolutionNote"),
	target: v.object({
		kind: v.literal("Resolution"),
		requestId: v.string(),
	}),
	progress: resolutionProgressValidator,
	activity: resolutionActivityValidator,
	outcome: v.optional(resolutionOutcomeValidator),
	route: v.object({
		textId: v.id("texts"),
		sentenceId: v.id("sentences"),
		stitchedText: v.string(),
		clickedSegmentIndex: v.number(),
		selectedSegment: v.string(),
	}),
	grammar: v.optional(resolutionGrammarProjectionValidator),
	reading: v.optional(resolutionReadingProjectionValidator),
	terminal: v.optional(
		v.union(
			v.object({
				kind: v.literal("Complete"),
				attestationId: v.id("attestations"),
				canonical: v.optional(
					v.object({
						readingId: v.id("readings"),
						lemmaId: v.id("lemmas"),
						surfaceId: v.id("surfaces"),
						surfaceLanguage: v.literal("de"),
						normalizedSurface: v.string(),
						attestationId: v.id("attestations"),
					}),
				),
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
			v.object({ kind: v.literal("Unresolved") }),
			v.object({
				kind: v.literal("PermanentFailure"),
				failureCode: v.string(),
				diagnosticId: v.string(),
				message: v.string(),
			}),
		),
	),
	updatedAt: v.number(),
});

export type ResolutionNote = Infer<typeof resolutionNoteValidator>;

export function assertResolutionProgressTransition(
	current: ResolutionProgress,
	next: ResolutionProgress,
): void {
	if (current === next) return;
	if (progressPosition[next] !== progressPosition[current] + 1) {
		throw new Error(
			`Resolution Session progress ${next} cannot follow ${current}.`,
		);
	}
}

export function resolutionProgressHasReached(
	current: ResolutionProgress,
	target: ResolutionProgress,
): boolean {
	return progressPosition[current] > progressPosition[target];
}

export async function loadResolutionNote(
	ctx: QueryCtx,
	requestId: string,
): Promise<ResolutionNote | null> {
	if (requestId.length === 0 || requestId.length > MAX_IDENTIFIER_LENGTH) {
		return null;
	}
	const session = await ctx.db
		.query("resolutionSessions")
		.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
		.unique();
	if (!session) return null;
	const { lifecycle } = session;
	const activity =
		lifecycle.state === "Active" ? lifecycle.activity : "Terminal";
	const outcome =
		lifecycle.state === "Terminal" ? lifecycle.outcome : undefined;
	const canonical =
		outcome === "Complete" && session.readingId && session.attestationId
			? await loadCanonicalResolution(
					ctx,
					session.readingId,
					session.attestationId,
				)
			: null;
	return {
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId },
		progress: lifecycle.progress,
		activity,
		...(outcome ? { outcome } : {}),
		route: session.route,
		...(session.grammar ? { grammar: session.grammar } : {}),
		...(session.reading ? { reading: session.reading } : {}),
		...(outcome === "Complete" && session.readingId && session.attestationId
			? {
					terminal: {
						kind: "Complete" as const,
						attestationId: session.attestationId,
						...(canonical ? { canonical } : {}),
						target: session.routeNoteRequested
							? {
									kind: "Attestation" as const,
									attestationId: session.attestationId,
								}
							: {
									kind: "Reading" as const,
									readingId: session.readingId,
								},
					},
				}
			: outcome === "Unresolved"
				? { terminal: { kind: "Unresolved" as const } }
				: outcome === "PermanentFailure"
					? {
							terminal: {
								kind: "PermanentFailure" as const,
								failureCode: session.failureCode ?? "Internal",
								diagnosticId:
									session.diagnosticId ?? session.requestId,
								message:
									session.failureMessage ??
									"Resolution could not be completed.",
							},
						}
					: {}),
		updatedAt: session.updatedAt,
	};
}

async function loadCanonicalResolution(
	ctx: QueryCtx,
	readingId: Id<"readings">,
	attestationId: Id<"attestations">,
) {
	const [reading, attestation] = await Promise.all([
		ctx.db.get(readingId),
		ctx.db.get(attestationId),
	]);
	if (!reading || !attestation) return null;
	const surface = await ctx.db.get(attestation.surfaceId);
	if (
		!surface ||
		surface.lemmaId !== reading.lemmaId ||
		surface.language !== "de"
	)
		return null;
	return {
		readingId,
		lemmaId: reading.lemmaId,
		surfaceId: surface._id,
		surfaceLanguage: surface.language,
		normalizedSurface: surface.normalizedSurface,
		attestationId,
	};
}

async function findSession(ctx: QueryCtx, requestId: string) {
	return ctx.db
		.query("resolutionSessions")
		.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
		.unique();
}

function guardMatches(
	session: ResolutionSession,
	guard: { readonly runToken: string; readonly segmentId?: Id<"segments"> },
): boolean {
	return (
		session.runToken === guard.runToken &&
		(guard.segmentId === undefined || session.segmentId === guard.segmentId)
	);
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

/** Starts a fresh run of `session` under a new run token. */
async function restartRun(
	ctx: MutationCtx,
	session: ResolutionSession,
	values: { readonly runNumber: number; readonly retryDeadlineAt?: number },
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
			progress: session.lifecycle.progress,
			activity: "Scheduled",
		},
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
		retryDeadlineAt: now + DURABLE_RETRY_DEADLINE_MS,
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
 * A learner's retry of a PermanentFailure. Unlike stale recovery it resets
 * every failure category, since provider configuration, model policy, or
 * catalog data may have changed since.
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
	if (!(await beginSegmentResolution(ctx, session.segmentId))) return false;
	await restartRun(ctx, session, {
		runNumber: 1,
		retryDeadlineAt: Date.now() + DURABLE_RETRY_DEADLINE_MS,
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

/** Decodes the stored Grammar checkpoint into the Convex transport shape. */
function restoreGrammaticalCheckpoint(
	session: ResolutionSession,
): Infer<typeof resolvedGrammaticalValidator> | undefined {
	const restored = session.grammaticalCheckpoint
		? restoreStoredGrammar(session.grammaticalCheckpoint)
		: undefined;
	if (!restored) return undefined;
	return {
		...restored,
		encounter: {
			sentence: {
				...restored.encounter.sentence,
				segments: restored.encounter.sentence.segments.map(
					(segment) => ({ ...segment }),
				),
			},
			target: {
				...restored.encounter.target,
				memberSegmentIndices: [
					...restored.encounter.target.memberSegmentIndices,
				],
			},
		},
	};
}

export async function advanceResolutionSession(
	ctx: MutationCtx,
	args: {
		readonly guard: ResolutionSessionGuard;
		readonly progress: Exclude<ResolutionProgress, "Starting">;
		readonly grammar?: ResolutionGrammarProjection;
		readonly reading?: ResolutionReadingProjection;
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
			readonly failure: SafeGenerationFailure;
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

/** A failed run ends its session: tf-demo never retries a failure itself. */
export async function failResolutionRun(
	ctx: MutationCtx,
	guard: ResolutionSessionGuard,
	failure: ResolutionRunFailure,
): Promise<void> {
	const session = await requireActiveResolutionSession(ctx, guard);
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
		await settleFailed(
			ctx,
			session,
			publicFailureMessage(failure.phase, failure.failure.category),
			failure.failure.category,
			diagnosticId,
		);
		return;
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
	await settleFailed(
		ctx,
		session,
		"Resolution could not be completed.",
		"Internal",
		failure.diagnosticId,
	);
}

export type ResolutionRunSettlement =
	| {
			readonly kind: "Complete";
			readonly readingId: Id<"readings">;
			readonly attestationId: Id<"attestations">;
			readonly grammar: ResolutionGrammarProjection;
			readonly reading: ResolutionReadingProjection;
	  }
	| { readonly kind: "Unresolved" }
	| { readonly kind: "Failed"; readonly message: string };

/**
 * Settles a run whose Occurrence commit did not settle it, such as a
 * deduplicated retry. Returns the session it settled.
 */
export async function settleResolutionRun(
	ctx: MutationCtx,
	guard: ResolutionSessionGuard,
	result: ResolutionRunSettlement,
): Promise<ResolutionSession> {
	const session = await requireActiveResolutionSession(ctx, guard);
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
		await upsertResolutionRun(ctx, session, {
			phase: "Commit",
			state: "Succeeded",
		});
		return session;
	}
	if (result.kind === "Unresolved") {
		await settleUnresolved(ctx, session);
		await upsertResolutionRun(ctx, session, {
			phase: "Commit",
			state: "Succeeded",
		});
		return session;
	}
	const diagnosticId = await settleFailed(ctx, session, result.message);
	await upsertResolutionRun(ctx, session, {
		phase: phaseForProgress(session.lifecycle.progress),
		state: "Failed",
		failureCode: "Internal",
		diagnosticId,
	});
	return session;
}

export async function settleComplete(
	ctx: MutationCtx,
	session: ResolutionSession,
	result: {
		readonly readingId: Id<"readings">;
		readonly attestationId: Id<"attestations">;
		readonly grammar: ResolutionGrammarProjection;
		readonly reading: ResolutionReadingProjection;
	},
): Promise<void> {
	await ctx.db.patch(session._id, {
		lifecycle: {
			state: "Terminal",
			progress: "Committing",
			outcome: "Complete",
		},
		grammar: result.grammar,
		reading: result.reading,
		readingId: result.readingId,
		attestationId: result.attestationId,
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
}

export async function settleUnresolved(
	ctx: MutationCtx,
	session: ResolutionSession,
): Promise<void> {
	await ctx.db.patch(session._id, {
		lifecycle: {
			state: "Terminal",
			progress: session.lifecycle.progress,
			outcome: "Unresolved",
		},
		failureMessage: undefined,
		updatedAt: Date.now(),
	});
	await finishSegmentResolution(ctx, session.segmentId, "Unresolved");
}

export async function settleFailed(
	ctx: MutationCtx,
	session: ResolutionSession,
	message: string,
	failureCode: ResolutionFailureCode = "Internal",
	diagnosticId: string = crypto.randomUUID(),
): Promise<string> {
	await ctx.db.patch(session._id, {
		lifecycle: {
			state: "Terminal",
			progress: session.lifecycle.progress,
			outcome: "PermanentFailure",
		},
		failureCode,
		diagnosticId,
		failureMessage: safeFailureMessage(message),
		updatedAt: Date.now(),
	});
	await finishSegmentResolution(ctx, session.segmentId, "PermanentFailure");
	return diagnosticId;
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
	readonly failure?: SafeGenerationFailure;
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

function phaseForProgress(progress: ResolutionProgress): ResolutionPhase {
	return progress === "Starting"
		? "Route"
		: progress === "RouteAvailable"
			? "Grammar"
			: progress === "GrammarAvailable"
				? "Reading"
				: "Commit";
}

function assertIdentifier(value: string, name: string): void {
	if (value.trim().length === 0 || value.length > MAX_IDENTIFIER_LENGTH) {
		throw new Error(`${name} must contain 1 to 200 characters.`);
	}
}

function assertOperationalString(value: string, name: string): void {
	if (value.length === 0 || value.length > 200) {
		throw new Error(`${name} must contain 1 to 200 characters.`);
	}
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
	phase: ResolutionPhase,
	category: SafeGenerationFailure["category"],
): string {
	const subject = phase === "Reading" ? "Reading generation" : "Resolution";
	return category === "Network" ||
		category === "RateLimited" ||
		category === "ProviderUnavailable"
		? `${subject} is temporarily unavailable.`
		: `${subject} could not be completed.`;
}

function isResolutionProgress(value: unknown): value is ResolutionProgress {
	return (
		value === "Starting" ||
		value === "RouteAvailable" ||
		value === "GrammarAvailable" ||
		value === "ReadingAvailable" ||
		value === "Committing"
	);
}

function isActiveResolutionActivity(
	value: unknown,
): value is Exclude<ResolutionActivity, "Terminal"> {
	return value === "Scheduled" || value === "Running";
}

function safeFailureMessage(message: string): string {
	return message.trim().length > 0 && message.length <= 240
		? message
		: "Resolution could not be completed.";
}
