import {
	createDumdictService,
	DumdictLanguageMismatchError,
	type DumdictStoragePort,
	type Lemma,
	type LemmaEntry,
	makeDumlingIdFor,
	type StoreRevision,
	type SurfaceEntry,
} from "../../../src";
import { derivePendingLemmaId } from "../../../src/core/pending/identity";
import { getBootedUpDumdict } from "../../../src/testing/boot";
import {
	deSerializedNotes,
	germanGehenLemma,
	germanGehenLemmaId,
} from "../../fixtures/de-notes";
import {
	englishRunLemma,
	englishRunLemmaId,
	englishSwimLemma,
	englishSwimLemmaSurface,
	englishWalkLemma,
	englishWalkLemmaId,
	enSerializedNotes,
	enSerializedNotesWithPendingSwimRelation,
	pendingSwimLemmaId,
} from "../../fixtures/en-notes";
import {
	hebrewKatavLemmaId,
	heSerializedNotes,
} from "../../fixtures/he-notes";

export {
	createDumdictService,
	derivePendingLemmaId,
	DumdictLanguageMismatchError,
	deSerializedNotes,
	englishRunLemma,
	englishRunLemmaId,
	englishSwimLemma,
	englishSwimLemmaSurface,
	englishWalkLemma,
	englishWalkLemmaId,
	enSerializedNotes,
	enSerializedNotesWithPendingSwimRelation,
	germanGehenLemma,
	germanGehenLemmaId,
	getBootedUpDumdict,
	hebrewKatavLemmaId,
	heSerializedNotes,
	makeDumlingIdFor,
	pendingSwimLemmaId,
};
export type {
	DumdictStoragePort,
	Lemma,
	LemmaEntry,
	StoreRevision,
	SurfaceEntry,
};
export const englishWalkEntry = (): LemmaEntry<"en"> => {
	const note = enSerializedNotes[0];
	if (!note) {
		throw new Error("Expected English walk fixture.");
	}
	return note.lemmaEntry;
};

export function withUnusedCleanupStorageMethods<
	L extends import("../../../src").SupportedLanguage,
>(
	storage: Omit<
		DumdictStoragePort<L>,
		"getInfoForRelationsCleanup" | "loadCleanupRelationsContext"
	>,
): DumdictStoragePort<L> {
	return {
		...storage,
		async getInfoForRelationsCleanup() {
			throw new Error("Unexpected storage call");
		},
		async loadCleanupRelationsContext() {
			throw new Error("Unexpected storage call");
		},
	};
}

export const storageRejectingNewNoteContext = () => {
	let loadNewNoteContextCalls = 0;
	const storage = withUnusedCleanupStorageMethods({
		async findStoredLemmaSenses() {
			throw new Error("Unexpected storage call");
		},
		async loadLemmaForPatch() {
			throw new Error("Unexpected storage call");
		},
		async loadNewNoteContext() {
			loadNewNoteContextCalls += 1;
			return {
				revision: "never" as StoreRevision,
				existingOwnedSurfaces: [],
				explicitExistingRelationTargets: [],
				existingPendingRefsForProposedPendingTargets: [],
				matchingPendingRefsForNewLemma: [],
				incomingPendingRelationsForNewLemma: [],
				incomingPendingSourceLemmas: [],
			};
		},
		async commitChanges() {
			throw new Error("Unexpected storage call");
		},
	});

	return {
		storage,
		getLoadNewNoteContextCalls: () => loadNewNoteContextCalls,
	};
};
