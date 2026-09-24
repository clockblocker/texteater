import type { Infer } from "convex/values";
import {
	type AddNewNoteRequest,
	type ApplyGeneratedKnowledgeRequest,
	type CleanupRelationsRequest,
	type CleanupRelationsSlice,
	createDumdictPlanner,
	type DumdictPlanOutcome,
	type EnsureOwnedSurfaceRequest,
	type EnsureReadingEntryRequest,
	type MutationRejectedCode,
	type ReadingEntryContext,
	type ReadingEntryContextLoad,
} from "dumdict/planning";
import type { MutationCtx } from "./_generated/server";
import { readingEntryContextArgs } from "./dumdictStorage/contextRequest";
import { dictionaryPlanResult } from "./dumdictStorage/dictionaryPlan";
import {
	loadCleanupRelationsSlice,
	loadReadingEntryContextSlice,
} from "./dumdictStorage/queries";
import { applyDumdictPlanInTransaction } from "./dumdictStorage/transaction";
import { pendingLocatorIndexKey } from "./model/dumdictPendingIndexes";
import type { dictionaryPlanValidator } from "./model/validators";

export type DumdictTransactionPlan = Infer<typeof dictionaryPlanValidator>;

/** Outcome of planning and committing one dictionary workflow in the host transaction. */
export type DumdictTransactionOutcome =
	| {
			readonly status: "committed";
			readonly plan: DumdictTransactionPlan;
			/** The planner's summary of what the plan changed. */
			readonly message: string;
	  }
	| {
			readonly status: "rejected";
			readonly code: MutationRejectedCode;
			readonly message?: string;
	  }
	| {
			readonly status: "conflict";
			readonly code: "semanticPreconditionFailed";
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
	readonly ensureReadingEntry: (
		request: EnsureReadingEntryRequest<"de">,
	) => Promise<DumdictTransactionOutcome>;
	readonly applyGeneratedKnowledge: (
		request: ApplyGeneratedKnowledgeRequest<"de">,
	) => Promise<DumdictTransactionOutcome>;
	readonly cleanupRelations: (
		request: CleanupRelationsRequest<"de">,
	) => Promise<DumdictTransactionOutcome>;
};

/**
 * Transaction-local Shared Demo Dictionary persistence seam.
 *
 * The returned module never opens a nested Convex transaction. Dictionary
 * writes therefore commit or roll back with the host write that requested
 * them. Workflow methods plan where the data is: they read the slice from
 * `ctx.db`, plan with the same Dumdict planners as the Effect service, and
 * apply in the same transaction. A plan therefore commits against the reads
 * it was built from, so Convex's optimistic concurrency, not a revision check
 * or a retry loop, resolves concurrent writers.
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
		return commit.status === "committed"
			? { status: "committed", plan, message: outcome.summary.message }
			: commit;
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
		ensureReadingEntry: async (request) =>
			apply(
				planner.ensureReadingEntry(
					await loadContext({
						intent: "ensureReadingEntry",
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
		cleanupRelations: async (request) =>
			apply(
				planner.cleanupRelations(
					(await loadCleanupRelationsSlice(
						ctx,
						request.resolutions.map(({ locator }) =>
							pendingLocatorIndexKey(locator),
						),
					)) as unknown as CleanupRelationsSlice<"de">,
					request,
				),
			),
	};
}
