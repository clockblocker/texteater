import type * as Dumling from "dumling/types";

import type {
	DumdictPendingSemanticRelation,
	LemmaRecord,
	PendingSemanticRelationRecord,
	ReadingEntry,
	StoreRevision,
	SurfaceEntry,
} from "../domain-types";
import type { DumdictSemanticRelationDraft } from "../dto";

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
	/**
	 * Every stored Pending Semantic Relation whose Shadow matches the
	 * Reading's Lemma, resolved or not. Creating the Lemma re-evaluates them.
	 */
	pendingRelationsMatchingProposedLemma: PendingSemanticRelationRecord<L>[];
	/** The relation inventory those records' re-evaluation reads. */
	relationLemmas: LemmaRecord<L>[];
	relationReadings: ReadingEntry<L>[];
};

export type ReadingEntryContext<L extends Dumling.Language> =
	| AddNewNoteContext<L>
	| ApplyGeneratedKnowledgeContext<L>
	| EnsureOwnedSurfaceContext<L>
	| EnsureReadingEntryContext<L>;

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
