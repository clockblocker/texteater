import type { SupportedLanguage } from "dumling/types";
import type { SerializedDictionaryNote } from "../../dto";
import type {
	CommitChangesRequest,
	FindStoredReadingsStorageRequest,
	GetInfoForRelationsCleanupStorageRequest,
	LoadCleanupRelationsContextRequest,
	LoadReadingEntryContextRequest,
	LoadReadingForPatchRequest,
} from "../../storage";
import { commitChanges } from "./commit";
import {
	findStoredReadings,
	getInfoForRelationsCleanup,
	loadCleanupRelationsContext,
	loadReadingEntryContext,
	loadReadingForPatch,
	type ReadingEntryContextRead,
} from "./load-slices";
import { createInMemoryStorageState, type InMemoryTestStorage } from "./state";

export type { InMemoryTestStorage } from "./state";

export function createInMemoryTestStorage<L extends SupportedLanguage>(
	language: L,
	notes: SerializedDictionaryNote<L>[] = [],
): InMemoryTestStorage<L> {
	const state = createInMemoryStorageState(language, notes);
	const readingEntryContextReads: ReadingEntryContextRead[] = [];

	return {
		async findStoredReadings(request: FindStoredReadingsStorageRequest<L>) {
			return findStoredReadings(state, request);
		},

		async getInfoForRelationsCleanup(
			request: GetInfoForRelationsCleanupStorageRequest<L>,
		) {
			return getInfoForRelationsCleanup(state, request);
		},

		async loadReadingForPatch(request: LoadReadingForPatchRequest<L>) {
			return loadReadingForPatch(state, request);
		},

		async loadReadingEntryContext(
			request: LoadReadingEntryContextRequest<L>,
		) {
			return loadReadingEntryContext(state, request, (read) =>
				readingEntryContextReads.push(read),
			);
		},

		async loadCleanupRelationsContext(
			request: LoadCleanupRelationsContextRequest<L>,
		) {
			return loadCleanupRelationsContext(state, request);
		},

		async commitChanges(request: CommitChangesRequest<L>) {
			return commitChanges(state, request);
		},

		loadAll() {
			return structuredClone(
				state.storedNotes,
			) as SerializedDictionaryNote<L>[];
		},

		readingEntryContextReads() {
			return [...readingEntryContextReads];
		},
	};
}
