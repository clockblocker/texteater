import type * as Dumling from "dumling/types";

import type {
	AttestationLink,
	DumdictPendingSemanticRelation,
	LemmaRecord,
	PendingSemanticRelationRecord,
	ReadingEntry,
	StoreRevision,
	SurfaceEntry,
} from "../domain-types";
import type { DumdictSemanticRelationDraft, LemmaSlice } from "../dto";
import type { SurfaceId } from "../dumling-id";

export type LoadReadingEntryContextRequest<L extends Dumling.Language> =
	| {
			intent: "addNewNote";
			reading: Dumling.Reading<L>;
			ownedSurfaces: Dumling.Surface<L>[];
			relations: DumdictSemanticRelationDraft<L>[];
			/** The refs of the draft's Attestation Links. */
			attestationRefs: string[];
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
	  }
	| {
			intent: "recordOccurrence";
			reading: Dumling.Reading<L>;
			surface: Dumling.Surface<L>;
			ref: string;
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
	/** Every stored Reading of the draft's Lemma, which its Paradigm licenses. */
	lemmaReadings: Dumling.Reading<L>[];
	/** Every stored Attestation Link whose ref is one of the draft's. */
	attestationLinksWithRefs: AttestationLink<L>[];
};

export type ApplyGeneratedKnowledgeContext<L extends Dumling.Language> = {
	intent: "applyGeneratedKnowledge";
	revision: StoreRevision;
	/** The Reading's Lemma, with its Paradigm. */
	existingLemma?: LemmaRecord<L>;
	existingReading?: ReadingEntry<L>;
	/** Every stored Reading of the Reading's Lemma, which its Paradigm licenses. */
	lemmaReadings: Dumling.Reading<L>[];
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
	/**
	 * Every stored Pending Semantic Relation whose Shadow matches the
	 * Reading's Lemma, resolved or not. Creating the Lemma re-evaluates them.
	 */
	pendingRelationsMatchingProposedLemma: PendingSemanticRelationRecord<L>[];
	/** The relation inventory those records' re-evaluation reads. */
	relationLemmas: LemmaRecord<L>[];
	relationReadings: ReadingEntry<L>[];
};

export type RecordOccurrenceContext<L extends Dumling.Language> = {
	intent: "recordOccurrence";
	revision: StoreRevision;
	existingLemma?: LemmaRecord<L>;
	existingReading?: ReadingEntry<L>;
	/** The requested Surface's stored entry, if its Lemma owns it. */
	existingOwnedSurfaces: SurfaceEntry<L>[];
	/** Every stored Attestation Link with the requested ref. */
	attestationLinksWithRefs: AttestationLink<L>[];
};

export type ReadingEntryContext<L extends Dumling.Language> =
	| AddNewNoteContext<L>
	| ApplyGeneratedKnowledgeContext<L>
	| EnsureOwnedSurfaceContext<L>
	| EnsureReadingEntryContext<L>
	| RecordOccurrenceContext<L>;

export type CleanupRelationsSlice<L extends Dumling.Language> = {
	revision: StoreRevision;
	pendingRelations: PendingSemanticRelationRecord<L>[];
	relationLemmas: LemmaRecord<L>[];
	relationReadings: ReadingEntry<L>[];
};

/**
 * The slice `reevaluateShadows` plans from: every stored Pending Semantic
 * Relation, resolved or not, whose Pending Entry ID is one the request
 * names (`reevaluatedPendingEntryIds`), and the relation inventory their
 * re-evaluation reads: their source Readings, the Lemmas their Shadows match,
 * and what those Readings claim.
 */
export type ReevaluateShadowsSlice<L extends Dumling.Language> = {
	revision: StoreRevision;
	pendingRelations: PendingSemanticRelationRecord<L>[];
	relationLemmas: LemmaRecord<L>[];
	relationReadings: ReadingEntry<L>[];
};

/** The storage read `removeOccurrence` and `reconcileAttestationLinks` plan from. */
export type OccurrenceSliceRequest = {
	refs: string[];
};

/**
 * Each stored Lemma one of whose Readings holds an Attestation Link with a
 * requested ref, once and whole (`LemmaSlice`): removing a link may remove
 * its Reading, its Surface, its Lemma and their Licences, and only the whole
 * Lemma says which.
 */
export type OccurrenceSlice<L extends Dumling.Language> = {
	revision: StoreRevision;
	lemmas: LemmaSlice<L>[];
};

/** The storage read `rekeySurfaces` plans from. */
export type RekeySurfacesSliceRequest<L extends Dumling.Language> = {
	/** Each re-keyed entry's stored id, and each id it is re-keyed to. */
	surfaceIds: SurfaceId<L>[];
};

/**
 * A stored Surface Entry's id, owner and note, without its Surface, which may
 * no longer parse after the Dumling change that re-keys it.
 */
export type StoredSurfaceNote<L extends Dumling.Language> = {
	id: SurfaceId<L>;
	ownerLemma: Dumling.Lemma<L>;
	attestedTranslations: string[];
	attestations: string[];
	notes: string;
};

export type RekeySurfacesSlice<L extends Dumling.Language> = {
	revision: StoreRevision;
	/** Each stored Surface Entry with a requested id. */
	surfaces: StoredSurfaceNote<L>[];
	/** Every stored Reading whose Attestation Links name a requested id. */
	readings: ReadingEntry<L>[];
};
