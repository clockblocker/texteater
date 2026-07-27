import type {
	PendingLemmaId,
	PendingLemmaRelation,
	StoreRevision,
} from "../dto";
import type { DumlingId, SupportedLanguage } from "../dumling";

export type ChangePrecondition<L extends SupportedLanguage> =
	| { kind: "revisionMatches"; revision: StoreRevision }
	| { kind: "lemmaExists"; lemmaId: DumlingId<"Lemma", L> }
	| { kind: "lemmaMissing"; lemmaId: DumlingId<"Lemma", L> }
	| { kind: "surfaceExists"; surfaceId: DumlingId<"Surface", L> }
	| { kind: "surfaceMissing"; surfaceId: DumlingId<"Surface", L> }
	| { kind: "pendingRefExists"; pendingId: PendingLemmaId<L> }
	| { kind: "pendingRefMissing"; pendingId: PendingLemmaId<L> }
	| { kind: "pendingRelationExists"; relation: PendingLemmaRelation<L> }
	| { kind: "pendingRelationMissing"; relation: PendingLemmaRelation<L> }
	| {
			kind: "pendingRefHasNoIncomingRelations";
			pendingId: PendingLemmaId<L>;
	  }
	| {
			kind: "lemmaAttestationMissing";
			lemmaId: DumlingId<"Lemma", L>;
			value: string;
	  };
