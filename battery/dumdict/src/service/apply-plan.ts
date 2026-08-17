import type { PlanMutationResult } from "../core/plan-mutation";
import type { SupportedLanguage } from "../dumling";
import type { DumdictMutationOptions, MutationResult } from "../public";
import type { CreateDumdictServiceOptions, DumdictPlan } from "../storage";
import { mutationResultFromCommit } from "./result-mapping";

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
	serviceOptions: CreateDumdictServiceOptions<L>,
	plan: PlanMutationResult<L>,
	mutationOptions?: DumdictMutationOptions<L>,
): Promise<MutationResult<L>> {
	const publicPlan = immutableClone({
		baseRevision: plan.baseRevision,
		changes: plan.changes,
	}) as unknown as DumdictPlan<L>;
	const commit = mutationOptions?.applyPlan
		? await mutationOptions.applyPlan(publicPlan)
		: plan.changes.length === 0
			? {
					status: "committed" as const,
					nextRevision: plan.baseRevision,
				}
			: await serviceOptions.storage.commitChanges({
					baseRevision: plan.baseRevision,
					changes: plan.changes,
				});
	return mutationResultFromCommit(plan, commit);
}
