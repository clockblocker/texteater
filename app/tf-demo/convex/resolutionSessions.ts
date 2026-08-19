import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import {
	assertResolutionStageTransition,
	loadResolutionNote,
	type ResolutionStage,
	requireActiveResolutionSession,
	resolutionNoteValidator,
	settleComplete,
	settleFailed,
	settleUnresolved,
	stagePosition,
	terminalStages,
} from "./model/resolutionSessions";
import {
	resolutionGrammarProjectionValidator,
	resolutionReadingProjectionValidator,
	resolutionSessionGuardValidator,
	resolutionStageValidator,
} from "./model/validators";
import {
	ensureVisitorEncounter,
	findVisitorEncounter,
} from "./model/visitorClicks";

const MAX_IDENTIFIER_LENGTH = 200;
const CLEANUP_BATCH_SIZE = 200;
export const STALE_RUN_AFTER_MS = 11 * 60 * 1_000;

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
			stage: resolutionStageValidator,
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
			return {
				kind: "Resolving" as const,
				requestId: existing.requestId,
				stage: existing.stage,
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
			stage: "Starting",
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
			stage: "Starting" as const,
			deduplicated: false,
		};
	},
});

export const getResolutionNote = query({
	args: { requestId: v.string() },
	returns: v.union(v.null(), resolutionNoteValidator),
	handler: async (ctx, { requestId }) => loadResolutionNote(ctx, requestId),
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
			terminalStages.has(session.stage)
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
		};
	},
});

export const advance = internalMutation({
	args: {
		guard: resolutionSessionGuardValidator,
		stage: v.union(
			v.literal("RouteAvailable"),
			v.literal("GrammarAvailable"),
			v.literal("ReadingAvailable"),
			v.literal("Committing"),
		),
		grammar: v.optional(resolutionGrammarProjectionValidator),
		reading: v.optional(resolutionReadingProjectionValidator),
	},
	returns: v.boolean(),
	handler: async (ctx, args) => {
		const session = await requireActiveResolutionSession(ctx, args.guard);
		if (session.stage === args.stage) return false;
		if (stagePosition[session.stage] > stagePosition[args.stage])
			return false;
		assertResolutionStageTransition(session.stage, args.stage);
		if (args.stage === "GrammarAvailable" && !args.grammar) {
			throw new Error("GrammarAvailable requires a Grammar projection.");
		}
		if (args.stage === "ReadingAvailable" && !args.reading) {
			throw new Error("ReadingAvailable requires a Reading projection.");
		}
		await ctx.db.patch(session._id, {
			stage: args.stage,
			...(args.grammar ? { grammar: args.grammar } : {}),
			...(args.reading ? { reading: args.reading } : {}),
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
			terminalStages.has(session.stage)
		) {
			return false;
		}

		const age = Date.now() - session.updatedAt;
		if (age < STALE_RUN_AFTER_MS) {
			await ctx.scheduler.runAfter(
				STALE_RUN_AFTER_MS - age,
				internal.resolutionSessions.recoverStaleRun,
				args,
			);
			return false;
		}

		const runToken = crypto.randomUUID();
		await ctx.db.patch(session._id, {
			runToken,
			stage: "Starting",
			grammar: undefined,
			reading: undefined,
			readingId: undefined,
			attestationId: undefined,
			failureMessage: undefined,
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
		if (terminalStages.has(session.stage)) return false;
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
			return true;
		}
		if (result.kind === "Unresolved") {
			await settleUnresolved(ctx, session);
			return true;
		}
		await settleFailed(ctx, session, result.message);
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
		let deleted = 0;
		for (const stage of Object.keys(stagePosition) as ResolutionStage[]) {
			const cutoff = terminalStages.has(stage)
				? args.terminalBefore
				: args.staleBefore;
			const rows = await ctx.db
				.query("resolutionSessions")
				.withIndex("by_stage_and_updated_at", (q) =>
					q.eq("stage", stage).lte("updatedAt", cutoff),
				)
				.take(CLEANUP_BATCH_SIZE - deleted);
			for (const row of rows) {
				if (row.stage === "Complete") {
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
