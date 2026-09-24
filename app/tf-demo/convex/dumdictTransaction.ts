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
import {
	type ReadingEntryContextArgs,
	readingEntryContextArgs,
} from "./dumdictStorage/contextRequest";
import { dictionaryPlanResult } from "./dumdictStorage/dictionaryPlan";
import {
	generatedKnowledgeContextChanges,
	loadCleanupRelationsSlice,
	loadReadingEntryContextSlice,
} from "./dumdictStorage/queries";
import { MAX_PLANNED_CHANGES } from "./dumdictStorage/storage";
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

/**
 * A plan with more changes than one commit takes. Nothing was written, so
 * the caller may split its request and send the parts.
 */
export type DumdictOverBudget = {
	readonly status: "overBudget";
	readonly plannedChanges: number;
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
	/** The one workflow a caller can split, so it reports an over-budget plan. */
	readonly applyGeneratedKnowledge: (
		request: ApplyGeneratedKnowledgeRequest<"de">,
	) => Promise<DumdictTransactionOutcome | DumdictOverBudget>;
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
	function contextArgs(load: ReadingEntryContextLoad<"de">) {
		return readingEntryContextArgs(planner.contextRequest(load));
	}
	async function loadContext<Load extends ReadingEntryContextLoad<"de">>(
		load: Load,
		args: ReadingEntryContextArgs = contextArgs(load),
	) {
		const slice = await loadReadingEntryContextSlice(ctx, args);
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
		applyGeneratedKnowledge: async (request) => {
			const load = {
				intent: "applyGeneratedKnowledge",
				request,
			} as const;
			const args = contextArgs(load);
			// The context is sized for the plan, so both bound one commit.
			const contextChanges =
				args.intent === "applyGeneratedKnowledge"
					? generatedKnowledgeContextChanges(args)
					: 0;
			if (contextChanges > MAX_PLANNED_CHANGES)
				return { status: "overBudget", plannedChanges: contextChanges };
			const outcome = planner.applyGeneratedKnowledge(
				await loadContext(load, args),
				request,
			);
			if (
				outcome.status !== "rejected" &&
				outcome.plan.changes.length > MAX_PLANNED_CHANGES
			)
				return {
					status: "overBudget",
					plannedChanges: outcome.plan.changes.length,
				};
			return apply(outcome);
		},
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
