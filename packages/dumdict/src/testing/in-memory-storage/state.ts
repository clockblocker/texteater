import type {
	PendingLemmaRef,
	PendingLemmaRelation,
	StoreRevision,
} from "../../dto";
import type { SupportedLanguage } from "../../dumling";
import type { DumdictStoragePort } from "../../storage";
import type { SerializedDictionaryNote } from "../serialized-note";

function dedupePendingRefs<L extends SupportedLanguage>(
	pendingRefs: PendingLemmaRef<L>[],
) {
	const byId = new Map<string, PendingLemmaRef<L>>();
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
	storedPendingRefs: PendingLemmaRef<L>[];
	currentRevision(): StoreRevision;
	findStoredNoteByLemmaId(
		lemmaId: string,
	): SerializedDictionaryNote<L> | undefined;
	findStoredSurfaceById(
		surfaceId: string,
	): SerializedDictionaryNote<L>["ownedSurfaceEntries"][number] | undefined;
	allPendingRelations(): PendingLemmaRelation<L>[];
	findStoredPendingRefById(pendingId: string): PendingLemmaRef<L> | undefined;
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
		findStoredNoteByLemmaId(lemmaId: string) {
			return state.storedNotes.find(
				({ lemmaEntry }) => lemmaEntry.id === lemmaId,
			);
		},
		findStoredSurfaceById(surfaceId: string) {
			return state.storedNotes
				.flatMap(({ ownedSurfaceEntries }) => ownedSurfaceEntries)
				.find(({ id }) => id === surfaceId);
		},
		allPendingRelations() {
			return state.storedNotes.flatMap(
				({ pendingRelations }) => pendingRelations,
			);
		},
		findStoredPendingRefById(pendingId: string) {
			return state.storedPendingRefs.find(
				({ pendingId: id }) => id === pendingId,
			);
		},
	};

	return state;
}
