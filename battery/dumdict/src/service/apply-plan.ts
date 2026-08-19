import type { PlanMutationResult } from "../core/plan-mutation";
import type { SupportedLanguage } from "../dumling";
import type { DumdictMutationOptions, MutationResult } from "../public";
import { mutationResultFromCommit } from "./result-mapping";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

function immutableClone<T>(value: T): T {
	if (Array.isArray(value)) {
		return Object.freeze(
			value.map((member) => immutableClone(member)),
		) as T;
	}
	if (value !== null && typeof value === "object") {
		return Object.freeze(
			Object.fromEntries(
				Object.entries(value).map(([key, member]) => [
					key,
					immutableClone(member),
				]),
			),
		) as T;
	}
	return value;
}

export async function applyPlan<L extends SupportedLanguage>(
	serviceOptions: DumdictServiceRuntimeOptions<L>,
	plan: PlanMutationResult<L>,
	mutationOptions?: DumdictMutationOptions<L>,
): Promise<MutationResult<L>> {
	const parsedPlan = serviceOptions.sliceValidation.plan({
		baseRevision: plan.baseRevision,
		changes: plan.changes,
	});
	const publicPlan = immutableClone(parsedPlan);
	const rawCommit = mutationOptions?.applyPlan
		? await mutationOptions.applyPlan(publicPlan)
		: plan.changes.length === 0
			? {
					status: "committed" as const,
					nextRevision: plan.baseRevision,
				}
			: await serviceOptions.storage.commitChanges(
					serviceOptions.sliceValidation.commitRequest({
						baseRevision: plan.baseRevision,
						changes: plan.changes,
					}),
				);
	const commit = serviceOptions.sliceValidation.commitResult(rawCommit);
	return mutationResultFromCommit(plan, commit);
}
