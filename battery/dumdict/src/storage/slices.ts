import type { Lemma, SupportedLanguage } from "dumling/types";
import type {
	DumdictReadingDraft,
	LemmaRecord,
	PendingSemanticRelationRecord,
	Reading,
	ReadingEntry,
	StoreRevision,
	SurfaceEntry,
} from "../dto";
import type { CleanupRelationResolution } from "../public";

export type FindStoredReadingsStorageRequest<L extends SupportedLanguage> = {
	lemma: Lemma<L>;
};

export type StoredReadingsSlice<L extends SupportedLanguage> = {
	revision: StoreRevision;
	candidates: Array<{
		reading: ReadingEntry<L>;
		lemma: LemmaRecord<L>;
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
	explicitExistingLemmaTargets: LemmaRecord<L>[];
	existingPendingRelationsForProposedPendingTargets: PendingSemanticRelationRecord<L>[];
	pendingRelationsMatchingProposedLemma: PendingSemanticRelationRecord<L>[];
	relationLemmas: LemmaRecord<L>[];
	relationReadings: ReadingEntry<L>[];
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
	pendingRelations: PendingSemanticRelationRecord<L>[];
};

export type LoadCleanupRelationsContextRequest<L extends SupportedLanguage> = {
	resolutions: CleanupRelationResolution<L>[];
};

export type CleanupRelationsSlice<L extends SupportedLanguage> = {
	revision: StoreRevision;
	pendingRelations: PendingSemanticRelationRecord<L>[];
	relationLemmas: LemmaRecord<L>[];
	relationReadings: ReadingEntry<L>[];
};
