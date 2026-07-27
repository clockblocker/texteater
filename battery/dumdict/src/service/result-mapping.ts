import type { PlanMutationResult } from "../core/plan-mutation";
import type { SupportedLanguage } from "../dumling";
import type { CommitChangesResult } from "../storage";
import type { MutationResult } from "../public";

export function mutationResultFromCommit<L extends SupportedLanguage>(
	plan: PlanMutationResult<L>,
	commit: CommitChangesResult,
): MutationResult<L> {
	if (commit.status === "conflict") {
		return {
			status: "conflict",
			code: commit.code,
			baseRevision: plan.baseRevision,
			latestRevision: commit.latestRevision,
			message: commit.message,
		};
	}

	return {
		status: "applied",
		baseRevision: plan.baseRevision,
		nextRevision: commit.nextRevision,
		affected: plan.affected,
		summary: plan.summary,
	};
}
