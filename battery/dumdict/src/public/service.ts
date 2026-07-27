import type {
	DumdictEntryDraft,
	LexicalRelation,
	MorphologicalRelation,
	PendingLemmaId,
	StoreRevision,
} from "../dto";
import type {
	DumlingId,
	LemmaKindFor,
	LemmaSubKindFor,
	SupportedLanguage,
} from "../dumling";
import type {
	FindStoredLemmaSensesResult,
	GetInfoForRelationsCleanupResult,
	MutationResult,
} from "./results";

export type LemmaDescription<L extends SupportedLanguage> = {
	language: L;
	canonicalLemma: string;
	lemmaKind: LemmaKindFor<L>;
	lemmaSubKind: LemmaSubKindFor<L, LemmaKindFor<L>>;
};

export type FindStoredLemmaSensesRequest<L extends SupportedLanguage> = {
	lemmaDescription: LemmaDescription<L>;
};

export type AddAttestationRequest<L extends SupportedLanguage> = {
	lemmaId: DumlingId<"Lemma", L>;
	attestation: string;
};

export type AddNewNoteRequest<L extends SupportedLanguage> = {
	draft: DumdictEntryDraft<L>;
};

export type GetInfoForRelationsCleanupRequest<
	L extends SupportedLanguage,
> = {
	canonicalLemma: string;
};

export type CleanupRelationResolution<L extends SupportedLanguage> = {
	sourceLemmaId: DumlingId<"Lemma", L>;
	relation: LexicalRelation | MorphologicalRelation;
	targetPendingId: PendingLemmaId<L>;
	targetLemmaId?: DumlingId<"Lemma", L>;
};

export type CleanupRelationsRequest<L extends SupportedLanguage> = {
	baseRevision: StoreRevision;
	resolutions: CleanupRelationResolution<L>[];
};

export type DumdictService<L extends SupportedLanguage> = {
	findStoredLemmaSenses(
		request: FindStoredLemmaSensesRequest<L>,
	): Promise<FindStoredLemmaSensesResult<L>>;

	addAttestation(request: AddAttestationRequest<L>): Promise<MutationResult<L>>;

	addNewNote(request: AddNewNoteRequest<L>): Promise<MutationResult<L>>;

	getInfoForRelationsCleanup(
		request: GetInfoForRelationsCleanupRequest<L>,
	): Promise<GetInfoForRelationsCleanupResult<L>>;

	cleanupRelations(
		request: CleanupRelationsRequest<L>,
	): Promise<MutationResult<L>>;
};
