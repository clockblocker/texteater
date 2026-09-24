import type { Infer } from "convex/values";
import {
	type AddNewNoteRequest,
	type ApplyGeneratedKnowledgeRequest,
	createDumdictPlanner,
	type DumdictPlanOutcome,
	type EnsureOwnedSurfaceRequest,
	type MutationRejectedCode,
	type ReadingEntryContext,
	type ReadingEntryContextLoad,
} from "dumdict/planning";

import type { MutationCtx } from "./_generated/server";
import { readingEntryContextArgs } from "./dumdictStorage/contextRequest";
import { dictionaryPlanResult } from "./dumdictStorage/dictionaryPlan";
import { loadReadingEntryContextSlice } from "./dumdictStorage/queries";
import { applyDumdictPlanInTransaction } from "./dumdictStorage/transaction";
import type { dictionaryPlanValidator } from "./model/validators";

export type DumdictTransactionPlan = Infer<typeof dictionaryPlanValidator>;

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
	| {
			readonly status: "conflict";
			readonly code: "revisionConflict" | "semanticPreconditionFailed";
			readonly latestRevision?: string;
			readonly message?: string;
	  };

export type DumdictTransaction = {
	/** Plan a new Reading Note against the transaction's own state and apply it. */
	readonly addNewNote: (
		request: AddNewNoteRequest<"de">,
	) => Promise<DumdictTransactionOutcome>;
	readonly ensureOwnedSurface: (
		request: EnsureOwnedSurfaceRequest<"de">,
	) => Promise<DumdictTransactionOutcome>;
	readonly applyGeneratedKnowledge: (
		request: ApplyGeneratedKnowledgeRequest<"de">,
	) => Promise<DumdictTransactionOutcome>;
};

/**
 * Transaction-local Shared Demo Dictionary persistence seam.
 *
 * The returned module never opens a nested Convex transaction. Dictionary
 * writes therefore commit or roll back with the host occurrence or generated
 * Knowledge write that requested them. Workflow methods plan where the data
 * is: they read the slice from `ctx.db`, plan with the same Dumdict planners
 * as the action adapter in `dumdictStorage/adapter.ts`, and apply in the same
 * transaction. The revision a plan was built against is therefore the
 * revision it commits against, so Convex's optimistic concurrency, not a
 * retry loop, resolves concurrent writers.
 */
export function createDumdictTransaction(ctx: MutationCtx): DumdictTransaction {
	const planner = createDumdictPlanner("de");
	async function loadContext<Load extends ReadingEntryContextLoad<"de">>(
		load: Load,
	) {
		const slice = await loadReadingEntryContextSlice(
			ctx,
			readingEntryContextArgs(planner.contextRequest(load)),
		);
		return slice as unknown as Extract<
			ReadingEntryContext<"de">,
			{ intent: Load["intent"] }
		>;
	}
	async function apply(
		outcome: DumdictPlanOutcome<"de">,
	): Promise<DumdictTransactionOutcome> {
		if (outcome.status === "rejected") return outcome;
		const plan = dictionaryPlanResult(outcome.plan);
		const commit = await applyDumdictPlanInTransaction(ctx, plan);
		return commit.status === "committed" ? { ...commit, plan } : commit;
	}
	return {
		addNewNote: async (request) =>
			apply(
				planner.addNewNote(
					await loadContext({ intent: "addNewNote", request }),
					request,
				),
			),
		ensureOwnedSurface: async (request) =>
			apply(
				planner.ensureOwnedSurface(
					await loadContext({
						intent: "ensureOwnedSurface",
						request,
					}),
					request,
				),
			),
		applyGeneratedKnowledge: async (request) =>
			apply(
				planner.applyGeneratedKnowledge(
					await loadContext({
						intent: "applyGeneratedKnowledge",
						request,
					}),
					request,
				),
			),
	};
}
