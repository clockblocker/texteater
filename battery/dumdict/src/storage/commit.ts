import type { PlannedChangeOp } from "../core/planned-changes";
import type { StoreRevision } from "../dto";
import type { SupportedLanguage } from "../dumling";

export type {
	LemmaPatchOp,
	PlannedChangeOp,
} from "../core/planned-changes";
export type { ChangePrecondition } from "../core/preconditions";

export type CommitChangesRequest<L extends SupportedLanguage> = {
	baseRevision: StoreRevision;
	changes: PlannedChangeOp<L>[];
};

export type CommitChangesResult =
	| { status: "committed"; nextRevision: StoreRevision }
	| {
			status: "conflict";
			code: CommitConflictCode;
			latestRevision?: StoreRevision;
			message?: string;
	  };

export type CommitConflictCode =
	| "revisionConflict"
	| "semanticPreconditionFailed";
