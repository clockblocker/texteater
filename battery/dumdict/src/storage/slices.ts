import type * as Dumling from "dumling/types";

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

export type FindStoredReadingsStorageRequest<L extends Dumling.Language> = {
	lemma: Dumling.Lemma<L>;
};

export type StoredReadingsSlice<L extends Dumling.Language> = {
	revision: StoreRevision;
	candidates: Array<{
		reading: ReadingEntry<L>;
		lemma: LemmaRecord<L>;
	}>;
};

export type LoadReadingForPatchRequest<L extends Dumling.Language> = {
	reading: Dumling.Reading<L>;
};

export type ReadingPatchSlice<L extends Dumling.Language> = {
	revision: StoreRevision;
	reading?: ReadingEntry<L>;
};

export type LoadReadingEntryContextRequest<L extends Dumling.Language> =
	| {
			intent: "addNewNote";
			reading: Dumling.Reading<L>;
			ownedSurfaces: Dumling.Surface<L>[];
			relations: DumdictSemanticRelationDraft<L>[];
	  }
	| {
			intent: "applyGeneratedKnowledge";
			reading: Dumling.Reading<L>;
			pendingRelations: DumdictPendingSemanticRelation<L>[];
			/** Direct Semantic Relation targets the Knowledge Changes name. */
			relationTargetLemmas: Dumling.Lemma<L>[];
			relationTargetReadings: Dumling.Reading<L>[];
	  }
	| {
			intent: "ensureOwnedSurface";
			reading: Dumling.Reading<L>;
			surface: Dumling.Surface<L>;
	  }
	| {
			intent: "ensureReadingEntry";
			reading: Dumling.Reading<L>;
	  };

export type AddNewNoteContext<L extends Dumling.Language> = {
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

export type ApplyGeneratedKnowledgeContext<L extends Dumling.Language> = {
	intent: "applyGeneratedKnowledge";
	revision: StoreRevision;
	existingReading?: ReadingEntry<L>;
	exactPendingRelations: PendingSemanticRelationRecord<L>[];
	relationLemmas: LemmaRecord<L>[];
	relationReadings: ReadingEntry<L>[];
};

export type EnsureOwnedSurfaceContext<L extends Dumling.Language> = {
	intent: "ensureOwnedSurface";
	revision: StoreRevision;
	existingLemma?: LemmaRecord<L>;
	existingReading?: ReadingEntry<L>;
	existingOwnedSurfaces: SurfaceEntry<L>[];
};

export type EnsureReadingEntryContext<L extends Dumling.Language> = {
	intent: "ensureReadingEntry";
	revision: StoreRevision;
	existingLemma?: LemmaRecord<L>;
	existingReading?: ReadingEntry<L>;
};

export type ReadingEntryContext<L extends Dumling.Language> =
	| AddNewNoteContext<L>
	| ApplyGeneratedKnowledgeContext<L>
	| EnsureOwnedSurfaceContext<L>
	| EnsureReadingEntryContext<L>;

export type GetInfoForRelationsCleanupStorageRequest<
	_L extends Dumling.Language,
> = {
	canonicalForm: string;
};

export type RelationsCleanupInfoSlice<L extends Dumling.Language> = {
	revision: StoreRevision;
	canonicalForm: string;
	candidateLemmas: LemmaRecord<L>[];
	pendingRelations: PendingSemanticRelationRecord<L>[];
};

export type LoadCleanupRelationsContextRequest<L extends Dumling.Language> = {
	resolutions: CleanupRelationResolution<L>[];
};

export type CleanupRelationsSlice<L extends Dumling.Language> = {
	revision: StoreRevision;
	pendingRelations: PendingSemanticRelationRecord<L>[];
	relationLemmas: LemmaRecord<L>[];
	relationReadings: ReadingEntry<L>[];
};
