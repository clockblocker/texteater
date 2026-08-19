import {
	createDumdictService,
	DumdictLanguageMismatchError,
	type DumdictStoragePort,
	type Lemma,
	makeSurfaceId,
	type ReadingEntry,
	type StoreRevision,
	type SurfaceEntry,
} from "../../../src";
import { derivePendingEntryId } from "../../../src/core/pending/identity";
import { getBootedUpDumdict } from "../../../src/testing/boot";
import {
	deSerializedNotes,
	germanGehenLemma,
	germanGehenReading,
} from "../../fixtures/de-notes";
import {
	englishRunDraft,
	englishRunLemma,
	englishRunReading,
	englishSwimCitationSurface,
	englishSwimDraft,
	englishSwimLemma,
	englishSwimReading,
	englishWalkLemma,
	englishWalkReading,
	enSerializedNotes,
	enSerializedNotesWithPendingSwimRelation,
	pendingSwimEntryId,
} from "../../fixtures/en-notes";
import {
	hebrewKatavLemma,
	hebrewKatavReading,
	heSerializedNotes,
} from "../../fixtures/he-notes";

export type {
	DumdictStoragePort,
	Lemma,
	ReadingEntry,
	StoreRevision,
	SurfaceEntry,
};
export {
	createDumdictService,
	DumdictLanguageMismatchError,
	derivePendingEntryId,
	deSerializedNotes,
	englishRunDraft,
	englishRunLemma,
	englishRunReading,
	englishSwimCitationSurface,
	englishSwimDraft,
	englishSwimLemma,
	englishSwimReading,
	englishWalkLemma,
	englishWalkReading,
	enSerializedNotes,
	enSerializedNotesWithPendingSwimRelation,
	germanGehenLemma,
	germanGehenReading,
	getBootedUpDumdict,
	hebrewKatavLemma,
	hebrewKatavReading,
	heSerializedNotes,
	makeSurfaceId,
	pendingSwimEntryId,
};

export const englishWalkReadingEntry = (): ReadingEntry<"en"> => {
	const reading = enSerializedNotes[0]?.readingEntries[0];
	if (!reading) {
		throw new Error("Expected English walk fixture.");
	}
	return structuredClone(reading);
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
		async findStoredReadings() {
			throw new Error("Unexpected storage call");
		},
		async loadReadingForPatch() {
			throw new Error("Unexpected storage call");
		},
		async loadNewNoteContext() {
			loadNewNoteContextCalls += 1;
			return {
				revision: "never" as StoreRevision,
				existingOwnedSurfaces: [],
				explicitExistingLemmaTargets: [],
				existingPendingRelationsForProposedPendingTargets: [],
				pendingRelationsMatchingProposedLemma: [],
				relationLemmas: [],
				relationReadings: [],
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
