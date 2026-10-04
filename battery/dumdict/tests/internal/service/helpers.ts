import {
	makeSurfaceId,
	type ReadingEntry,
	type StoreRevision,
	type SurfaceEntry,
} from "../../../src";
import { derivePendingEntryId } from "../../../src/core/pending";
import { germanGehenLemma, germanGehenReading } from "../../fixtures/de-notes";
import {
	englishRunDraft,
	englishRunLemma,
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
	createPlannedDictionary,
	getBootedUpDumdict,
	type PlannedDictionaryStore,
	plannedOf,
} from "../../support/planned-dictionary";

export type { ReadingEntry, StoreRevision, SurfaceEntry };
export {
	createPlannedDictionary,
	derivePendingEntryId,
	englishRunDraft,
	englishRunLemma,
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
	makeSurfaceId,
	pendingSwimEntryId,
	plannedOf,
};

export const englishWalkReadingEntry = (): ReadingEntry<"en"> => {
	const reading = enSerializedNotes[0]?.readingEntries[0];
	if (!reading) {
		throw new Error("Expected English walk fixture.");
	}
	return structuredClone(reading);
};

/** A store whose every operation fails the test unless the test supplies it. */
export function stubStore<L extends import("dumling/types").Language>(
	_language: L,
	operations: Partial<PlannedDictionaryStore<L>>,
): PlannedDictionaryStore<L> {
	const unexpected = (): never => {
		throw new Error("Unexpected storage call");
	};
	return {
		loadReadingEntryContext: unexpected,
		loadCleanupRelationsContext: unexpected,
		commitChanges: unexpected,
		...operations,
	};
}

/** A Reading's Emoji Description; a Foreign Reading has none (ADR 0045). */
export function emojiOf(
	reading: import("dumling/types").Reading,
): string | undefined {
	return "emojiDescription" in reading ? reading.emojiDescription : undefined;
}

export function lemmaRelations(
	relations: import("dumrel/types").SemanticRelations | undefined,
) {
	if (relations?.targetKind === "reading")
		throw new Error("Expected Lemma target mode");
	return relations;
}
