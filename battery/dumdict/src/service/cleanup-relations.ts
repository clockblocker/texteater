import { planCleanupRelations } from "../core/plan-mutation";
import { isKnownRelation } from "../core/relations/family";
import { validateCleanupRelationsSlice } from "../core/validate-slice";
import type { SupportedLanguage } from "../dumling";
import type { CleanupRelationsRequest, MutationResult } from "../public";
import type { CreateDumdictServiceOptions } from "../storage";
import { assertDumlingIdLanguageMatches } from "./language-guard";
import { mutationResultFromCommit } from "./result-mapping";

function hasDuplicateResolutionKey<L extends SupportedLanguage>(
	request: CleanupRelationsRequest<L>,
) {
	const keys = request.resolutions.map(
		({ sourceLemmaId, relation, targetPendingId }) =>
			`${sourceLemmaId}:${relation}:${targetPendingId}`,
	);
	return new Set(keys).size !== keys.length;
}

export async function cleanupRelations<L extends SupportedLanguage>(
	options: CreateDumdictServiceOptions<L>,
	request: CleanupRelationsRequest<L>,
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

	if (hasDuplicateResolutionKey(request)) {
		return {
			status: "rejected",
			code: "invalidRequest",
			message: "Duplicate cleanup resolutions are not allowed.",
		};
	}

	for (const resolution of request.resolutions) {
		if (!isKnownRelation(resolution.relation)) {
			return {
				status: "rejected",
				code: "invalidRequest",
				message: "Cleanup relation is invalid.",
			};
		}
		assertDumlingIdLanguageMatches(options.language, resolution.sourceLemmaId);
		if (resolution.targetLemmaId) {
			assertDumlingIdLanguageMatches(options.language, resolution.targetLemmaId);
		}
	}

	const slice = await options.storage.loadCleanupRelationsContext({
		resolutions: request.resolutions,
	});
	validateCleanupRelationsSlice(options.language, slice);

	if (slice.revision !== request.baseRevision) {
		return {
			status: "conflict",
			code: "revisionConflict",
			baseRevision: request.baseRevision,
			latestRevision: slice.revision,
			message: "Cleanup workset is stale.",
		};
	}

	const targetLemmasById = new Set(slice.targetLemmas.map(({ id }) => id));
	for (const resolution of request.resolutions) {
		if (resolution.targetLemmaId && !targetLemmasById.has(resolution.targetLemmaId)) {
			return {
				status: "conflict",
				code: "semanticPreconditionFailed",
				baseRevision: request.baseRevision,
				latestRevision: slice.revision,
				message: "Cleanup target lemma no longer exists.",
			};
		}
	}

	const pendingRelationKeys = new Set(
		slice.pendingRelations.map(
			({ sourceLemmaId, relation, targetPendingId }) =>
				`${sourceLemmaId}:${relation}:${targetPendingId}`,
		),
	);
	for (const resolution of request.resolutions) {
		const key = `${resolution.sourceLemmaId}:${resolution.relation}:${resolution.targetPendingId}`;
		if (!pendingRelationKeys.has(key)) {
			return {
				status: "conflict",
				code: "semanticPreconditionFailed",
				baseRevision: request.baseRevision,
				latestRevision: slice.revision,
				message: "Cleanup pending relation no longer exists.",
			};
		}
	}

	const plan = planCleanupRelations(slice, {
		type: "cleanupRelations",
		baseRevision: request.baseRevision,
		resolutions: request.resolutions,
	});
	if (plan.status === "rejected") {
		return plan;
	}

	const commit = await options.storage.commitChanges({
		baseRevision: plan.baseRevision,
		changes: plan.changes,
	});
	return mutationResultFromCommit(plan, commit);
}
