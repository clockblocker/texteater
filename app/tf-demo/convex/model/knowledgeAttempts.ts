import type { Infer } from "convex/values";
import type * as Dumrel from "dumrel/types";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { inspectionRequested } from "./inspection";
import { recordKnowledgeProductionRun } from "./knowledgeProductionRuns";
import type { knowledgeProductionEvidenceValidator } from "./validators";

/**
 * The Knowledge Attempt module. It owns every attempt transition: demand,
 * promotion of the next Waiting attempt, claim, publication progress, each
 * settled outcome, stale recovery, and deletion. One scheduling path starts
 * every run together with its watchdog. A transition that ends a run names
 * the run it ends, so a late action can never settle its replacement.
 * Callers ask it to move an attempt; nothing else writes an attempt row.
 */

export type KnowledgeAttempt = Doc<"knowledgeGenerationAttempts">;

/** Longer than a Convex action may run, so a quiet run is a dead one. */
export const STALE_KNOWLEDGE_RUN_AFTER_MS = 11 * 60 * 1_000;

/**
 * How long a Failed attempt waits before a repeated demand reruns it. Failure
 * codes cannot tell a passing failure from a lasting one, and opening a note
 * demands again, so only an interrupted run retries at once.
 */
export const KNOWLEDGE_RETRY_COOLDOWN_MS = 5 * 60 * 1_000;

const INTERRUPTED_MESSAGE =
	"Knowledge generation was interrupted. Please retry.";

/**
 * The run an ending transition belongs to. `null` is a run whose action
 * never claimed it; such an action may only end an attempt still Scheduled.
 */
export type KnowledgeRun = number | null;

export type KnowledgeAttemptEnding =
	| { readonly kind: "Committed" }
	| { readonly kind: "LostRace" }
	| {
			readonly kind: "Failed";
			readonly failureCode: string;
			readonly failureMessage: string;
	  };

export function findKnowledgeAttempt(
	ctx: MutationCtx | QueryCtx,
	attemptKey: string,
) {
	return ctx.db
		.query("knowledgeGenerationAttempts")
		.withIndex("by_attempt_key", (q) => q.eq("attemptKey", attemptKey))
		.unique();
}

function claimedRun(attempt: KnowledgeAttempt): number {
	return attempt.runNumber ?? 1;
}

/** Whether `run` is the attempt's current run and may still end it. */
export function ownsKnowledgeRun(
	attempt: KnowledgeAttempt,
	run: KnowledgeRun,
): boolean {
	return run === null
		? attempt.state === "Scheduled"
		: attempt.state === "Running" && claimedRun(attempt) === run;
}

async function hasActiveAttempt(
	ctx: MutationCtx,
	ownerReadingKey: string,
): Promise<boolean> {
	const [scheduled, running] = await Promise.all(
		(["Scheduled", "Running"] as const).map((state) =>
			ctx.db
				.query("knowledgeGenerationAttempts")
				.withIndex("by_owner_reading_key_and_state", (q) =>
					q.eq("ownerReadingKey", ownerReadingKey).eq("state", state),
				)
				.take(1),
		),
	);
	return scheduled.length > 0 || running.length > 0;
}

/** The one scheduling path: the run's action and the watchdog that guards it. */
async function startRun(
	ctx: MutationCtx,
	attempt: Pick<KnowledgeAttempt, "attemptKey" | "runNumber">,
): Promise<void> {
	const inspect = await inspectionRequested(ctx, attempt.attemptKey);
	await ctx.scheduler.runAfter(
		0,
		internal.knowledgeGenerationActions.runKnowledgeGeneration,
		{ attemptKey: attempt.attemptKey, ...(inspect ? { inspect } : {}) },
	);
	await ctx.scheduler.runAfter(
		STALE_KNOWLEDGE_RUN_AFTER_MS,
		internal.knowledgeGeneration.recoverStaleRun,
		{
			attemptKey: attempt.attemptKey,
			runNumber: (attempt.runNumber ?? 0) + 1,
		},
	);
}

/** Queues a Failed attempt again, behind an active one or at once. */
async function retryFailedAttempt(
	ctx: MutationCtx,
	attempt: KnowledgeAttempt,
): Promise<void> {
	const waiting = await hasActiveAttempt(ctx, attempt.ownerReadingKey);
	await ctx.db.patch(attempt._id, {
		state: waiting ? "Waiting" : "Scheduled",
		failureCode: undefined,
		failureMessage: undefined,
		updatedAt: Date.now(),
	});
	if (!waiting) await startRun(ctx, attempt);
}

async function promoteNextWaiting(
	ctx: MutationCtx,
	ownerReadingKey: string,
): Promise<void> {
	const [waiting] = await ctx.db
		.query("knowledgeGenerationAttempts")
		.withIndex("by_owner_reading_key_and_state", (q) =>
			q.eq("ownerReadingKey", ownerReadingKey).eq("state", "Waiting"),
		)
		.take(1);
	if (!waiting) return;
	await ctx.db.patch(waiting._id, {
		state: "Scheduled",
		updatedAt: Date.now(),
	});
	await startRun(ctx, waiting);
}

/**
 * Records one occurrence's demand for Knowledge. A repeated demand is
 * idempotent; one for a Failed attempt retries it, at once when the run was
 * interrupted and otherwise once the retry cooldown has passed. Only one
 * attempt per Reading is active, and later demands wait behind it.
 */
export async function demandKnowledgeAttempt(
	ctx: MutationCtx,
	demand: {
		readonly attemptKey: string;
		readonly knowledgeDraftJson?: string;
		readonly visitorId: string;
		readonly readingId: Id<"readings">;
		readonly attestationId: Id<"attestations">;
		readonly ownerReadingKey: string;
		readonly translationLanguages: readonly Dumrel.TranslationLanguage[];
	},
): Promise<void> {
	const existing = await findKnowledgeAttempt(ctx, demand.attemptKey);
	if (existing) {
		if (
			existing.visitorId !== demand.visitorId ||
			existing.readingId !== demand.readingId ||
			existing.attestationId !== demand.attestationId ||
			existing.ownerReadingKey !== demand.ownerReadingKey
		) {
			throw new Error("attemptKey collides with a different occurrence.");
		}
		if (
			existing.state === "Failed" &&
			(existing.failureCode === "interrupted" ||
				Date.now() - existing.updatedAt >= KNOWLEDGE_RETRY_COOLDOWN_MS)
		)
			await retryFailedAttempt(ctx, existing);
		return;
	}
	const waiting = await hasActiveAttempt(ctx, demand.ownerReadingKey);
	const now = Date.now();
	await ctx.db.insert("knowledgeGenerationAttempts", {
		...demand,
		translationLanguages: [...demand.translationLanguages],
		state: waiting ? "Waiting" : "Scheduled",
		createdAt: now,
		updatedAt: now,
	});
	if (!waiting) await startRun(ctx, demand);
}

/**
 * Claims the Scheduled attempt for a new run and returns its number. Any
 * other state means the action is late or duplicated and must not run.
 */
export async function claimKnowledgeRun(
	ctx: MutationCtx,
	attempt: KnowledgeAttempt,
): Promise<number | null> {
	if (attempt.state !== "Scheduled") return null;
	const runNumber = (attempt.runNumber ?? 0) + 1;
	await ctx.db.patch(attempt._id, {
		state: "Running",
		runNumber,
		publicationSequence: undefined,
		failureCode: undefined,
		failureMessage: undefined,
		updatedAt: Date.now(),
	});
	return runNumber;
}

/** Records an incremental publication; it also shows the run is alive. */
export async function recordKnowledgePublication(
	ctx: MutationCtx,
	attempt: KnowledgeAttempt,
	publicationSequence: number,
): Promise<void> {
	await ctx.db.patch(attempt._id, {
		publicationSequence,
		updatedAt: Date.now(),
	});
}

/**
 * Ends `run` of the attempt and starts the next Waiting demand for its
 * Reading. Returns false, writing nothing, when `run` no longer owns it.
 */
export async function endKnowledgeRun(
	ctx: MutationCtx,
	attempt: KnowledgeAttempt,
	run: KnowledgeRun,
	ending: KnowledgeAttemptEnding,
	values: { readonly publicationSequence?: number } = {},
): Promise<boolean> {
	if (!ownsKnowledgeRun(attempt, run)) return false;
	await ctx.db.patch(attempt._id, {
		...values,
		state: ending.kind,
		failureCode:
			ending.kind === "Failed"
				? ending.failureCode.slice(0, 100)
				: undefined,
		failureMessage:
			ending.kind === "Failed" ? ending.failureMessage : undefined,
		updatedAt: Date.now(),
	});
	await promoteNextWaiting(ctx, attempt.ownerReadingKey);
	return true;
}

/** Fails `run`, keeping its production evidence beside the attempt. */
export async function failKnowledgeRun(
	ctx: MutationCtx,
	attempt: KnowledgeAttempt,
	run: KnowledgeRun,
	failure: { readonly failureCode: string; readonly failureMessage: string },
	productionEvidence?: Infer<typeof knowledgeProductionEvidenceValidator>,
): Promise<boolean> {
	if (!ownsKnowledgeRun(attempt, run)) return false;
	if (productionEvidence)
		await recordKnowledgeProductionRun(
			ctx,
			attempt,
			productionEvidence,
			"Failure",
		);
	return endKnowledgeRun(ctx, attempt, run, { kind: "Failed", ...failure });
}

/**
 * The watchdog `startRun` schedules. A run that stayed quiet longer than an
 * action may live lost its action, so the attempt fails as interrupted and
 * the next demand starts; a learner's retry reruns it.
 */
export async function recoverStaleKnowledgeRun(
	ctx: MutationCtx,
	args: { readonly attemptKey: string; readonly runNumber: number },
): Promise<boolean> {
	const attempt = await findKnowledgeAttempt(ctx, args.attemptKey);
	if (!attempt) return false;
	const run: KnowledgeRun =
		attempt.state === "Scheduled" &&
		(attempt.runNumber ?? 0) + 1 === args.runNumber
			? null
			: args.runNumber;
	if (!ownsKnowledgeRun(attempt, run)) return false;
	const age = Date.now() - attempt.updatedAt;
	if (age < STALE_KNOWLEDGE_RUN_AFTER_MS) {
		await ctx.scheduler.runAfter(
			STALE_KNOWLEDGE_RUN_AFTER_MS - age,
			internal.knowledgeGeneration.recoverStaleRun,
			args,
		);
		return false;
	}
	return endKnowledgeRun(ctx, attempt, run, {
		kind: "Failed",
		failureCode: "interrupted",
		failureMessage: INTERRUPTED_MESSAGE,
	});
}

/**
 * Deletes attempts with their production runs, spending at most `budget`
 * deletions, and starts the next Waiting demand of every Reading whose
 * active attempt went.
 */
export async function deleteKnowledgeAttempts(
	ctx: MutationCtx,
	attempts: readonly KnowledgeAttempt[],
	budget: number,
): Promise<{ deleted: number; complete: boolean }> {
	let deleted = 0;
	let complete = true;
	const endedActiveOwners = new Set<string>();
	for (const attempt of attempts) {
		const runs = await ctx.db
			.query("knowledgeProductionRuns")
			.withIndex("by_attempt_key_and_run", (q) =>
				q.eq("attemptKey", attempt.attemptKey),
			)
			.take(budget - deleted);
		await Promise.all(runs.map((run) => ctx.db.delete(run._id)));
		deleted += runs.length;
		if (deleted >= budget) {
			complete = false;
			break;
		}
		await ctx.db.delete(attempt._id);
		deleted += 1;
		if (attempt.state === "Scheduled" || attempt.state === "Running") {
			endedActiveOwners.add(attempt.ownerReadingKey);
		}
	}
	for (const ownerReadingKey of endedActiveOwners)
		await promoteNextWaiting(ctx, ownerReadingKey);
	return { deleted, complete };
}
