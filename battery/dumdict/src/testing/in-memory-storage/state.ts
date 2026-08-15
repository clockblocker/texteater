import { sameLemma, sameReading } from "../../core/identity";
import type {
	PendingSemanticRelationRecord,
	Reading,
	ReadingEntry,
	SerializedDictionaryNote,
	StoreRevision,
} from "../../dto";
import type { Lemma, SupportedLanguage } from "../../dumling";
import type { DumdictStoragePort } from "../../storage";

export type InMemoryTestStorage<L extends SupportedLanguage> =
	DumdictStoragePort<L> & {
		loadAll(): SerializedDictionaryNote<L>[];
	};

export type InMemoryStorageState<L extends SupportedLanguage> = {
	language: L;
	revisionNumber: number;
	storedNotes: SerializedDictionaryNote<L>[];
	currentRevision(): StoreRevision;
	findStoredBundleByLemma(
		lemma: Lemma<L>,
	): SerializedDictionaryNote<L> | undefined;
	findStoredReading(reading: Reading<L>): ReadingEntry<L> | undefined;
	findStoredBundleByReading(
		reading: Reading<L>,
	): SerializedDictionaryNote<L> | undefined;
	findStoredSurfaceById(
		surfaceId: string,
	): SerializedDictionaryNote<L>["ownedSurfaceEntries"][number] | undefined;
	allPendingRelations(): PendingSemanticRelationRecord<L>[];
};

export function createInMemoryStorageState<L extends SupportedLanguage>(
	language: L,
	notes: SerializedDictionaryNote<L>[] = [],
): InMemoryStorageState<L> {
	const storedNotes = structuredClone(notes) as SerializedDictionaryNote<L>[];
	const state: InMemoryStorageState<L> = {
		language,
		revisionNumber: 1,
		storedNotes,
		currentRevision: () => `mem-${state.revisionNumber}` as StoreRevision,
		findStoredBundleByLemma: (lemma) =>
			state.storedNotes.find(({ lemmaRecord }) =>
				sameLemma(lemmaRecord.lemma, lemma),
			),
		findStoredReading: (reading) =>
			state.storedNotes
				.flatMap(({ readingEntries }) => readingEntries)
				.find((entry) => sameReading(entry.reading, reading)),
		findStoredBundleByReading: (reading) =>
			state.storedNotes.find(({ readingEntries }) =>
				readingEntries.some((entry) =>
					sameReading(entry.reading, reading),
				),
			),
		findStoredSurfaceById: (surfaceId) =>
			state.storedNotes
				.flatMap(({ ownedSurfaceEntries }) => ownedSurfaceEntries)
				.find(({ id }) => id === surfaceId),
		allPendingRelations: () =>
			state.storedNotes.flatMap(
				({ pendingRelations }) => pendingRelations,
			),
	};
	return state;
}
