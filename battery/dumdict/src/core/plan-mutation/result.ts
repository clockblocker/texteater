import type * as Dumling from "dumling/types";
import type { PlannedChangeOp } from "../../domain-types";
import type { StoreRevision } from "../../dto";
import type {
	AffectedDictionaryEntities,
	MutationRejectedCode,
	MutationSummary,
} from "../../public";

export type PlanMutationResult<L extends Dumling.Language> = {
	status: "planned";
	baseRevision: StoreRevision;
	changes: PlannedChangeOp<L>[];
	affected: AffectedDictionaryEntities<L>;
	summary: MutationSummary;
};

export type PlanMutationRejected = {
	status: "rejected";
	code: MutationRejectedCode;
	message?: string;
};
