import type * as Dumling from "dumling/types";

import * as Effect from "effect/Effect";
import type { PlanMutationResult } from "../core/plan-mutation";
import type {
	DumdictCommitFailure,
	DumdictRejection,
	MutationResult,
	PreparedMutation,
} from "../public";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

export function prepared<L extends Dumling.Language>(
	options: DumdictServiceRuntimeOptions<L>,
	plan:
		| PlanMutationResult<L>
		| {
				status: "rejected";
				code: import("../public").MutationRejectedCode;
				message?: string;
		  },
): Effect.Effect<PreparedMutation<L>, DumdictRejection> {
	if (plan.status === "rejected")
		return Effect.fail({
			_tag: "DumdictRejection",
			code: plan.code,
			...(plan.message === undefined ? {} : { message: plan.message }),
		});
	return Effect.sync(() => {
		const parsed = options.sliceValidation.plan({
			baseRevision: plan.baseRevision,
			changes: plan.changes,
		});
		return structuredClone({
			plan: parsed,
			affected: plan.affected,
			summary: plan.summary,
		});
	});
}

export function commitPrepared<L extends Dumling.Language>(
	options: DumdictServiceRuntimeOptions<L>,
	preparedMutation: PreparedMutation<L>,
): Effect.Effect<MutationResult<L>, DumdictCommitFailure> {
	if (preparedMutation.plan.changes.length === 0)
		return Effect.succeed({
			status: "applied",
			baseRevision: preparedMutation.plan.baseRevision,
			nextRevision: preparedMutation.plan.baseRevision,
			affected: preparedMutation.affected,
			summary: preparedMutation.summary,
		});
	return options.storage
		.commitChanges(
			options.sliceValidation.commitRequest(preparedMutation.plan),
		)
		.pipe(
			Effect.flatMap((raw) =>
				Effect.sync(() => options.sliceValidation.commitResult(raw)),
			),
			Effect.flatMap((commit) => {
				if (commit.status === "committed")
					return Effect.succeed({
						status: "applied" as const,
						baseRevision: preparedMutation.plan.baseRevision,
						nextRevision: commit.nextRevision,
						affected: preparedMutation.affected,
						summary: preparedMutation.summary,
					});
				return Effect.fail(
					commit.code === "revisionConflict"
						? {
								_tag: "DumdictRevisionConflict" as const,
								baseRevision:
									preparedMutation.plan.baseRevision,
								...(commit.latestRevision === undefined
									? {}
									: {
											latestRevision:
												commit.latestRevision,
										}),
								...(commit.message === undefined
									? {}
									: { message: commit.message }),
							}
						: {
								_tag: "DumdictSemanticPreconditionFailure" as const,
								baseRevision:
									preparedMutation.plan.baseRevision,
								...(commit.latestRevision === undefined
									? {}
									: {
											latestRevision:
												commit.latestRevision,
										}),
								...(commit.message === undefined
									? {}
									: { message: commit.message }),
							},
				);
			}),
			Effect.withSpan("dumdict.commit", {
				attributes: {
					baseRevision: preparedMutation.plan.baseRevision,
					changeCount: preparedMutation.plan.changes.length,
				},
			}),
		);
}
