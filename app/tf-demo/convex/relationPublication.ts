import { type Infer, v } from "convex/values";
import { derivePendingEntryId } from "dumdict/pending";
import type { DirectSemanticRelation } from "dumrel";
import { directSemanticRelationValues } from "dumrel/vocabulary";

import type { Doc } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
	type QueryCtx,
} from "./_generated/server";
import { pendingLocatorIndexKey } from "./model/dumdictPendingIndexes";
import {
	effectiveRelationPublicationPolicy,
	type RelationPublicationFingerprints,
} from "./model/generatedKnowledgeContainment";
import {
	directSemanticRelationValidator,
	relationProposalOutcomeValidator,
	relationPublicationFingerprintsValidator,
	relationPublicationRunValidator,
	relationReviewStatusValidator,
	relationTargetShadowValidator,
} from "./model/validators";

const MAX_MONITORING_ROWS = 500;
const MAX_REVIEW_ROWS = 100;
const REVIEW_SAMPLE_DENOMINATOR = 10;

const publicationAuthorizationValidator = v.object({
	artifactPath: v.union(v.string(), v.null()),
	fingerprints: relationPublicationFingerprintsValidator,
	qualifiedKinds: v.array(directSemanticRelationValidator),
	invalidationReasons: v.array(v.string()),
	rollbackStopped: v.boolean(),
	rollbackReason: v.string(),
});

export type RelationPublicationAuthorization = Infer<
	typeof publicationAuthorizationValidator
>;

export type RelationPublicationRun = Infer<
	typeof relationPublicationRunValidator
>;

function findControl(ctx: QueryCtx | MutationCtx) {
	return ctx.db
		.query("relationPublicationControls")
		.withIndex("by_key", (q) => q.eq("key", "global"))
		.unique();
}

export async function loadRelationPublicationAuthorization(
	ctx: QueryCtx | MutationCtx,
) {
	const [control, policy] = await Promise.all([
		findControl(ctx),
		Promise.resolve(effectiveRelationPublicationPolicy()),
	]);
	return {
		...policy,
		qualifiedKinds: [...policy.qualifiedKinds],
		invalidationReasons: [...policy.invalidationReasons],
		rollbackStopped: control?.rollbackStopped ?? false,
		rollbackReason: control?.reason ?? "",
	};
}

export const getAuthorization = internalQuery({
	args: {},
	returns: publicationAuthorizationValidator,
	handler: async (ctx) => loadRelationPublicationAuthorization(ctx),
});

export const setRollback = internalMutation({
	args: { stopped: v.boolean(), reason: v.string() },
	returns: v.null(),
	handler: async (ctx, args) => {
		const reason = args.reason.trim();
		if (args.stopped && (reason.length === 0 || reason.length > 500)) {
			throw new Error(
				"Stopping generated relation publication requires a concise reason.",
			);
		}
		if (reason.length > 500)
			throw new Error("Rollback reason is too long.");
		const existing = await findControl(ctx);
		const value = {
			rollbackStopped: args.stopped,
			reason,
			updatedAt: Date.now(),
		};
		if (existing) await ctx.db.patch(existing._id, value);
		else
			await ctx.db.insert("relationPublicationControls", {
				key: "global",
				...value,
			});
		return null;
	},
});

function sameFingerprints(
	left: RelationPublicationFingerprints,
	right: RelationPublicationFingerprints,
): boolean {
	return (
		left.prompt === right.prompt &&
		left.schema === right.schema &&
		left.evaluator === right.evaluator &&
		left.model === right.model &&
		left.policy === right.policy
	);
}

/** Rechecked in the same transaction that would create canonical edges. */
export async function relationPublicationAllowedAtCommit(
	ctx: MutationCtx,
	run: RelationPublicationRun,
): Promise<boolean> {
	if (run.requestedKinds.length === 0 && run.proposals.length === 0)
		return true;
	const authorization = await loadRelationPublicationAuthorization(ctx);
	return relationPublicationRunAllowed(authorization, run);
}

export function relationPublicationRunAllowed(
	authorization: RelationPublicationAuthorization,
	run: RelationPublicationRun,
): boolean {
	const requested = new Set(run.requestedKinds);
	if (
		new Set(run.requestedKinds).size !== run.requestedKinds.length ||
		run.proposals.some((proposal) => !requested.has(proposal.relation))
	) {
		return false;
	}
	if (run.requestedKinds.length === 0) return true;
	if (
		authorization.rollbackStopped ||
		authorization.invalidationReasons.length > 0 ||
		!authorization.artifactPath ||
		run.artifactPath !== authorization.artifactPath ||
		!sameFingerprints(run.fingerprints, authorization.fingerprints)
	) {
		return false;
	}
	const allowed = new Set(authorization.qualifiedKinds);
	return run.requestedKinds.every((relation) => allowed.has(relation));
}

function assertRunNumber(runNumber: number): void {
	if (!Number.isSafeInteger(runNumber) || runNumber < 1) {
		throw new Error("runNumber must be a positive safe integer.");
	}
}

function runKey(
	attemptKey: string,
	runNumber: number,
	relation: DirectSemanticRelation,
): string {
	return JSON.stringify([attemptKey, runNumber, relation]);
}

function targetKey(
	target: Infer<typeof relationTargetShadowValidator>,
): string {
	return JSON.stringify([
		target.language,
		target.family,
		target.kind,
		target.canonicalForm,
	]);
}

function proposalKey(
	attemptKey: string,
	runNumber: number,
	relation: DirectSemanticRelation,
	target: Infer<typeof relationTargetShadowValidator>,
): string {
	return JSON.stringify([attemptKey, runNumber, relation, targetKey(target)]);
}

function pendingLocatorKey(
	sourceReadingKey: string,
	relation: DirectSemanticRelation,
	target: Infer<typeof relationTargetShadowValidator>,
): string {
	return pendingLocatorIndexKey({
		sourceReadingKey,
		relation,
		targetPendingId: derivePendingEntryId(
			target as Parameters<typeof derivePendingEntryId<"de">>[0],
		),
	});
}

function sampledForReview(key: string): boolean {
	let hash = 2166136261;
	for (let index = 0; index < key.length; index += 1) {
		hash ^= key.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0) % REVIEW_SAMPLE_DENOMINATOR === 0;
}

async function upsertRun(
	ctx: MutationCtx,
	value: Omit<Doc<"generatedRelationRuns">, "_id" | "_creationTime">,
) {
	const existing = await ctx.db
		.query("generatedRelationRuns")
		.withIndex("by_run_key", (q) => q.eq("runKey", value.runKey))
		.unique();
	if (existing) {
		await ctx.db.patch(existing._id, {
			...value,
			createdAt: existing.createdAt,
		});
		return;
	}
	await ctx.db.insert("generatedRelationRuns", value);
}

async function upsertProposal(
	ctx: MutationCtx,
	value: Omit<Doc<"generatedRelationProposals">, "_id" | "_creationTime">,
) {
	const existing = await ctx.db
		.query("generatedRelationProposals")
		.withIndex("by_proposal_key", (q) =>
			q.eq("proposalKey", value.proposalKey),
		)
		.unique();
	if (existing) {
		await ctx.db.patch(existing._id, {
			...value,
			createdAt: existing.createdAt,
			reviewStatus: existing.reviewStatus,
			reviewedBy: existing.reviewedBy,
			reviewNote: existing.reviewNote,
			reviewedAt: existing.reviewedAt,
		});
		return;
	}
	await ctx.db.insert("generatedRelationProposals", value);
}

export async function recordCommittedRelationRun(
	ctx: MutationCtx,
	attempt: Pick<
		Doc<"knowledgeGenerationAttempts">,
		"attemptKey" | "readingId" | "ownerReadingKey" | "attestationId"
	>,
	run: RelationPublicationRun,
	publicationBlocked: boolean,
): Promise<void> {
	assertRunNumber(run.runNumber);
	const now = Date.now();
	for (const relation of run.requestedKinds) {
		const proposals = run.proposals.filter(
			(proposal) => proposal.relation === relation,
		);
		let pendingShadows = 0;
		let directMatches = 0;
		for (const proposal of proposals) {
			let outcome: Infer<typeof relationProposalOutcomeValidator> =
				"PublicationFailed";
			if (!publicationBlocked) {
				const pending = await ctx.db
					.query("pendingSemanticRelations")
					.withIndex("by_locator_key", (q) =>
						q.eq(
							"locatorKey",
							pendingLocatorKey(
								attempt.ownerReadingKey,
								relation,
								proposal.targetShadow,
							),
						),
					)
					.unique();
				// Resolution is only a structural storage outcome, never semantic proof.
				outcome = pending ? "PendingShadow" : "DirectMatch";
				if (pending) pendingShadows += 1;
				else directMatches += 1;
			}
			if (!run.artifactPath) continue;
			const key = proposalKey(
				attempt.attemptKey,
				run.runNumber,
				relation,
				proposal.targetShadow,
			);
			await upsertProposal(ctx, {
				proposalKey: key,
				attemptKey: attempt.attemptKey,
				runNumber: run.runNumber,
				relation,
				sourceReadingId: attempt.readingId,
				sourceReadingKey: attempt.ownerReadingKey,
				contextAttestationId: attempt.attestationId,
				targetShadow: proposal.targetShadow,
				verdictArtifactPath: run.artifactPath,
				fingerprints: run.fingerprints,
				outcome,
				reviewStatus: sampledForReview(key) ? "Pending" : "NotSampled",
				createdAt: now,
				updatedAt: now,
			});
		}
		await upsertRun(ctx, {
			runKey: runKey(attempt.attemptKey, run.runNumber, relation),
			attemptKey: attempt.attemptKey,
			runNumber: run.runNumber,
			relation,
			sourceReadingId: attempt.readingId,
			sourceReadingKey: attempt.ownerReadingKey,
			contextAttestationId: attempt.attestationId,
			verdictArtifactPath: run.artifactPath,
			fingerprints: run.fingerprints,
			generatedTargets: proposals.length,
			nulls: proposals.length === 0 ? 1 : 0,
			pendingShadows,
			directMatches,
			rejectedOutputs: 0,
			publicationFailures: publicationBlocked ? proposals.length : 0,
			createdAt: now,
			updatedAt: now,
		});
	}
}

export const recordRejectedOutput = internalMutation({
	args: {
		attemptKey: v.string(),
		runNumber: v.number(),
		requestedKinds: v.array(directSemanticRelationValidator),
		artifactPath: v.union(v.string(), v.null()),
		fingerprints: relationPublicationFingerprintsValidator,
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		assertRunNumber(args.runNumber);
		const attempt = await ctx.db
			.query("knowledgeGenerationAttempts")
			.withIndex("by_attempt_key", (q) =>
				q.eq("attemptKey", args.attemptKey),
			)
			.unique();
		if (!attempt) return null;
		const now = Date.now();
		for (const relation of args.requestedKinds) {
			await upsertRun(ctx, {
				runKey: runKey(args.attemptKey, args.runNumber, relation),
				attemptKey: args.attemptKey,
				runNumber: args.runNumber,
				relation,
				sourceReadingId: attempt.readingId,
				sourceReadingKey: attempt.ownerReadingKey,
				contextAttestationId: attempt.attestationId,
				verdictArtifactPath: args.artifactPath,
				fingerprints: args.fingerprints,
				generatedTargets: 0,
				nulls: 0,
				pendingShadows: 0,
				directMatches: 0,
				rejectedOutputs: 1,
				publicationFailures: 0,
				createdAt: now,
				updatedAt: now,
			});
		}
		return null;
	},
});

export const recordPublicationFailure = internalMutation({
	args: {
		attemptKey: v.string(),
		run: relationPublicationRunValidator,
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const attempt = await ctx.db
			.query("knowledgeGenerationAttempts")
			.withIndex("by_attempt_key", (q) =>
				q.eq("attemptKey", args.attemptKey),
			)
			.unique();
		if (!attempt) return null;
		await recordCommittedRelationRun(ctx, attempt, args.run, true);
		return null;
	},
});

const monitoringCountsValidator = v.object({
	relation: directSemanticRelationValidator,
	generatedTargets: v.number(),
	nulls: v.number(),
	pendingShadows: v.number(),
	directMatches: v.number(),
	rejectedOutputs: v.number(),
	publicationFailures: v.number(),
	rows: v.number(),
	truncated: v.boolean(),
});

function monitoringLimit(value: number | undefined): number {
	const limit = value ?? 200;
	if (
		!Number.isSafeInteger(limit) ||
		limit < 1 ||
		limit > MAX_MONITORING_ROWS
	) {
		throw new Error(
			`limit must be an integer from 1 to ${MAX_MONITORING_ROWS}.`,
		);
	}
	return limit;
}

export const monitorKind = internalQuery({
	args: {
		relation: directSemanticRelationValidator,
		from: v.number(),
		to: v.number(),
		limit: v.optional(v.number()),
	},
	returns: monitoringCountsValidator,
	handler: async (ctx, args) => {
		if (
			!Number.isFinite(args.from) ||
			!Number.isFinite(args.to) ||
			args.from < 0 ||
			args.to < args.from
		) {
			throw new Error(
				"Monitoring requires a finite, ordered time range.",
			);
		}
		const limit = monitoringLimit(args.limit);
		const rows = await ctx.db
			.query("generatedRelationRuns")
			.withIndex("by_relation_and_created_at", (q) =>
				q
					.eq("relation", args.relation)
					.gte("createdAt", args.from)
					.lte("createdAt", args.to),
			)
			.take(limit + 1);
		const selected = rows.slice(0, limit);
		const totals = {
			relation: args.relation,
			generatedTargets: 0,
			nulls: 0,
			pendingShadows: 0,
			directMatches: 0,
			rejectedOutputs: 0,
			publicationFailures: 0,
			rows: 0,
			truncated: rows.length > limit,
		};
		for (const row of selected) {
			totals.generatedTargets += row.generatedTargets;
			totals.nulls += row.nulls;
			totals.pendingShadows += row.pendingShadows;
			totals.directMatches += row.directMatches;
			totals.rejectedOutputs += row.rejectedOutputs;
			totals.publicationFailures += row.publicationFailures;
			totals.rows += 1;
		}
		return totals;
	},
});

const reviewProjectionValidator = v.object({
	proposalKey: v.string(),
	attemptKey: v.string(),
	runNumber: v.number(),
	relation: directSemanticRelationValidator,
	sourceReadingId: v.id("readings"),
	sourceReadingKey: v.string(),
	contextAttestationId: v.id("attestations"),
	targetShadow: relationTargetShadowValidator,
	verdictArtifactPath: v.string(),
	fingerprints: relationPublicationFingerprintsValidator,
	outcome: relationProposalOutcomeValidator,
	reviewStatus: relationReviewStatusValidator,
});

export const listAttemptProvenance = internalQuery({
	args: {
		attemptKey: v.string(),
		runNumber: v.number(),
		limit: v.optional(v.number()),
	},
	returns: v.array(reviewProjectionValidator),
	handler: async (ctx, args) => {
		assertRunNumber(args.runNumber);
		const limit = args.limit ?? MAX_REVIEW_ROWS;
		if (
			!Number.isSafeInteger(limit) ||
			limit < 1 ||
			limit > MAX_REVIEW_ROWS
		) {
			throw new Error(
				`limit must be an integer from 1 to ${MAX_REVIEW_ROWS}.`,
			);
		}
		const rows = await ctx.db
			.query("generatedRelationProposals")
			.withIndex("by_attempt_key_and_run_number", (q) =>
				q
					.eq("attemptKey", args.attemptKey)
					.eq("runNumber", args.runNumber),
			)
			.take(limit);
		return rows.map((row) => ({
			proposalKey: row.proposalKey,
			attemptKey: row.attemptKey,
			runNumber: row.runNumber,
			relation: row.relation,
			sourceReadingId: row.sourceReadingId,
			sourceReadingKey: row.sourceReadingKey,
			contextAttestationId: row.contextAttestationId,
			targetShadow: row.targetShadow,
			verdictArtifactPath: row.verdictArtifactPath,
			fingerprints: row.fingerprints,
			outcome: row.outcome,
			reviewStatus: row.reviewStatus,
		}));
	},
});

export const listPendingReviews = internalQuery({
	args: { limit: v.optional(v.number()) },
	returns: v.array(reviewProjectionValidator),
	handler: async (ctx, args) => {
		const limit = args.limit ?? 20;
		if (
			!Number.isSafeInteger(limit) ||
			limit < 1 ||
			limit > MAX_REVIEW_ROWS
		) {
			throw new Error(
				`limit must be an integer from 1 to ${MAX_REVIEW_ROWS}.`,
			);
		}
		const rows = await ctx.db
			.query("generatedRelationProposals")
			.withIndex("by_review_status_and_updated_at", (q) =>
				q.eq("reviewStatus", "Pending"),
			)
			.take(limit);
		return rows.map((row) => ({
			proposalKey: row.proposalKey,
			attemptKey: row.attemptKey,
			runNumber: row.runNumber,
			relation: row.relation,
			sourceReadingId: row.sourceReadingId,
			sourceReadingKey: row.sourceReadingKey,
			contextAttestationId: row.contextAttestationId,
			targetShadow: row.targetShadow,
			verdictArtifactPath: row.verdictArtifactPath,
			fingerprints: row.fingerprints,
			outcome: row.outcome,
			reviewStatus: row.reviewStatus,
		}));
	},
});

export const recordReview = internalMutation({
	args: {
		proposalKey: v.string(),
		decision: v.union(v.literal("Accepted"), v.literal("Rejected")),
		reviewer: v.string(),
		note: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const reviewer = args.reviewer.trim();
		const note = args.note.trim();
		if (reviewer.length === 0 || reviewer.length > 200)
			throw new Error("A bounded reviewer identity is required.");
		if (note.length === 0 || note.length > 2_000)
			throw new Error("A bounded semantic review note is required.");
		const proposal = await ctx.db
			.query("generatedRelationProposals")
			.withIndex("by_proposal_key", (q) =>
				q.eq("proposalKey", args.proposalKey),
			)
			.unique();
		if (!proposal) throw new Error("Review proposal does not exist.");
		if (proposal.reviewStatus !== "Pending") {
			throw new Error("Only a pending sampled proposal can be reviewed.");
		}
		await ctx.db.patch(proposal._id, {
			reviewStatus: args.decision,
			reviewedBy: reviewer,
			reviewNote: note,
			reviewedAt: Date.now(),
			updatedAt: Date.now(),
		});
		return null;
	},
});

export const directRelationKindInventory = directSemanticRelationValues;
