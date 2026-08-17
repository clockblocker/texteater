import type { PlanMutationResult } from "../core/plan-mutation";
import type { SupportedLanguage } from "../dumling";
import type { DumdictMutationOptions, MutationResult } from "../public";
import { commitChangesResultSchema, getDumdictSchemasFor } from "../schema";
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
	const schemas = getDumdictSchemasFor(serviceOptions.language);
	const parsedPlan = schemas.dumdictPlanSchema.parse({
		baseRevision: plan.baseRevision,
		changes: plan.changes,
	});
	const publicPlan = immutableClone(parsedPlan) as unknown as DumdictPlan<L>;
	const rawCommit = mutationOptions?.applyPlan
		? await mutationOptions.applyPlan(publicPlan)
		: plan.changes.length === 0
			? {
					status: "committed" as const,
					nextRevision: plan.baseRevision,
				}
			: await serviceOptions.storage.commitChanges(
					schemas.commitChangesRequestSchema.parse({
						baseRevision: plan.baseRevision,
						changes: plan.changes,
					}),
				);
	const commit = commitChangesResultSchema.parse(rawCommit);
	return mutationResultFromCommit(plan, commit);
}
