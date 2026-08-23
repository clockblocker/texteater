import type { Lemma, Reading, SupportedLanguage, Surface } from "dumling/types";
import type {
	DirectSemanticRelation,
	KnowledgeChange,
	LexemeUnitShadow,
	ReadingKnowledge,
	UnitShadow,
} from "dumrel/types";
import type { SurfaceId } from "./dumling.js";

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

export type PendingEntryId<L extends SupportedLanguage> = string & {
	readonly __pendingEntryIdBrand?: unique symbol;
	readonly __language?: L;
};

export type StoreRevision = string & {
	readonly __storeRevisionBrand?: unique symbol;
};

export type LemmaRecord<L extends SupportedLanguage> = {
	lemma: Lemma<L>;
};

/**
 * A stored Reading and its learner-owned content.
 *
 * @remarks Semantic Relation targets are homogeneous within this Reading's
 * Knowledge. Lemma targeting is the default; reviewed closed-class inventories
 * may opt into exact Reading targeting.
 */
export type ReadingEntry<L extends SupportedLanguage> = {
	reading: Reading<L>;
	knowledge?: ReadingKnowledge<
		string,
		Lemma<L>,
		LexemeUnitShadow,
		Reading<L>
	>;
	attestedTranslations: string[];
	attestations: string[];
	notes: string;
};

export type SurfaceEntry<L extends SupportedLanguage> = {
	id: SurfaceId<L>;
	surface: Surface<L>;
	ownerLemma: Lemma<L>;
	attestedTranslations: string[];
	attestations: string[];
	notes: string;
};

export type PendingSemanticRelationLocator<L extends SupportedLanguage> = {
	sourceReadingKey: string;
	relation: DirectSemanticRelation;
	targetPendingId: PendingEntryId<L>;
};

export type DumdictPendingSemanticRelation<L extends SupportedLanguage> = {
	relation: DirectSemanticRelation;
	target: UnitShadow<L>;
};

export type PendingSemanticRelationRecord<L extends SupportedLanguage> = {
	sourceReading: Reading<L>;
	pending: DumdictPendingSemanticRelation<L>;
	locator: PendingSemanticRelationLocator<L>;
};

export type ChangePrecondition<L extends SupportedLanguage> =
	| { kind: "revisionMatches"; revision: StoreRevision }
	| { kind: "lemmaExists"; lemma: Lemma<L> }
	| { kind: "lemmaMissing"; lemma: Lemma<L> }
	| { kind: "readingExists"; reading: Reading<L> }
	| { kind: "readingMissing"; reading: Reading<L> }
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
			reading: Reading<L>;
			value: string;
	  };

type ReadingKnowledgeChange<L extends SupportedLanguage> = {
	reading: Reading<L>;
	change: KnowledgeChange<string, Lemma<L>, LexemeUnitShadow, Reading<L>>;
};

export type ReadingPatchOp<L extends SupportedLanguage> =
	| { kind: "addAttestation"; value: string }
	| {
			kind: "applyKnowledgeChange";
			envelope: ReadingKnowledgeChange<L>;
	  };

export type PlannedChangeOp<L extends SupportedLanguage> =
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
			reading: Reading<L>;
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

type MutableCommitChangesRequest<L extends SupportedLanguage> = {
	baseRevision: StoreRevision;
	changes: PlannedChangeOp<L>[];
};

export type DumdictPlan<L extends SupportedLanguage> = DeepReadonly<
	MutableCommitChangesRequest<L>
>;

export type CommitChangesRequest<L extends SupportedLanguage> = Readonly<{
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
