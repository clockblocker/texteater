import type {
	PendingSemanticRelationRecord,
	Reading,
	StoreRevision,
} from "../dto";
import type { Lemma, SupportedLanguage, SurfaceId } from "../dumling";

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
