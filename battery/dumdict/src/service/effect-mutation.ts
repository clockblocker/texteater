import { traceStage } from "common-utils/workflow";
import type { SupportedLanguage } from "dumling-old/types";
import * as Effect from "effect/Effect";
import type { PlanMutationResult } from "../core/plan-mutation";
import type {
	DumdictCommitFailure,
	DumdictRejection,
	MutationResult,
	PreparedMutation,
} from "../public";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

function freeze<T>(value: T): T {
	if (Array.isArray(value)) return Object.freeze(value.map(freeze)) as T;
	if (value !== null && typeof value === "object")
		return Object.freeze(
			Object.fromEntries(
				Object.entries(value).map(([key, member]) => [
					key,
					freeze(member),
				]),
			),
		) as T;
	return value;
}

export function prepared<L extends SupportedLanguage>(
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
		return freeze({
			plan: parsed,
			affected: plan.affected,
			summary: plan.summary,
		});
	});
}

export function commitPrepared<L extends SupportedLanguage>(
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
	return traceStage(
		"dumdict.commit",
		options.storage
			.commitChanges(
				options.sliceValidation.commitRequest(preparedMutation.plan),
			)
			.pipe(
				Effect.flatMap((raw) =>
					Effect.sync(() =>
						options.sliceValidation.commitResult(raw),
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
			),
		{
			baseRevision: preparedMutation.plan.baseRevision,
			changeCount: preparedMutation.plan.changes.length,
		},
	);
}
