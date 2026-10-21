import type * as Dumling from "dumling/types";
import type { CleanupRelationsRequest } from "../../public";
import type { CleanupRelationsSlice } from "../../storage";
import { pendingSemanticRelationLocatorKey } from "../pending";
import type { PlanMutationRejected, PlanMutationResult } from "./result";
import { planShadowReevaluation } from "./shadow-record-changes";

export function planCleanupRelations<L extends Dumling.Language>(
	slice: CleanupRelationsSlice<L>,
	request: CleanupRelationsRequest<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	const keys = request.resolutions.map(({ locator }) =>
		pendingSemanticRelationLocatorKey(locator),
	);
	if (new Set(keys).size !== keys.length)
		return {
			status: "rejected",
			code: "invalidRequest",
			message: "Duplicate cleanup resolutions are not allowed.",
		};

	const pendingByKey = new Map(
		slice.pendingRelations.map(
			(record) =>
				[
					pendingSemanticRelationLocatorKey(record.locator),
					record,
				] as const,
		),
	);
	const selected = request.resolutions.flatMap(({ locator }) => {
		const record = pendingByKey.get(
			pendingSemanticRelationLocatorKey(locator),
		);
		return record ? [record] : [];
	});
	const reevaluation = planShadowReevaluation({
		revision: slice.revision,
		records: selected,
		lemmas: slice.relationLemmas,
		readings: slice.relationReadings,
	});
	if (reevaluation.status === "rejected") return reevaluation;
	const { resolved } = reevaluation;
	return {
		status: "planned",
		baseRevision: slice.revision,
		changes: reevaluation.changes,
		affected: {
			readings:
				reevaluation.readings.length > 0
					? reevaluation.readings
					: undefined,
			pendingIds:
				reevaluation.pendingIds.length > 0
					? reevaluation.pendingIds
					: undefined,
		},
		summary: {
			message:
				resolved === 1
					? "Resolved 1 relation."
					: `Resolved ${resolved} relations.`,
		},
	};
}
