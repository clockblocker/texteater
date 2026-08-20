import type { Lemma, SupportedLanguage } from "dumling/types";
import { sameLemma, sameReading } from "../../core/identity";
import type {
	PendingSemanticRelationRecord,
	Reading,
	SerializedDictionaryNote,
} from "../../dto";
import type { ChangePrecondition } from "../../storage";

export type DraftStorageState<L extends SupportedLanguage> = {
	currentRevision(): string;
	draftNotes: SerializedDictionaryNote<L>[];
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

function locatorKey<L extends SupportedLanguage>(
	record: PendingSemanticRelationRecord<L>,
) {
	const { sourceReadingKey, relation, targetPendingId } = record.locator;
	return `${sourceReadingKey}\0${relation}\0${targetPendingId}`;
}

function hasDraftPendingRelation<L extends SupportedLanguage>(
	draft: DraftStorageState<L>,
	record: PendingSemanticRelationRecord<L>,
) {
	const expected = locatorKey(record);
	return draft.draftNotes
		.flatMap(({ pendingRelations }) => pendingRelations)
		.some((stored) => locatorKey(stored) === expected);
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
		case "pendingRelationExists":
			return !hasDraftPendingRelation(draft, precondition.record);
		case "pendingRelationMissing":
			return hasDraftPendingRelation(draft, precondition.record);
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
