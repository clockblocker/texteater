import type { Infer } from "convex/values";
import type {
	AddNewNoteRequest,
	ApplyGeneratedKnowledgeRequest,
	DumdictPlanOutcome,
	EnsureOwnedSurfaceRequest,
	EnsureReadingEntryRequest,
	MutationRejectedCode,
} from "dumdict/planning";

import type { MutationCtx } from "./_generated/server";
import { dictionaryPlanResult } from "./dumdictStorage/dictionaryPlan";
import { createDumdictMutationPlanner } from "./dumdictStorage/planner";
import {
	hasDumdictLemma,
	loadDumdictReadingEntryByKey,
	loadDumdictRevision,
} from "./dumdictStorage/storage";
import { applyDumdictPlanInTransaction } from "./dumdictStorage/transaction";
import type { dictionaryPlanValidator } from "./model/validators";

export type DumdictTransactionPlan = Infer<typeof dictionaryPlanValidator>;

export type DumdictTransactionCommit =
	| { readonly status: "committed"; readonly nextRevision: string }
	| {
			readonly status: "conflict";
			readonly code: "revisionConflict" | "semanticPreconditionFailed";
			readonly latestRevision?: string;
			readonly message?: string;
	  };

/** Outcome of planning and committing one dictionary workflow in the host transaction. */
export type DumdictTransactionOutcome =
	| {
			readonly status: "committed";
			readonly nextRevision: string;
			readonly plan: DumdictTransactionPlan;
	  }
	| {
			readonly status: "rejected";
			readonly code: MutationRejectedCode;
			readonly message?: string;
	  }
	| Extract<DumdictTransactionCommit, { status: "conflict" }>;

export type DumdictTransaction = {
	/** Apply an ordinary Dumdict plan inside the caller's Convex transaction. */
	readonly commit: (
		plan: DumdictTransactionPlan,
	) => Promise<DumdictTransactionCommit>;
	/** Plan a new Reading Note against the transaction's own state and apply it. */
	readonly addNewNote: (
		request: AddNewNoteRequest<"de">,
	) => Promise<DumdictTransactionOutcome>;
	readonly ensureOwnedSurface: (
		request: EnsureOwnedSurfaceRequest<"de">,
	) => Promise<DumdictTransactionOutcome>;
	readonly ensureReadingEntry: (
		request: EnsureReadingEntryRequest<"de">,
	) => Promise<DumdictTransactionOutcome>;
	readonly applyGeneratedKnowledge: (
		request: ApplyGeneratedKnowledgeRequest<"de">,
	) => Promise<DumdictTransactionOutcome>;
	readonly readRevision: () => Promise<string>;
	readonly containsLemma: (lemma: unknown) => Promise<boolean>;
	readonly loadReadingEntry: (readingKey: string) => Promise<unknown | null>;
};

/**
 * Transaction-local Shared Demo Dictionary persistence seam.
 *
 * The returned module never opens a nested Convex transaction. Dictionary
 * writes therefore commit or roll back with the host occurrence, generated
 * Knowledge, or fixed-member write that requested them. Workflow methods plan
 * where the data is: the slice they plan against and the state they commit
 * into are read in one transaction, so Convex's optimistic concurrency, not a
 * revision precondition, resolves concurrent writers.
 */
export function createDumdictTransaction(ctx: MutationCtx): DumdictTransaction {
	const planner = createDumdictMutationPlanner(ctx);
	async function apply(
		outcome: DumdictPlanOutcome<"de">,
	): Promise<DumdictTransactionOutcome> {
		if (outcome.status === "rejected") return outcome;
		const plan = dictionaryPlanResult(outcome.plan);
		const commit = await applyDumdictPlanInTransaction(ctx, plan);
		return commit.status === "committed" ? { ...commit, plan } : commit;
	}
	return {
		commit: (plan) => applyDumdictPlanInTransaction(ctx, plan),
		addNewNote: async (request) => apply(await planner.addNewNote(request)),
		ensureOwnedSurface: async (request) =>
			apply(await planner.ensureOwnedSurface(request)),
		ensureReadingEntry: async (request) =>
			apply(await planner.ensureReadingEntry(request)),
		applyGeneratedKnowledge: async (request) =>
			apply(await planner.applyGeneratedKnowledge(request)),
		readRevision: () => loadDumdictRevision(ctx),
		containsLemma: (lemma) => hasDumdictLemma(ctx, lemma),
		loadReadingEntry: (readingKey) =>
			loadDumdictReadingEntryByKey(ctx, readingKey),
	};
}
