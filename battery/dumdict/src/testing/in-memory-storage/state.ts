import { sameLemma, sameReading } from "../../core/identity";
import type {
	PendingEntryRef,
	PendingEntryRelation,
	Reading,
	ReadingEntry,
	StoreRevision,
} from "../../dto";
import type { Lemma, SupportedLanguage } from "../../dumling";
import type { DumdictStoragePort } from "../../storage";
import type { SerializedDictionaryNote } from "../serialized-note";

function dedupePendingRefs<L extends SupportedLanguage>(
	pendingRefs: PendingEntryRef<L>[],
) {
	const byId = new Map<string, PendingEntryRef<L>>();
	for (const pendingRef of pendingRefs) {
		byId.set(pendingRef.pendingId, pendingRef);
	}
	return Array.from(byId.values());
}

export type InMemoryTestStorage<L extends SupportedLanguage> =
	DumdictStoragePort<L> & {
		loadAll(): SerializedDictionaryNote<L>[];
	};

export type InMemoryStorageState<L extends SupportedLanguage> = {
	language: L;
	revisionNumber: number;
	storedNotes: SerializedDictionaryNote<L>[];
	storedPendingRefs: PendingEntryRef<L>[];
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
	allPendingRelations(): PendingEntryRelation<L>[];
	findStoredPendingRefById(pendingId: string): PendingEntryRef<L> | undefined;
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
		storedPendingRefs: dedupePendingRefs(
			storedNotes.flatMap(({ pendingRefs }) => pendingRefs ?? []),
		),
		currentRevision() {
			return `mem-${state.revisionNumber}` as StoreRevision;
		},
		findStoredBundleByLemma(lemma) {
			return state.storedNotes.find(({ lemmaRecord }) =>
				sameLemma(lemmaRecord.lemma, lemma),
			);
		},
		findStoredReading(reading) {
			return state.storedNotes
				.flatMap(({ readingEntries }) => readingEntries)
				.find((entry) => sameReading(entry.reading, reading));
		},
		findStoredBundleByReading(reading) {
			return state.storedNotes.find(({ readingEntries }) =>
				readingEntries.some((entry) =>
					sameReading(entry.reading, reading),
				),
			);
		},
		findStoredSurfaceById(surfaceId) {
			return state.storedNotes
				.flatMap(({ ownedSurfaceEntries }) => ownedSurfaceEntries)
				.find(({ id }) => id === surfaceId);
		},
		allPendingRelations() {
			return state.storedNotes.flatMap(
				({ pendingRelations }) => pendingRelations,
			);
		},
		findStoredPendingRefById(pendingId) {
			return state.storedPendingRefs.find(
				({ pendingId: id }) => id === pendingId,
			);
		},
	};

	return state;
}
