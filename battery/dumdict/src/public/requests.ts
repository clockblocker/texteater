import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

import type {
	AttestationLink,
	PendingSemanticRelationLocator,
	ReadingEntry,
	StoreRevision,
} from "../domain-types";
import type { DumdictReadingDraft, OwnedSurfaceDraft } from "../dto";
import type { SurfaceId } from "../dumling-id";

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
	/**
	 * Paradigm Changes for the Reading's Lemma, applied after the Knowledge
	 * Changes with every Reading of the Lemma (system ADR 0048).
	 */
	paradigmChanges?: readonly Dumrel.ParadigmChange[];
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

/**
 * Re-evaluates stored Shadows after the Lemmas they may match changed
 * outside a Dumdict workflow that already re-evaluates them (system ADR 0011).
 *
 * @remarks `removedLemmas` names Lemmas the host removes in the commit that
 * applies this plan, or has already removed: they are never candidates, and
 * the plan moves the claims stored Readings still hold on them. Every stored
 * record matching one of them is re-evaluated.
 */
export type ReevaluateShadowsRequest<L extends Dumling.Language> = {
	baseRevision: StoreRevision;
	removedLemmas?: readonly Dumling.Lemma<L>[];
};

/**
 * Records one occurrence (system ADR 0049): ensures the Lemma owns `surface`
 * and appends `link` to its Reading. `link.surfaceId` is `surface`'s id.
 */
export type RecordOccurrenceRequest<L extends Dumling.Language> = {
	link: AttestationLink<L>;
	surface: Dumling.Surface<L>;
};

/** What `removeOccurrence` does with a Reading it unlinks (system ADR 0043). */
export type EmptyReadingPolicy = "Remove" | "Keep";

/**
 * Removes one occurrence: every Attestation Link with `ref`, and what that
 * leaves behind (system ADR 0043, ADR 0049).
 */
export type RemoveOccurrenceRequest = {
	ref: string;
	/** Defaults to `"Remove"`; a kept Reading goes with `removeReading`. */
	emptyReading?: EmptyReadingPolicy;
};

/** Removes a Reading and its links as `removeOccurrence` would (ADR 0043). */
export type RemoveReadingRequest<L extends Dumling.Language> = {
	reading: Dumling.Reading<L>;
};

/**
 * Merges the links a store holds for each ref as a set: one link per ref
 * stays, and the others are removed as `removeOccurrence` removes them.
 */
export type ReconcileAttestationLinksRequest = {
	refs: readonly string[];
};

/**
 * Re-keys Surface Entries after a Dumling Surface DTO change: the entry
 * stored as `from` becomes `to`'s entry, with its note, and every Attestation
 * Link naming `from` names `to`'s id.
 */
export type RekeySurfacesRequest<L extends Dumling.Language> = {
	rekeys: readonly {
		readonly from: SurfaceId<L>;
		readonly to: Dumling.Surface<L>;
	}[];
};
