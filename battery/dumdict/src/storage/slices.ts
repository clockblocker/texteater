import type { Lemma, Reading, SupportedLanguage, Surface } from "dumling/types";
import type {
	DumdictPendingSemanticRelation,
	DumdictSemanticRelationDraft,
	LemmaRecord,
	PendingSemanticRelationRecord,
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

export type LoadReadingEntryContextRequest<L extends SupportedLanguage> =
	| {
			intent: "addNewNote";
			reading: Reading<L>;
			ownedSurfaces: Surface<L>[];
			relations: DumdictSemanticRelationDraft<L>[];
	  }
	| {
			intent: "applyGeneratedKnowledge";
			reading: Reading<L>;
			pendingRelations: DumdictPendingSemanticRelation<L>[];
	  }
	| {
			intent: "ensureOwnedSurface";
			reading: Reading<L>;
			surface: Surface<L>;
	  }
	| {
			intent: "ensureReadingEntry";
			reading: Reading<L>;
	  };

export type AddNewNoteContext<L extends SupportedLanguage> = {
	intent: "addNewNote";
	revision: StoreRevision;
	existingLemma?: LemmaRecord<L>;
	existingReading?: ReadingEntry<L>;
	existingOwnedSurfaces: SurfaceEntry<L>[];
	explicitExistingLemmaTargets: LemmaRecord<L>[];
	exactPendingRelations: PendingSemanticRelationRecord<L>[];
	pendingRelationsMatchingProposedLemma: PendingSemanticRelationRecord<L>[];
	relationLemmas: LemmaRecord<L>[];
	relationReadings: ReadingEntry<L>[];
};

export type ApplyGeneratedKnowledgeContext<L extends SupportedLanguage> = {
	intent: "applyGeneratedKnowledge";
	revision: StoreRevision;
	existingReading?: ReadingEntry<L>;
	exactPendingRelations: PendingSemanticRelationRecord<L>[];
	relationLemmas: LemmaRecord<L>[];
	relationReadings: ReadingEntry<L>[];
};

export type EnsureOwnedSurfaceContext<L extends SupportedLanguage> = {
	intent: "ensureOwnedSurface";
	revision: StoreRevision;
	existingLemma?: LemmaRecord<L>;
	existingReading?: ReadingEntry<L>;
	existingOwnedSurfaces: SurfaceEntry<L>[];
};

export type EnsureReadingEntryContext<L extends SupportedLanguage> = {
	intent: "ensureReadingEntry";
	revision: StoreRevision;
	existingLemma?: LemmaRecord<L>;
	existingReading?: ReadingEntry<L>;
};

export type ReadingEntryContext<L extends SupportedLanguage> =
	| AddNewNoteContext<L>
	| ApplyGeneratedKnowledgeContext<L>
	| EnsureOwnedSurfaceContext<L>
	| EnsureReadingEntryContext<L>;

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
