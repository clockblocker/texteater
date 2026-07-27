import type { PendingLemmaRelation } from "../../dto";
import type { SupportedLanguage } from "../../dumling";
import type { ChangePrecondition } from "../../storage";
import type { SerializedDictionaryNote } from "../serialized-note";

export type DraftStorageState<L extends SupportedLanguage> = {
	currentRevision(): string;
	draftNotes: SerializedDictionaryNote<L>[];
	draftPendingRefs: SerializedDictionaryNote<L>["pendingRefs"];
};

export function findDraftNoteByLemmaId<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
	lemmaId: string,
) {
	return draft.draftNotes.find(({ lemmaEntry }) => lemmaEntry.id === lemmaId);
}

export function findDraftSurfaceById<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
	surfaceId: string,
) {
	return draft.draftNotes
		.flatMap(({ ownedSurfaceEntries }) => ownedSurfaceEntries)
		.find(({ id }) => id === surfaceId);
}

export function draftPendingRelations<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
) {
	return draft.draftNotes.flatMap(({ pendingRelations }) => pendingRelations);
}

export function findDraftPendingRefById<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
	pendingId: string,
) {
	return draft.draftPendingRefs?.find(({ pendingId: id }) => id === pendingId);
}

export function hasDraftPendingRelation<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
	relation: PendingLemmaRelation<L>,
) {
	return draftPendingRelations(draft).some(
		(storedRelation) =>
			storedRelation.sourceLemmaId === relation.sourceLemmaId &&
			storedRelation.relationFamily === relation.relationFamily &&
			storedRelation.relation === relation.relation &&
			storedRelation.targetPendingId === relation.targetPendingId,
	);
}

export function draftPreconditionFails<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
	precondition: ChangePrecondition<L>,
) {
	switch (precondition.kind) {
		case "revisionMatches":
			return precondition.revision !== draft.currentRevision();
		case "lemmaExists":
			return !findDraftNoteByLemmaId(draft, precondition.lemmaId);
		case "lemmaMissing":
			return Boolean(findDraftNoteByLemmaId(draft, precondition.lemmaId));
		case "surfaceExists":
			return !findDraftSurfaceById(draft, precondition.surfaceId);
		case "surfaceMissing":
			return Boolean(findDraftSurfaceById(draft, precondition.surfaceId));
		case "pendingRefExists":
			return !findDraftPendingRefById(draft, precondition.pendingId);
		case "pendingRefMissing":
			return Boolean(findDraftPendingRefById(draft, precondition.pendingId));
		case "pendingRelationExists":
			return !hasDraftPendingRelation(draft, precondition.relation);
		case "pendingRelationMissing":
			return hasDraftPendingRelation(draft, precondition.relation);
		case "pendingRefHasNoIncomingRelations":
			return draftPendingRelations(draft).some(
				(relation) => relation.targetPendingId === precondition.pendingId,
			);
		case "lemmaAttestationMissing":
			return Boolean(
				findDraftNoteByLemmaId(
					draft,
					precondition.lemmaId,
				)?.lemmaEntry.attestations.includes(precondition.value),
			);
		default:
			return false;
	}
}
