import { sameLemma } from "dumling";
import type * as Dumling from "dumling/types";

import type { ReevaluateShadowsRequest } from "../../public";
import type { ReevaluateShadowsSlice } from "../../storage";
import type { PlanMutationRejected, PlanMutationResult } from "./result";
import { planShadowReevaluation } from "./shadow-record-changes";

/**
 * Plans the re-evaluation of every stored Shadow the slice holds against the
 * dictionary without the request's removed Lemmas (system ADR 0011). The
 * claims the slice's Readings hold on a removed Lemma move in the same plan:
 * a Lemma-mode claim becomes the Lemma's Shadow relation, and a Reading-mode
 * claim on one of its Readings is retracted.
 */
export function planReevaluateShadows<L extends Dumling.Language>(
	slice: ReevaluateShadowsSlice<L>,
	request: ReevaluateShadowsRequest<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	const removed = request.removedLemmas ?? [];
	const reevaluation = planShadowReevaluation({
		revision: slice.revision,
		records: slice.pendingRelations,
		lemmas: slice.relationLemmas.filter(
			({ lemma }) => !removed.some((gone) => sameLemma(gone, lemma)),
		),
		readings: slice.relationReadings,
		removedLemmas: removed,
	});
	if (reevaluation.status === "rejected") return reevaluation;
	const { moved } = reevaluation;
	return {
		status: "planned",
		baseRevision: slice.revision,
		changes: reevaluation.changes,
		affected: {
			...(reevaluation.readings.length > 0
				? { readings: reevaluation.readings }
				: {}),
			...(reevaluation.pendingIds.length > 0
				? { pendingIds: reevaluation.pendingIds }
				: {}),
		},
		summary: {
			message:
				moved === 1
					? "Moved 1 Shadow relation."
					: `Moved ${moved} Shadow relations.`,
		},
	};
}
