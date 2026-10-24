import type * as Dumling from "dumling/types";

import type {
	CommitChangesRequest,
	CommitChangesResult,
	StoreRevision,
} from "../../../src/domain-types";
import type { SerializedDictionaryNote } from "../../../src/dto";
import type {
	CleanupRelationResolution,
	ReevaluateShadowsRequest,
} from "../../../src/public";
import type {
	CleanupRelationsSlice,
	LoadReadingEntryContextRequest,
	OccurrenceSlice,
	OccurrenceSliceRequest,
	ReadingEntryContext,
	ReevaluateShadowsSlice,
	RekeySurfacesSlice,
	RekeySurfacesSliceRequest,
} from "../../../src/storage";
import { commitChanges } from "./commit";
import {
	loadCleanupRelationsContext,
	loadOccurrenceSlice,
	loadReadingEntryContext,
	loadReevaluateShadowsContext,
	loadRekeySurfacesSlice,
	type ReadingEntryContextRead,
} from "./load-slices";
import { removeLemma } from "./remove-lemma";
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
	loadReevaluateShadowsContext(
		request: Omit<ReevaluateShadowsRequest<L>, "baseRevision">,
	): ReevaluateShadowsSlice<L>;
	loadOccurrenceSlice(request: OccurrenceSliceRequest): OccurrenceSlice<L>;
	loadRekeySurfacesSlice(
		request: RekeySurfacesSliceRequest<L>,
	): RekeySurfacesSlice<L>;
	commitChanges(request: CommitChangesRequest<L>): CommitChangesResult;
	/** Removes a Lemma as a host does outside Dumdict's plans. */
	removeLemma(lemma: Dumling.Lemma<L>): void;
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
		loadReevaluateShadowsContext: (request) =>
			loadReevaluateShadowsContext(state, request),
		loadOccurrenceSlice: (request) => loadOccurrenceSlice(state, request),
		loadRekeySurfacesSlice: (request) =>
			loadRekeySurfacesSlice(state, request),
		commitChanges: (request) => commitChanges(state, request),
		removeLemma: (lemma) => removeLemma(state, lemma),
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
