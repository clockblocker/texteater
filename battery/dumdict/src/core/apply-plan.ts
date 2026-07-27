import type {
	LemmaEntry,
	PendingLemmaRef,
	PendingLemmaRelation,
	SurfaceEntry,
} from "../dto";
import type { SupportedLanguage } from "../dumling";
import type { PlannedChangeOp } from "./planned-changes";

export type DictionaryPlanState<L extends SupportedLanguage> = {
	lemmas: LemmaEntry<L>[];
	ownedSurfaces: SurfaceEntry<L>[];
	pendingRefs: PendingLemmaRef<L>[];
	pendingRelations: PendingLemmaRelation<L>[];
};

export function applyPlan<L extends SupportedLanguage>(
	state: DictionaryPlanState<L>,
	changes: PlannedChangeOp<L>[],
): DictionaryPlanState<L> {
	const next: DictionaryPlanState<L> = structuredClone(state);

	for (const change of changes) {
		switch (change.type) {
			case "createLemma":
				next.lemmas.push(structuredClone(change.entry));
				break;
			case "createOwnedSurface":
				next.ownedSurfaces.push(structuredClone(change.entry));
				break;
			case "createPendingRef":
				next.pendingRefs.push(structuredClone(change.ref));
				break;
			case "deletePendingRef":
				next.pendingRefs = next.pendingRefs.filter(
					(ref) => ref.pendingId !== change.pendingId,
				);
				break;
			case "createPendingRelation":
				next.pendingRelations.push(structuredClone(change.relation));
				break;
			case "deletePendingRelation":
				next.pendingRelations = next.pendingRelations.filter(
					(relation) =>
						!(
							relation.sourceLemmaId === change.relation.sourceLemmaId &&
							relation.relationFamily === change.relation.relationFamily &&
							relation.relation === change.relation.relation &&
							relation.targetPendingId === change.relation.targetPendingId
						),
				);
				break;
			case "patchLemma": {
				const lemma = next.lemmas.find(({ id }) => id === change.lemmaId);
				if (!lemma) {
					break;
				}
				for (const op of change.ops) {
					if (op.kind === "addAttestation") {
						if (!lemma.attestations.includes(op.value)) {
							lemma.attestations.push(op.value);
						}
					}
					if (op.kind === "addRelation") {
						if (op.family === "lexical") {
							const existingTargets = lemma.lexicalRelations[op.relation] ?? [];
							if (!existingTargets.includes(op.targetLemmaId)) {
								lemma.lexicalRelations[op.relation] = [
									...existingTargets,
									op.targetLemmaId,
								];
							}
						} else {
							const existingTargets =
								lemma.morphologicalRelations[op.relation] ?? [];
							if (!existingTargets.includes(op.targetLemmaId)) {
								lemma.morphologicalRelations[op.relation] = [
									...existingTargets,
									op.targetLemmaId,
								];
							}
						}
					}
				}
				break;
			}
		}
	}

	return next;
}
