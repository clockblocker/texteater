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

/**
 * A dictionary record for one Lemma: its grammatical identity and its Lemma
 * Paradigm (system ADR 0048). A record without `paradigm` has no Paradigm
 * Variants and derives its forms from its language's rules alone; Dumdict
 * never writes an empty one.
 */
export type LemmaRecord<out L extends Dumling.Language> = {
	lemma: Dumling.Lemma<L>;
	paradigm?: Dumrel.LemmaParadigm;
};

/**
 * The durable record of one occurrence (system ADR 0049): the host's opaque
 * `ref`, the Surface the occurrence realized and the Reading it was judged to
 * be. A `ref` is unique in a Dictionary Scope. `surfaceId` names a Surface
 * Entry the Reading's Lemma owns, and is null only for a ref migrated from a
 * version 1 note that recorded no form.
 */
export type AttestationLink<out L extends Dumling.Language> = {
	ref: string;
	surfaceId: SurfaceId<L> | null;
	reading: Dumling.Reading<L>;
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
	/** Each occurrence judged to be this Reading, each `ref` once. */
	attestationLinks: AttestationLink<L>[];
	notes: string;
};

/**
 * A met Surface its Lemma owns. Its `notes` and `attestedTranslations` are
 * user text: a Surface that loses its last Attestation Link is forgotten
 * unless it holds some (system ADR 0049).
 */
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

/**
 * A Semantic Relation whose target is a Unit Shadow, kept for as long as the
 * relation lives (system ADR 0011).
 *
 * @remarks Without `resolvedLemma` it is pending: its Shadow matches no
 * Lemma, or several. With it, the Shadow matches exactly that Lemma and the
 * source Reading's Knowledge holds the direct claim to it. Adding or removing
 * a Lemma the Shadow matches re-evaluates the record from its Shadow alone.
 */
export type PendingSemanticRelationRecord<out L extends Dumling.Language> = {
	sourceReading: Dumling.Reading<L>;
	pending: DumdictPendingSemanticRelation<L>;
	locator: PendingSemanticRelationLocator<L>;
	resolvedLemma?: Dumling.Lemma<L>;
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
	/** No Reading in the Dictionary Scope holds a link with this ref. */
	| { kind: "attestationMissing"; ref: string }
	/** The link's Reading holds exactly this link. */
	| { kind: "attestationLinkExists"; link: AttestationLink<L> };

export type ReadingKnowledgeChange<L extends Dumling.Language> = {
	reading: Dumling.Reading<L>;
	change: Dumrel.KnowledgeChange<Dumling.Reading<L>>;
};

export type ReadingPatchOp<L extends Dumling.Language> =
	| { kind: "addAttestationLink"; link: AttestationLink<L> }
	| { kind: "removeAttestationLink"; link: AttestationLink<L> }
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
			type: "deleteReading";
			reading: Dumling.Reading<L>;
			preconditions: ChangePrecondition<L>[];
	  }
	| {
			type: "createOwnedSurface";
			entry: SurfaceEntry<L>;
			preconditions: ChangePrecondition<L>[];
	  }
	| {
			type: "deleteOwnedSurface";
			surfaceId: SurfaceId<L>;
			ownerLemma: Dumling.Lemma<L>;
			preconditions: ChangePrecondition<L>[];
	  }
	| {
			/** Replaces the Lemma's Paradigm; without `paradigm` it has none. */
			type: "setLemmaParadigm";
			lemma: Dumling.Lemma<L>;
			paradigm?: Dumrel.LemmaParadigm;
			preconditions: ChangePrecondition<L>[];
	  }
	| {
			type: "deleteLemma";
			lemma: Dumling.Lemma<L>;
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
