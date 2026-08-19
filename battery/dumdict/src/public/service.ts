import type {
	KnowledgeChange,
	PendingSemanticRelation,
	UnitShadow,
} from "dumrel";
import type {
	DumdictReadingDraft,
	OwnedSurfaceDraft,
	PendingSemanticRelationLocator,
	Reading,
	StoreRevision,
} from "../dto";
import type { Lemma, SupportedLanguage } from "../dumling";
import type { CommitChangesResult, DumdictPlan } from "../storage/commit";
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

export type EnsureOwnedSurfaceRequest<L extends SupportedLanguage> = {
	reading: Reading<L>;
	ownedSurface: OwnedSurfaceDraft<L>;
};

export type ApplyGeneratedKnowledgeRequest<L extends SupportedLanguage> = {
	reading: Reading<L>;
	changes: readonly KnowledgeChange<string, Lemma<L>>[];
	pendingRelations: readonly (Omit<PendingSemanticRelation, "target"> & {
		target: UnitShadow<L>;
	})[];
};

export type GetInfoForRelationsCleanupRequest<_L extends SupportedLanguage> = {
	canonicalForm: string;
};

export type CleanupRelationResolution<L extends SupportedLanguage> = {
	locator: PendingSemanticRelationLocator<L>;
};

export type CleanupRelationsRequest<L extends SupportedLanguage> = {
	baseRevision: StoreRevision;
	resolutions: CleanupRelationResolution<L>[];
};

export type ApplyDumdictPlan<L extends SupportedLanguage> = (
	plan: DumdictPlan<L>,
) => Promise<CommitChangesResult>;

export type DumdictMutationOptions<L extends SupportedLanguage> = {
	/**
	 * Applies Dumdict's validated plan. Hosts may override the storage port's
	 * default commit to compose dictionary and host writes in one transaction.
	 */
	readonly applyPlan?: ApplyDumdictPlan<L>;
};

export type DumdictService<L extends SupportedLanguage> = {
	findStoredReadings(
		request: FindStoredReadingsRequest<L>,
	): Promise<FindStoredReadingsResult<L>>;

	addAttestation(
		request: AddAttestationRequest<L>,
		options?: DumdictMutationOptions<L>,
	): Promise<MutationResult<L>>;

	addNewNote(
		request: AddNewNoteRequest<L>,
		options?: DumdictMutationOptions<L>,
	): Promise<MutationResult<L>>;

	ensureOwnedSurface(
		request: EnsureOwnedSurfaceRequest<L>,
		options?: DumdictMutationOptions<L>,
	): Promise<MutationResult<L>>;

	applyGeneratedKnowledge(
		request: ApplyGeneratedKnowledgeRequest<L>,
		options?: DumdictMutationOptions<L>,
	): Promise<MutationResult<L>>;

	getInfoForRelationsCleanup(
		request: GetInfoForRelationsCleanupRequest<L>,
	): Promise<GetInfoForRelationsCleanupResult<L>>;

	cleanupRelations(
		request: CleanupRelationsRequest<L>,
		options?: DumdictMutationOptions<L>,
	): Promise<MutationResult<L>>;
};
