import type {
	LemmaEntry,
	LexicalRelation,
	MorphologicalRelation,
	PendingLemmaId,
	PendingLemmaRef,
	PendingLemmaRelation,
	SurfaceEntry,
} from "../dto";
import type { DumlingId, SupportedLanguage } from "../dumling";
import type { ChangePrecondition } from "./preconditions";

export type LemmaPatchOp<L extends SupportedLanguage> =
	| { kind: "addAttestation"; value: string }
	| {
			kind: "addRelation";
			family: "lexical";
			relation: LexicalRelation;
			targetLemmaId: DumlingId<"Lemma", L>;
	  }
	| {
			kind: "addRelation";
			family: "morphological";
			relation: MorphologicalRelation;
			targetLemmaId: DumlingId<"Lemma", L>;
	  };

export type PlannedChangeOp<L extends SupportedLanguage> =
	| {
			type: "createLemma";
			entry: LemmaEntry<L>;
			preconditions: ChangePrecondition<L>[];
	  }
	| {
			type: "patchLemma";
			lemmaId: DumlingId<"Lemma", L>;
			ops: LemmaPatchOp<L>[];
			preconditions: ChangePrecondition<L>[];
	  }
	| {
			type: "createOwnedSurface";
			entry: SurfaceEntry<L>;
			preconditions: ChangePrecondition<L>[];
	  }
	| {
			type: "createPendingRef";
			ref: PendingLemmaRef<L>;
			preconditions: ChangePrecondition<L>[];
	  }
	| {
			type: "deletePendingRef";
			pendingId: PendingLemmaId<L>;
			preconditions: ChangePrecondition<L>[];
	  }
	| {
			type: "createPendingRelation";
			relation: PendingLemmaRelation<L>;
			preconditions: ChangePrecondition<L>[];
	  }
	| {
			type: "deletePendingRelation";
			relation: PendingLemmaRelation<L>;
			preconditions: ChangePrecondition<L>[];
	  };
