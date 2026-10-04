import type * as Dumling from "dumling/types";

import type {
	CommitChangesRequest,
	CommitChangesResult,
	StoreRevision,
} from "../../../src/domain-types";
import type { SerializedDictionaryNote } from "../../../src/dto";
import type { CleanupRelationResolution } from "../../../src/public";
import type {
	CleanupRelationsSlice,
	LoadReadingEntryContextRequest,
	ReadingEntryContext,
} from "../../../src/storage";
import { commitChanges } from "./commit";
import {
	loadCleanupRelationsContext,
	loadReadingEntryContext,
	type ReadingEntryContextRead,
} from "./load-slices";
import { createInMemoryStorageState } from "./state";

/**
 * The synchronous reference store Dumdict's tests plan against: the slice
 * reads a planner host makes, and an atomic commit of a planned change list.
 */
export type InMemoryTestStorage<L extends Dumling.Language> = {
	loadReadingEntryContext(
		request: LoadReadingEntryContextRequest<L>,
	): ReadingEntryContext<L>;
	loadCleanupRelationsContext(request: {
		resolutions: CleanupRelationResolution<L>[];
	}): CleanupRelationsSlice<L>;
	commitChanges(request: CommitChangesRequest<L>): CommitChangesResult;
	loadAll(): SerializedDictionaryNote<L>[];
	revision(): StoreRevision;
	readingEntryContextReads(): ReadingEntryContextRead[];
};

export function createInMemoryTestStorage<L extends Dumling.Language>(
	language: L,
	notes: SerializedDictionaryNote<L>[] = [],
): InMemoryTestStorage<L> {
	const state = createInMemoryStorageState(language, notes);
	const readingEntryContextReads: ReadingEntryContextRead[] = [];

	return {
		loadReadingEntryContext: (request) =>
			loadReadingEntryContext(state, request, (read) =>
				readingEntryContextReads.push(read),
			),
		loadCleanupRelationsContext: (request) =>
			loadCleanupRelationsContext(state, request),
		commitChanges: (request) => commitChanges(state, request),
		loadAll() {
			return structuredClone(
				state.storedNotes,
			) as SerializedDictionaryNote<L>[];
		},
		revision: () => state.currentRevision(),
		readingEntryContextReads() {
			return [...readingEntryContextReads];
		},
	};
}
