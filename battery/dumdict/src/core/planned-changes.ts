import type {
	LemmaRecord,
	PendingSemanticRelationRecord,
	Reading,
	ReadingEntry,
	ReadingKnowledgeChange,
	SurfaceEntry,
} from "../dto";
import type { SupportedLanguage } from "../dumling";
import type { ChangePrecondition } from "./preconditions";

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
