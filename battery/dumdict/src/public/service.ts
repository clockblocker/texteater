import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

import type * as Effect from "effect/Effect";
import type {
	DumdictReadingDraft,
	OwnedSurfaceDraft,
	PendingSemanticRelationLocator,
	ReadingEntry,
	StoreRevision,
} from "../dto";
import type {
	DumdictCommitFailure,
	DumdictInvalidInput,
	DumdictRejection,
	FindStoredReadingsResult,
	GetInfoForRelationsCleanupResult,
	MutationResult,
	PreparedMutation,
} from "./results";

export type FindStoredReadingsRequest<L extends Dumling.Language> = {
	lemma: Dumling.Lemma<L>;
};

export type AddAttestationRequest<L extends Dumling.Language> = {
	reading: Dumling.Reading<L>;
	attestation: string;
};

export type AddNewNoteRequest<L extends Dumling.Language> = {
	draft: DumdictReadingDraft<L>;
};

export type EnsureOwnedSurfaceRequest<L extends Dumling.Language> = {
	reading: Dumling.Reading<L>;
	ownedSurface: OwnedSurfaceDraft<L>;
};

export type EnsureReadingEntryRequest<L extends Dumling.Language> = {
	/**
	 * Exact ordinary entry to create or verify. Semantic Relations are excluded
	 * because their graph invariants require Dumdict's relation-aware workflows.
	 */
	entry: ReadingEntry<L>;
};

export type ApplyGeneratedKnowledgeRequest<L extends Dumling.Language> = {
	reading: Dumling.Reading<L>;
	changes: readonly Dumrel.KnowledgeChange<Dumling.Reading<L>>[];
	pendingRelations: readonly (Omit<
		Dumrel.PendingSemanticRelation,
		"target"
	> & {
		target: Dumrel.UnitShadow & { language: L };
	})[];
};

export type GetInfoForRelationsCleanupRequest<_L extends Dumling.Language> = {
	canonicalForm: string;
};

export type CleanupRelationResolution<L extends Dumling.Language> = {
	locator: PendingSemanticRelationLocator<L>;
};

export type CleanupRelationsRequest<L extends Dumling.Language> = {
	baseRevision: StoreRevision;
	resolutions: CleanupRelationResolution<L>[];
};

export type DumdictPreparationFailure =
	| DumdictInvalidInput
	| DumdictRejection
	| import("./results").DumdictStorageFailure
	| import("./results").DumdictRevisionConflict
	| import("./results").DumdictSemanticPreconditionFailure;

/**
 * Language-bound dictionary workflows over a host-provided storage port.
 *
 * @remarks Mutations validate an operation-shaped storage slice, plan direct
 * changes with preconditions, and commit the complete plan atomically through
 * the configured storage port. `prepare` exposes the immutable plan for host
 * inspection before a separate host-owned atomic commit.
 */
export type DumdictService<L extends Dumling.Language> = {
	findStoredReadings: (
		request: FindStoredReadingsRequest<L>,
	) => Effect.Effect<
		FindStoredReadingsResult<L>,
		DumdictInvalidInput | import("./results").DumdictStorageFailure
	>;

	prepare: {
		addAttestation: (
			request: AddAttestationRequest<L>,
		) => Effect.Effect<PreparedMutation<L>, DumdictPreparationFailure>;
		addNewNote: (
			request: AddNewNoteRequest<L>,
		) => Effect.Effect<PreparedMutation<L>, DumdictPreparationFailure>;
		ensureOwnedSurface: (
			request: EnsureOwnedSurfaceRequest<L>,
		) => Effect.Effect<PreparedMutation<L>, DumdictPreparationFailure>;
		ensureReadingEntry: (
			request: EnsureReadingEntryRequest<L>,
		) => Effect.Effect<PreparedMutation<L>, DumdictPreparationFailure>;
		applyGeneratedKnowledge: (
			request: ApplyGeneratedKnowledgeRequest<L>,
		) => Effect.Effect<PreparedMutation<L>, DumdictPreparationFailure>;
		cleanupRelations: (
			request: CleanupRelationsRequest<L>,
		) => Effect.Effect<PreparedMutation<L>, DumdictPreparationFailure>;
	};

	addAttestation: (
		request: AddAttestationRequest<L>,
	) => Effect.Effect<
		MutationResult<L>,
		DumdictPreparationFailure | DumdictCommitFailure
	>;
	addNewNote: (
		request: AddNewNoteRequest<L>,
	) => Effect.Effect<
		MutationResult<L>,
		DumdictPreparationFailure | DumdictCommitFailure
	>;
	ensureOwnedSurface: (
		request: EnsureOwnedSurfaceRequest<L>,
	) => Effect.Effect<
		MutationResult<L>,
		DumdictPreparationFailure | DumdictCommitFailure
	>;
	ensureReadingEntry: (
		request: EnsureReadingEntryRequest<L>,
	) => Effect.Effect<
		MutationResult<L>,
		DumdictPreparationFailure | DumdictCommitFailure
	>;
	applyGeneratedKnowledge: (
		request: ApplyGeneratedKnowledgeRequest<L>,
	) => Effect.Effect<
		MutationResult<L>,
		DumdictPreparationFailure | DumdictCommitFailure
	>;

	/** Inspects pending targets and candidate Lemmas without resolving them. */
	getInfoForRelationsCleanup: (
		request: GetInfoForRelationsCleanupRequest<L>,
	) => Effect.Effect<
		GetInfoForRelationsCleanupResult<L>,
		DumdictInvalidInput | import("./results").DumdictStorageFailure
	>;

	/**
	 * Retries exact pending locators against the current inventory. A Unit Shadow
	 * resolves only when exactly one Lemma matches; zero or multiple matches stay
	 * pending.
	 */
	cleanupRelations: (
		request: CleanupRelationsRequest<L>,
	) => Effect.Effect<
		MutationResult<L>,
		DumdictPreparationFailure | DumdictCommitFailure
	>;
};
