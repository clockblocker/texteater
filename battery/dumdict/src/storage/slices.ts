import type {
	DumdictReadingDraft,
	LemmaRecord,
	PendingEntryRef,
	PendingEntryRelation,
	Reading,
	ReadingEntry,
	RelationNotesForDisambiguation,
	StoreRevision,
	SurfaceEntry,
} from "../dto";
import type { Lemma, SupportedLanguage } from "../dumling";
import type { CleanupRelationResolution } from "../public";

export type FindStoredReadingsStorageRequest<L extends SupportedLanguage> = {
	lemma: Lemma<L>;
};

export type StoredReadingsSlice<L extends SupportedLanguage> = {
	revision: StoreRevision;
	candidates: Array<{
		reading: ReadingEntry<L>;
		lemma: LemmaRecord<L>;
		relationNotes?: RelationNotesForDisambiguation<L>;
	}>;
};

export type LoadReadingForPatchRequest<L extends SupportedLanguage> = {
	reading: Reading<L>;
};

export type ReadingPatchSlice<L extends SupportedLanguage> = {
	revision: StoreRevision;
	reading?: ReadingEntry<L>;
};

export type LoadNewNoteContextRequest<L extends SupportedLanguage> = {
	draft: DumdictReadingDraft<L>;
};

export type NewNoteSlice<L extends SupportedLanguage> = {
	revision: StoreRevision;
	existingLemma?: LemmaRecord<L>;
	existingReading?: ReadingEntry<L>;
	existingOwnedSurfaces: SurfaceEntry<L>[];
	explicitExistingReadingTargets: ReadingEntry<L>[];
	explicitExistingLemmaTargets: LemmaRecord<L>[];
	existingPendingRefsForProposedPendingTargets: PendingEntryRef<L>[];
	matchingPendingRefsForNewEntry: PendingEntryRef<L>[];
	incomingPendingRelationsForNewEntry: PendingEntryRelation<L>[];
	incomingPendingSourceReadings: ReadingEntry<L>[];
	incomingPendingSourceLemmas: LemmaRecord<L>[];
};

export type GetInfoForRelationsCleanupStorageRequest<
	_L extends SupportedLanguage,
> = {
	canonicalForm: string;
};

export type RelationsCleanupInfoSlice<L extends SupportedLanguage> = {
	revision: StoreRevision;
	canonicalForm: string;
	candidateLemmas: LemmaRecord<L>[];
	pendingRefs: PendingEntryRef<L>[];
	pendingRelations: PendingEntryRelation<L>[];
};

export type LoadCleanupRelationsContextRequest<L extends SupportedLanguage> = {
	resolutions: CleanupRelationResolution<L>[];
};

export type CleanupRelationsSlice<L extends SupportedLanguage> = {
	revision: StoreRevision;
	pendingRefs: PendingEntryRef<L>[];
	pendingRelations: PendingEntryRelation<L>[];
	targetReadings: Array<{
		reading: ReadingEntry<L>;
		lemma: LemmaRecord<L>;
	}>;
	targetLemmas: LemmaRecord<L>[];
};
