import {
	lemmaKey,
	readingKey,
	sameLemma,
	sameReading,
} from "../../core/identity";
import type { PendingEntryRelation, Reading } from "../../dto";
import type { Lemma, SupportedLanguage } from "../../dumling";
import type { ChangePrecondition } from "../../storage";
import type { SerializedDictionaryNote } from "../serialized-note";

export type DraftStorageState<L extends SupportedLanguage> = {
	currentRevision(): string;
	draftNotes: SerializedDictionaryNote<L>[];
	draftPendingRefs: SerializedDictionaryNote<L>["pendingRefs"];
};

export function findDraftBundleByLemma<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
	lemma: Lemma<L>,
) {
	return draft.draftNotes.find(({ lemmaRecord }) =>
		sameLemma(lemmaRecord.lemma, lemma),
	);
}

export function findDraftBundleByReading<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
	reading: Reading<L>,
) {
	return draft.draftNotes.find(({ readingEntries }) =>
		readingEntries.some((entry) => sameReading(entry.reading, reading)),
	);
}

function findDraftSurfaceById<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
	surfaceId: string,
) {
	return draft.draftNotes
		.flatMap(({ ownedSurfaceEntries }) => ownedSurfaceEntries)
		.find(({ id }) => id === surfaceId);
}

function draftPendingRelations<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
) {
	return draft.draftNotes.flatMap(({ pendingRelations }) => pendingRelations);
}

function relationSourceKey<L extends SupportedLanguage>(
	relation: PendingEntryRelation<L>,
) {
	return relation.relationFamily === "lexical"
		? readingKey(relation.sourceReading)
		: lemmaKey(relation.sourceLemma);
}

function findDraftPendingRefById<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
	pendingId: string,
) {
	return draft.draftPendingRefs?.find(
		({ pendingId: id }) => id === pendingId,
	);
}

function hasDraftPendingRelation<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
	relation: PendingEntryRelation<L>,
) {
	return draftPendingRelations(draft).some(
		(storedRelation) =>
			relationSourceKey(storedRelation) === relationSourceKey(relation) &&
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
			return !findDraftBundleByLemma(draft, precondition.lemma);
		case "lemmaMissing":
			return Boolean(findDraftBundleByLemma(draft, precondition.lemma));
		case "readingExists":
			return !findDraftBundleByReading(draft, precondition.reading);
		case "readingMissing":
			return Boolean(
				findDraftBundleByReading(draft, precondition.reading),
			);
		case "surfaceExists":
			return !findDraftSurfaceById(draft, precondition.surfaceId);
		case "surfaceMissing":
			return Boolean(findDraftSurfaceById(draft, precondition.surfaceId));
		case "pendingRefExists":
			return !findDraftPendingRefById(draft, precondition.pendingId);
		case "pendingRefMissing":
			return Boolean(
				findDraftPendingRefById(draft, precondition.pendingId),
			);
		case "pendingRelationExists":
			return !hasDraftPendingRelation(draft, precondition.relation);
		case "pendingRelationMissing":
			return hasDraftPendingRelation(draft, precondition.relation);
		case "pendingRefHasNoIncomingRelations":
			return draftPendingRelations(draft).some(
				(relation) =>
					relation.targetPendingId === precondition.pendingId,
			);
		case "readingAttestationMissing": {
			const bundle = findDraftBundleByReading(
				draft,
				precondition.reading,
			);
			return Boolean(
				bundle?.readingEntries
					.find((entry) =>
						sameReading(entry.reading, precondition.reading),
					)
					?.attestations.includes(precondition.value),
			);
		}
	}
}
