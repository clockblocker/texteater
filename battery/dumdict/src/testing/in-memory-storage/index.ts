import type { SupportedLanguage } from "../../dumling";
import type {
	CommitChangesRequest,
	FindStoredLemmaSensesStorageRequest,
	GetInfoForRelationsCleanupStorageRequest,
	LoadCleanupRelationsContextRequest,
	LoadLemmaForPatchRequest,
	LoadNewNoteContextRequest,
} from "../../storage";
import type { SerializedDictionaryNote } from "../serialized-note";
import { commitChanges } from "./commit";
import {
	findStoredLemmaSenses,
	getInfoForRelationsCleanup,
	loadLemmaForPatch,
	loadCleanupRelationsContext,
	loadNewNoteContext,
} from "./load-slices";
import { createInMemoryStorageState, type InMemoryTestStorage } from "./state";

export type { InMemoryTestStorage } from "./state";

export function createInMemoryTestStorage<L extends SupportedLanguage>(
	language: L,
	notes: SerializedDictionaryNote<L>[] = [],
): InMemoryTestStorage<L> {
	const state = createInMemoryStorageState(language, notes);

	return {
		async findStoredLemmaSenses(
			request: FindStoredLemmaSensesStorageRequest<L>,
		) {
			return findStoredLemmaSenses(state, request);
		},

		async getInfoForRelationsCleanup(
			request: GetInfoForRelationsCleanupStorageRequest<L>,
		) {
			return getInfoForRelationsCleanup(state, request);
		},

		async loadLemmaForPatch(request: LoadLemmaForPatchRequest<L>) {
			return loadLemmaForPatch(state, request);
		},

		async loadNewNoteContext(request: LoadNewNoteContextRequest<L>) {
			return loadNewNoteContext(state, request);
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
			const clonedNotes = structuredClone(
				state.storedNotes,
			) as SerializedDictionaryNote<L>[];
			return clonedNotes.map((note) => ({
				...note,
				pendingRefs: state.storedPendingRefs.filter((ref) =>
					note.pendingRelations.some(
						(relation) => relation.targetPendingId === ref.pendingId,
					),
				),
			}));
		},
	};
}
