import type * as Dumling from "dumling/types";

import type {
	ChangePrecondition,
	PlannedChangeOp,
	ReadingPatchOp,
} from "../domain-types";
import { readingLemma } from "./identity";

/** What a Reading patch's Attestation Link op needs stored. */
function linkPreconditions<L extends Dumling.Language>(
	op: ReadingPatchOp<L>,
): ChangePrecondition<L>[] {
	if (op.kind === "addAttestationLink")
		return [{ kind: "attestationMissing", ref: op.link.ref }];
	if (op.kind === "removeAttestationLink")
		return [{ kind: "attestationLinkExists", link: op.link }];
	return [];
}

/**
 * The stored state a planned change needs, whether or not its planner states
 * it: a created record is absent and its owner present, a patched or
 * deleted record is present, an added Attestation Link's ref is held by no
 * Reading in the Dictionary Scope, and a removed link is stored. A store checks these beside the change's own
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
				...change.entry.attestationLinks.map(
					({ ref }): ChangePrecondition<L> => ({
						kind: "attestationMissing",
						ref,
					}),
				),
			];
		case "createOwnedSurface":
			return [
				{ kind: "lemmaExists", lemma: change.entry.ownerLemma },
				{ kind: "surfaceMissing", surfaceId: change.entry.id },
			];
		case "patchReading":
			return [
				{ kind: "readingExists", reading: change.reading },
				...change.ops.flatMap(linkPreconditions),
			];
		case "deleteReading":
			return [{ kind: "readingExists", reading: change.reading }];
		case "deleteOwnedSurface":
			return [{ kind: "surfaceExists", surfaceId: change.surfaceId }];
		case "setLemmaParadigm":
		case "deleteLemma":
			return [{ kind: "lemmaExists", lemma: change.lemma }];
		case "createPendingSemanticRelation":
			return [
				{ kind: "readingExists", reading: change.record.sourceReading },
				{ kind: "pendingRelationMissing", record: change.record },
			];
		case "deletePendingSemanticRelation":
			return [{ kind: "pendingRelationExists", record: change.record }];
	}
}
