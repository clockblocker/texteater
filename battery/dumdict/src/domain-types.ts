import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

import type { SurfaceId } from "./dumling-id.js";

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type DeepReadonly<Value> = Value extends Primitive
	? Value
	: Value extends (...args: never[]) => unknown
		? Value
		: Value extends readonly unknown[]
			? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
			: Value extends object
				? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
				: Value;

export type PendingEntryId<L extends Dumling.Language> = string & {
	readonly __pendingEntryIdBrand?: unique symbol;
	readonly __language?: L;
};

export type StoreRevision = string & {
	readonly __storeRevisionBrand?: unique symbol;
};

export type LemmaRecord<out L extends Dumling.Language> = {
	lemma: Dumling.Lemma<L>;
};

/**
 * A stored Reading and its learner-owned content.
 *
 * @remarks Semantic Relation targets are homogeneous within this Reading's
 * Knowledge. Lemma targeting is the default; reviewed closed-class inventories
 * may opt into exact Reading targeting.
 */
export type ReadingEntry<out L extends Dumling.Language> = {
	reading: Dumling.Reading<L>;
	knowledge?: Dumrel.ReadingKnowledge<Dumling.Reading<L>>;
	attestedTranslations: string[];
	attestations: string[];
	notes: string;
};

export type SurfaceEntry<out L extends Dumling.Language> = {
	id: SurfaceId<L>;
	surface: Dumling.Surface<L>;
	ownerLemma: Dumling.Lemma<L>;
	attestedTranslations: string[];
	attestations: string[];
	notes: string;
};

export type PendingSemanticRelationLocator<L extends Dumling.Language> = {
	sourceReadingKey: string;
	relation: Dumrel.DirectSemanticRelation;
	targetPendingId: PendingEntryId<L>;
};

export type DumdictPendingSemanticRelation<out L extends Dumling.Language> = {
	relation: Dumrel.DirectSemanticRelation;
	target: Dumrel.UnitShadow & { language: L };
};

export type PendingSemanticRelationRecord<out L extends Dumling.Language> = {
	sourceReading: Dumling.Reading<L>;
	pending: DumdictPendingSemanticRelation<L>;
	locator: PendingSemanticRelationLocator<L>;
};

export type ChangePrecondition<L extends Dumling.Language> =
	| { kind: "revisionMatches"; revision: StoreRevision }
	| { kind: "lemmaExists"; lemma: Dumling.Lemma<L> }
	| { kind: "lemmaMissing"; lemma: Dumling.Lemma<L> }
	| { kind: "readingExists"; reading: Dumling.Reading<L> }
	| { kind: "readingMissing"; reading: Dumling.Reading<L> }
	| { kind: "surfaceExists"; surfaceId: SurfaceId<L> }
	| { kind: "surfaceMissing"; surfaceId: SurfaceId<L> }
	| {
			kind: "pendingRelationExists";
			record: PendingSemanticRelationRecord<L>;
	  }
	| {
			kind: "pendingRelationMissing";
			record: PendingSemanticRelationRecord<L>;
	  }
	| {
			kind: "readingAttestationMissing";
			reading: Dumling.Reading<L>;
			value: string;
	  };

type ReadingKnowledgeChange<L extends Dumling.Language> = {
	reading: Dumling.Reading<L>;
	change: Dumrel.KnowledgeChange<Dumling.Reading<L>>;
};

export type ReadingPatchOp<L extends Dumling.Language> =
	| { kind: "addAttestation"; value: string }
	| {
			kind: "applyKnowledgeChange";
			envelope: ReadingKnowledgeChange<L>;
	  };

export type PlannedChangeOp<L extends Dumling.Language> =
	| {
			type: "createLemma";
			record: LemmaRecord<L>;
			preconditions: ChangePrecondition<L>[];
	  }
	| {
			type: "createReading";
			entry: ReadingEntry<L>;
			preconditions: ChangePrecondition<L>[];
	  }
	| {
			type: "patchReading";
			reading: Dumling.Reading<L>;
			ops: ReadingPatchOp<L>[];
			preconditions: ChangePrecondition<L>[];
	  }
	| {
			type: "createOwnedSurface";
			entry: SurfaceEntry<L>;
			preconditions: ChangePrecondition<L>[];
	  }
	| {
			type: "createPendingSemanticRelation";
			record: PendingSemanticRelationRecord<L>;
			preconditions: ChangePrecondition<L>[];
	  }
	| {
			type: "deletePendingSemanticRelation";
			record: PendingSemanticRelationRecord<L>;
			preconditions: ChangePrecondition<L>[];
	  };

type MutableCommitChangesRequest<L extends Dumling.Language> = {
	baseRevision: StoreRevision;
	changes: PlannedChangeOp<L>[];
};

export type DumdictPlan<L extends Dumling.Language> = DeepReadonly<
	MutableCommitChangesRequest<L>
>;

export type CommitChangesRequest<L extends Dumling.Language> = Readonly<{
	baseRevision: StoreRevision;
	changes: readonly PlannedChangeOp<L>[];
}>;

export type CommitConflictCode =
	| "revisionConflict"
	| "semanticPreconditionFailed";

export type CommitChangesResult =
	| { status: "committed"; nextRevision: StoreRevision }
	| {
			status: "conflict";
			code: CommitConflictCode;
			latestRevision?: StoreRevision;
			message?: string;
	  };
