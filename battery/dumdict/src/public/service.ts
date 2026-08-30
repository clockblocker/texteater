import type { Lemma, SupportedLanguage } from "dumling/types";
import type {
	KnowledgeChange,
	PendingSemanticRelation,
	UnitShadow,
} from "dumrel/types";
import type {
	DumdictReadingDraft,
	OwnedSurfaceDraft,
	PendingSemanticRelationLocator,
	Reading,
	ReadingEntry,
	StoreRevision,
} from "../dto";
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

export type EnsureReadingEntryRequest<L extends SupportedLanguage> = {
	/**
	 * Exact ordinary entry to create or verify. Semantic Relations are excluded
	 * because their graph invariants require Dumdict's relation-aware workflows.
	 */
	entry: ReadingEntry<L>;
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

/**
 * Language-bound dictionary workflows over a host-provided storage port.
 *
 * @remarks Mutations validate an operation-shaped storage slice, plan direct
 * changes with preconditions, and apply the complete plan atomically. Passing
 * `applyPlan` lets a host compose that plan with its own transaction.
 */
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

	ensureReadingEntry(
		request: EnsureReadingEntryRequest<L>,
		options?: DumdictMutationOptions<L>,
	): Promise<MutationResult<L>>;

	applyGeneratedKnowledge(
		request: ApplyGeneratedKnowledgeRequest<L>,
		options?: DumdictMutationOptions<L>,
	): Promise<MutationResult<L>>;

	/** Inspects pending targets and candidate Lemmas without resolving them. */
	getInfoForRelationsCleanup(
		request: GetInfoForRelationsCleanupRequest<L>,
	): Promise<GetInfoForRelationsCleanupResult<L>>;

	/**
	 * Retries exact pending locators against the current inventory. A Unit Shadow
	 * resolves only when exactly one Lemma matches; zero or multiple matches stay
	 * pending.
	 */
	cleanupRelations(
		request: CleanupRelationsRequest<L>,
		options?: DumdictMutationOptions<L>,
	): Promise<MutationResult<L>>;
};
