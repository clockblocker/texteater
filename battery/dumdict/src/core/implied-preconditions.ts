import type * as Dumling from "dumling/types";

import type { ChangePrecondition, PlannedChangeOp } from "../domain-types";
import { readingLemma } from "./identity";

/**
 * The stored state a planned change needs, whether or not its planner states
 * it: a created record is absent and its owner present, and a patched or
 * deleted record is present. A store checks these beside the change's own
 * preconditions, so a change the state cannot take is a
 * `semanticPreconditionFailed` conflict in every store rather than a
 * duplicate record in one and a failed write in another.
 */
export function impliedChangePreconditions<L extends Dumling.Language>(
	change: PlannedChangeOp<L>,
): ChangePrecondition<L>[] {
	switch (change.type) {
		case "createLemma":
			return [{ kind: "lemmaMissing", lemma: change.record.lemma }];
		case "createReading":
			return [
				{
					kind: "lemmaExists",
					lemma: readingLemma(change.entry.reading),
				},
				{ kind: "readingMissing", reading: change.entry.reading },
			];
		case "createOwnedSurface":
			return [
				{ kind: "lemmaExists", lemma: change.entry.ownerLemma },
				{ kind: "surfaceMissing", surfaceId: change.entry.id },
			];
		case "patchReading":
			return [{ kind: "readingExists", reading: change.reading }];
		case "createPendingSemanticRelation":
			return [
				{ kind: "readingExists", reading: change.record.sourceReading },
				{ kind: "pendingRelationMissing", record: change.record },
			];
		case "deletePendingSemanticRelation":
			return [{ kind: "pendingRelationExists", record: change.record }];
	}
}
