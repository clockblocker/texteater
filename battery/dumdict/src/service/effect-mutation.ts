import type * as Dumling from "dumling/types";

import * as Effect from "effect/Effect";
import {
	parseAsCommitChangesRequest,
	parseAsCommitChangesResult,
	unwrapDumdictParse,
} from "../parsing/lightweight-parsers";
import type {
	DumdictCommitFailure,
	MutationResult,
	PreparedMutation,
} from "../public";
import type { CreateDumdictServiceOptions } from "../storage";

export function commitPrepared<L extends Dumling.Language>(
	options: CreateDumdictServiceOptions<L>,
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
			unwrapDumdictParse(
				parseAsCommitChangesRequest(
					preparedMutation.plan,
					options.language,
				),
			),
		)
		.pipe(
			Effect.flatMap((raw) =>
				Effect.sync(() =>
					unwrapDumdictParse(parseAsCommitChangesResult(raw)),
				),
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
