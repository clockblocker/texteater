import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

import type {
	PendingSemanticRelationLocator,
	ReadingEntry,
	StoreRevision,
} from "../domain-types";
import type { DumdictReadingDraft, OwnedSurfaceDraft } from "../dto";

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

export type CleanupRelationResolution<L extends Dumling.Language> = {
	locator: PendingSemanticRelationLocator<L>;
};

export type CleanupRelationsRequest<L extends Dumling.Language> = {
	baseRevision: StoreRevision;
	resolutions: CleanupRelationResolution<L>[];
};
