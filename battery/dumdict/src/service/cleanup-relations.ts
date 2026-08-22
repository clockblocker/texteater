import type { SupportedLanguage } from "dumling/types";
import { semanticRelationValues } from "dumrel/relations";
import { planCleanupRelations } from "../core/plan-mutation";
import type {
	CleanupRelationsRequest,
	DumdictMutationOptions,
	MutationResult,
} from "../public";
import { applyPlan } from "./apply-plan";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

function locatorKey(
	value: CleanupRelationsRequest<SupportedLanguage>["resolutions"][number]["locator"],
) {
	return `${value.sourceReadingKey}\0${value.relation}\0${value.targetPendingId}`;
}

export async function cleanupRelations<L extends SupportedLanguage>(
	options: DumdictServiceRuntimeOptions<L>,
	request: CleanupRelationsRequest<L>,
	mutationOptions?: DumdictMutationOptions<L>,
): Promise<MutationResult<L>> {
	if (request.resolutions.length === 0) {
		return {
			status: "applied",
			baseRevision: request.baseRevision,
			nextRevision: request.baseRevision,
			affected: {},
			summary: { message: "No relations cleaned up." },
		};
	}
	const keys = request.resolutions.map(({ locator }) => locatorKey(locator));
	if (
		new Set(keys).size !== keys.length ||
		request.resolutions.some(
			({ locator }) => !semanticRelationValues.includes(locator.relation),
		)
	) {
		return {
			status: "rejected",
			code: "invalidRequest",
			message: "Cleanup resolution is invalid or duplicated.",
		};
	}

	const slice = await options.storage.loadCleanupRelationsContext({
		resolutions: request.resolutions,
	});
	options.sliceValidation.cleanupRelations(slice);
	if (slice.revision !== request.baseRevision) {
		return {
			status: "conflict",
			code: "revisionConflict",
			baseRevision: request.baseRevision,
			latestRevision: slice.revision,
			message: "Cleanup workset is stale.",
		};
	}

	const pendingKeys = new Set(
		slice.pendingRelations.map(({ locator }) => locatorKey(locator)),
	);
	for (const resolution of request.resolutions) {
		if (!pendingKeys.has(locatorKey(resolution.locator))) {
			return {
				status: "conflict",
				code: "semanticPreconditionFailed",
				baseRevision: request.baseRevision,
				latestRevision: slice.revision,
				message: "Cleanup pending relation no longer exists.",
			};
		}
	}

	const plan = planCleanupRelations(slice, request);
	if (plan.status === "rejected") return plan;
	return applyPlan(options, plan, mutationOptions);
}
