import { readingFingerprint } from "dumling";
import type { PendingSemanticRelationLocator, Reading } from "../../dto";
import type { SupportedLanguage } from "../../dumling";
import type { CleanupRelationsRequest } from "../../public";
import type { CleanupRelationsSlice } from "../../storage";
import {
	planRelationMaintenance,
	type RelationRequest,
} from "../plan-relation-maintenance";
import type { PlannedChangeOp } from "../planned-changes";
import { relationAdditionsToPatches } from "./relation-additions-to-patches";
import type { PlanMutationRejected, PlanMutationResult } from "./result";

function locatorKey<L extends SupportedLanguage>(
	value: PendingSemanticRelationLocator<L>,
) {
	return `${value.sourceReadingKey}\0${value.relation}\0${value.targetPendingId}`;
}

export function planCleanupRelations<L extends SupportedLanguage>(
	slice: CleanupRelationsSlice<L>,
	request: CleanupRelationsRequest<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	const keys = request.resolutions.map(({ locator }) => locatorKey(locator));
	if (new Set(keys).size !== keys.length)
		return {
			status: "rejected",
			code: "invalidRequest",
			message: "Duplicate cleanup resolutions are not allowed.",
		};

	const pendingByKey = new Map(
		slice.pendingRelations.map(
			(record) => [locatorKey(record.locator), record] as const,
		),
	);
	const selected = request.resolutions.flatMap(({ locator }) => {
		const record = pendingByKey.get(locatorKey(locator));
		return record ? [record] : [];
	});
	const relationRequests: RelationRequest<L>[] = selected.map((record) => ({
		sourceReading: record.sourceReading,
		relation: record.pending.relation,
		target: {
			kind: "shadow",
			shadow: record.pending.target,
			pendingRecord: record,
		},
	}));
	const relationPlan = planRelationMaintenance({
		lemmas: slice.relationLemmas,
		readings: slice.relationReadings,
		requests: relationRequests,
	});
	if (relationPlan.status === "rejected") return relationPlan;

	const resolvedKeys = new Set(
		relationPlan.resolvedPending.map((record) =>
			locatorKey(record.locator),
		),
	);
	const resolved = selected.filter((record) =>
		resolvedKeys.has(locatorKey(record.locator)),
	);
	const changes: PlannedChangeOp<L>[] = [
		...relationAdditionsToPatches(relationPlan.additions, slice.revision),
		...resolved.map(
			(record): PlannedChangeOp<L> => ({
				type: "deletePendingSemanticRelation",
				record,
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "pendingRelationExists", record },
				],
			}),
		),
	];
	const affectedReadings = new Map<string, Reading<L>>();
	for (const addition of relationPlan.additions)
		affectedReadings.set(
			readingFingerprint(addition.reading),
			addition.reading,
		);

	return {
		status: "planned",
		baseRevision: slice.revision,
		changes,
		affected: {
			readings:
				affectedReadings.size > 0
					? [...affectedReadings.values()]
					: undefined,
			pendingIds:
				resolved.length > 0
					? resolved.map(({ locator }) => locator.targetPendingId)
					: undefined,
		},
		summary: {
			message:
				resolved.length === 1
					? "Resolved 1 relation."
					: `Resolved ${resolved.length} relations.`,
		},
	};
}
