import * as Effect from "effect/Effect";
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
import { derivePendingEntryId } from "../../../src/core/pending";
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

/** Runs a typed failing Effect and returns its expected failure value. */
export async function failure<E>(
	effect: Effect.Effect<unknown, E>,
): Promise<E> {
	const result = await Effect.runPromise(Effect.either(effect));
	if (result._tag === "Left") return result.left;
	throw new Error("Expected the Effect to fail.");
}

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
		getInfoForRelationsCleanup() {
			return Effect.die("Unexpected storage call");
		},
		loadCleanupRelationsContext() {
			return Effect.die("Unexpected storage call");
		},
	};
}

export const storageRejectingReadingEntryContext = () => {
	let loadReadingEntryContextCalls = 0;
	const storage = withUnusedCleanupStorageMethods({
		findStoredReadings() {
			return Effect.die("Unexpected storage call");
		},
		loadReadingForPatch() {
			return Effect.die("Unexpected storage call");
		},
		loadReadingEntryContext() {
			loadReadingEntryContextCalls += 1;
			return Effect.die("Unexpected storage call");
		},
		commitChanges() {
			return Effect.die("Unexpected storage call");
		},
	});

	return {
		storage,
		getLoadReadingEntryContextCalls: () => loadReadingEntryContextCalls,
	};
};
