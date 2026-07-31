import type {
	DumdictReadingDraft,
	LexicalRelation,
	MorphologicalRelation,
	PendingEntryId,
	Reading,
	StoreRevision,
} from "../dto";
import type { Lemma, SupportedLanguage } from "../dumling";
import type {
	FindStoredReadingsResult,
	GetInfoForRelationsCleanupResult,
	MutationResult,
} from "./results";

export type FindStoredReadingsRequest<L extends SupportedLanguage> = {
	lemma: Lemma<L>;
};

export type AddAttestationRequest<L extends SupportedLanguage> = {
	reading: Reading<L>;
	attestation: string;
};

export type AddNewNoteRequest<L extends SupportedLanguage> = {
	draft: DumdictReadingDraft<L>;
};

export type GetInfoForRelationsCleanupRequest<_L extends SupportedLanguage> = {
	canonicalForm: string;
};

export type CleanupRelationResolution<L extends SupportedLanguage> =
	| {
			relationFamily: "lexical";
			sourceReading: Reading<L>;
			relation: LexicalRelation;
			targetPendingId: PendingEntryId<L>;
			targetReading?: Reading<L>;
	  }
	| {
			relationFamily: "morphological";
			sourceLemma: Lemma<L>;
			relation: MorphologicalRelation;
			targetPendingId: PendingEntryId<L>;
			targetLemma?: Lemma<L>;
	  };

export type CleanupRelationsRequest<L extends SupportedLanguage> = {
	baseRevision: StoreRevision;
	resolutions: CleanupRelationResolution<L>[];
};

export type DumdictService<L extends SupportedLanguage> = {
	findStoredReadings(
		request: FindStoredReadingsRequest<L>,
	): Promise<FindStoredReadingsResult<L>>;

	addAttestation(
		request: AddAttestationRequest<L>,
	): Promise<MutationResult<L>>;

	addNewNote(request: AddNewNoteRequest<L>): Promise<MutationResult<L>>;

	getInfoForRelationsCleanup(
		request: GetInfoForRelationsCleanupRequest<L>,
	): Promise<GetInfoForRelationsCleanupResult<L>>;

	cleanupRelations(
		request: CleanupRelationsRequest<L>,
	): Promise<MutationResult<L>>;
};
