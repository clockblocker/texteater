import type {
	DumdictEntryDraft,
	LemmaEntry,
	PendingLemmaRef,
	PendingLemmaRelation,
	RelationNotesForDisambiguation,
	StoreRevision,
	SurfaceEntry,
} from "../dto";
import type { DumlingId } from "../dumling";
import type {
	CleanupRelationResolution,
	LemmaDescription,
} from "../public";
import type { SupportedLanguage } from "../dumling";

export type FindStoredLemmaSensesStorageRequest<L extends SupportedLanguage> = {
	lemmaDescription: LemmaDescription<L>;
};

export type StoredLemmaSensesSlice<L extends SupportedLanguage> = {
	revision: StoreRevision;
	candidates: Array<{
		entry: LemmaEntry<L>;
		relationNotes?: RelationNotesForDisambiguation<L>;
	}>;
};

export type LoadLemmaForPatchRequest<L extends SupportedLanguage> = {
	lemmaId: DumlingId<"Lemma", L>;
};

export type LemmaPatchSlice<L extends SupportedLanguage> = {
	revision: StoreRevision;
	lemma?: LemmaEntry<L>;
};

export type LoadNewNoteContextRequest<L extends SupportedLanguage> = {
	draft: DumdictEntryDraft<L>;
};

export type NewNoteSlice<L extends SupportedLanguage> = {
	revision: StoreRevision;
	existingLemma?: LemmaEntry<L>;
	existingOwnedSurfaces: SurfaceEntry<L>[];
	explicitExistingRelationTargets: LemmaEntry<L>[];
	existingPendingRefsForProposedPendingTargets: PendingLemmaRef<L>[];
	matchingPendingRefsForNewLemma: PendingLemmaRef<L>[];
	incomingPendingRelationsForNewLemma: PendingLemmaRelation<L>[];
	incomingPendingSourceLemmas: LemmaEntry<L>[];
};

export type GetInfoForRelationsCleanupStorageRequest<
	L extends SupportedLanguage,
> = {
	canonicalLemma: string;
};

export type RelationsCleanupInfoSlice<L extends SupportedLanguage> = {
	revision: StoreRevision;
	canonicalLemma: string;
	candidateLemmas: LemmaEntry<L>[];
	pendingRefs: PendingLemmaRef<L>[];
	pendingRelations: PendingLemmaRelation<L>[];
};

export type LoadCleanupRelationsContextRequest<
	L extends SupportedLanguage,
> = {
	resolutions: CleanupRelationResolution<L>[];
};

export type CleanupRelationsSlice<L extends SupportedLanguage> = {
	revision: StoreRevision;
	pendingRefs: PendingLemmaRef<L>[];
	pendingRelations: PendingLemmaRelation<L>[];
	targetLemmas: LemmaEntry<L>[];
};
