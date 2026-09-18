import {
	type AddNewNoteRequest,
	type ApplyGeneratedKnowledgeRequest,
	createDumdictPlanner,
	type DumdictPlanOutcome,
	type EnsureOwnedSurfaceRequest,
	type EnsureReadingEntryRequest,
	type ReadingEntryContext,
	type ReadingEntryContextLoad,
} from "dumdict/planning";

import type { MutationCtx } from "../_generated/server";
import { readingEntryContextArgs } from "./contextRequest";
import { loadReadingEntryContextSlice } from "./queries";

/**
 * Mutation-side Shared Demo Dictionary planner.
 *
 * The action adapter in `adapter.ts` reads slices across query hops and plans
 * in the node process. This adapter serves callers that already hold a Convex
 * transaction: it reads the same slice from `ctx.db`, plans with the same
 * Dumdict planners, and returns the plan for `applyDumdictPlanInTransaction`
 * to apply in the same transaction. The revision the plan was built against is
 * therefore the revision it commits against, so revision conflicts cannot
 * occur and no retry loop is needed.
 */
export type DumdictMutationPlanner = {
	readonly addNewNote: (
		request: AddNewNoteRequest<"de">,
	) => Promise<DumdictPlanOutcome<"de">>;
	readonly ensureOwnedSurface: (
		request: EnsureOwnedSurfaceRequest<"de">,
	) => Promise<DumdictPlanOutcome<"de">>;
	readonly ensureReadingEntry: (
		request: EnsureReadingEntryRequest<"de">,
	) => Promise<DumdictPlanOutcome<"de">>;
	readonly applyGeneratedKnowledge: (
		request: ApplyGeneratedKnowledgeRequest<"de">,
	) => Promise<DumdictPlanOutcome<"de">>;
};

export function createDumdictMutationPlanner(
	ctx: MutationCtx,
): DumdictMutationPlanner {
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
	return {
		async addNewNote(request) {
			return planner.addNewNote(
				await loadContext({ intent: "addNewNote", request }),
				request,
			);
		},
		async ensureOwnedSurface(request) {
			return planner.ensureOwnedSurface(
				await loadContext({ intent: "ensureOwnedSurface", request }),
				request,
			);
		},
		async ensureReadingEntry(request) {
			return planner.ensureReadingEntry(
				await loadContext({ intent: "ensureReadingEntry", request }),
				request,
			);
		},
		async applyGeneratedKnowledge(request) {
			return planner.applyGeneratedKnowledge(
				await loadContext({
					intent: "applyGeneratedKnowledge",
					request,
				}),
				request,
			);
		},
	};
}
