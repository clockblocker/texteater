import type {
	LemmaRecord,
	LexicalRelation,
	MorphologicalRelation,
	PendingEntryId,
	PendingEntryRef,
	PendingEntryRelation,
	Reading,
	ReadingEntry,
	SurfaceEntry,
} from "../dto";
import type { Lemma, SupportedLanguage } from "../dumling";
import type { ChangePrecondition } from "./preconditions";

export type ReadingPatchOp<L extends SupportedLanguage> =
	| { kind: "addAttestation"; value: string }
	| {
			kind: "addRelation";
			relation: LexicalRelation;
			targetReading: Reading<L>;
	  };

type LemmaPatchOp<L extends SupportedLanguage> = {
	kind: "addRelation";
	relation: MorphologicalRelation;
	targetLemma: Lemma<L>;
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
			type: "patchLemma";
			lemma: Lemma<L>;
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
			ref: PendingEntryRef<L>;
			preconditions: ChangePrecondition<L>[];
	  }
	| {
			type: "deletePendingRef";
			pendingId: PendingEntryId<L>;
			preconditions: ChangePrecondition<L>[];
	  }
	| {
			type: "createPendingRelation";
			relation: PendingEntryRelation<L>;
			preconditions: ChangePrecondition<L>[];
	  }
	| {
			type: "deletePendingRelation";
			relation: PendingEntryRelation<L>;
			preconditions: ChangePrecondition<L>[];
	  };
