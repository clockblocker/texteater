import type { PlannedChangeOp } from "../../core/planned-changes";
import type { SupportedLanguage } from "../../dumling";
import type { DraftStorageState } from "./preconditions";
import { findDraftNoteByLemmaId } from "./preconditions";

export function applyChange<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
	change: PlannedChangeOp<L>,
): boolean {
	switch (change.type) {
		case "createLemma":
			draft.draftNotes.push({
				lemmaEntry: structuredClone(change.entry),
				ownedSurfaceEntries: [],
				pendingRelations: [],
			});
			return true;
		case "createOwnedSurface": {
			const storedNote = findDraftNoteByLemmaId(
				draft,
				change.entry.ownerLemmaId,
			);
			if (!storedNote) {
				return false;
			}
			storedNote.ownedSurfaceEntries.push(structuredClone(change.entry));
			return true;
		}
		case "createPendingRef":
			draft.draftPendingRefs?.push(structuredClone(change.ref));
			return true;
		case "createPendingRelation": {
			const storedNote = findDraftNoteByLemmaId(
				draft,
				change.relation.sourceLemmaId,
			);
			if (!storedNote) {
				return false;
			}
			storedNote.pendingRelations.push(structuredClone(change.relation));
			return true;
		}
		case "deletePendingRelation": {
			const storedNote = findDraftNoteByLemmaId(
				draft,
				change.relation.sourceLemmaId,
			);
			if (!storedNote) {
				return false;
			}
			storedNote.pendingRelations = storedNote.pendingRelations.filter(
				(relation) =>
					!(
						relation.sourceLemmaId === change.relation.sourceLemmaId &&
						relation.relationFamily === change.relation.relationFamily &&
						relation.relation === change.relation.relation &&
						relation.targetPendingId === change.relation.targetPendingId
					),
			);
			return true;
		}
		case "deletePendingRef": {
			const refIndex =
				draft.draftPendingRefs?.findIndex(
					({ pendingId }) => pendingId === change.pendingId,
				) ?? -1;
			if (refIndex >= 0) {
				draft.draftPendingRefs?.splice(refIndex, 1);
			}
			return true;
		}
		case "patchLemma":
			return applyLemmaPatch(draft, change);
	}
}

function applyLemmaPatch<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
	change: Extract<PlannedChangeOp<L>, { type: "patchLemma" }>,
) {
	const storedNote = findDraftNoteByLemmaId(draft, change.lemmaId);
	if (!storedNote) {
		return false;
	}

	for (const op of change.ops) {
		if (op.kind === "addAttestation") {
			storedNote.lemmaEntry.attestations.push(op.value);
		}
		if (op.kind === "addRelation") {
			if (op.family === "lexical") {
				const existingTargets =
					storedNote.lemmaEntry.lexicalRelations[op.relation] ?? [];
				if (!existingTargets.includes(op.targetLemmaId)) {
					storedNote.lemmaEntry.lexicalRelations[op.relation] = [
						...existingTargets,
						op.targetLemmaId,
					];
				}
			} else {
				const existingTargets =
					storedNote.lemmaEntry.morphologicalRelations[op.relation] ?? [];
				if (!existingTargets.includes(op.targetLemmaId)) {
					storedNote.lemmaEntry.morphologicalRelations[op.relation] = [
						...existingTargets,
						op.targetLemmaId,
					];
				}
			}
		}
	}

	return true;
}
