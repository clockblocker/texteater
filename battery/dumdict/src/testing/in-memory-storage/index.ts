import type { SupportedLanguage } from "dumling-old/types";
import * as Effect from "effect/Effect";
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
		findStoredReadings: (request: FindStoredReadingsStorageRequest<L>) =>
			Effect.succeed(findStoredReadings(state, request)),

		getInfoForRelationsCleanup: (
			request: GetInfoForRelationsCleanupStorageRequest<L>,
		) => Effect.succeed(getInfoForRelationsCleanup(state, request)),

		loadReadingForPatch: (request: LoadReadingForPatchRequest<L>) =>
			Effect.succeed(loadReadingForPatch(state, request)),

		loadReadingEntryContext: (request: LoadReadingEntryContextRequest<L>) =>
			Effect.succeed(
				loadReadingEntryContext(state, request, (read) =>
					readingEntryContextReads.push(read),
				),
			),

		loadCleanupRelationsContext: (
			request: LoadCleanupRelationsContextRequest<L>,
		) => Effect.succeed(loadCleanupRelationsContext(state, request)),

		commitChanges: (request: CommitChangesRequest<L>) =>
			Effect.succeed(commitChanges(state, request)),

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
