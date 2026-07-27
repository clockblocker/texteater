import type { StoreRevision } from "../../dto";
import type { SupportedLanguage } from "../../dumling";
import type {
	AffectedDictionaryEntities,
	MutationRejectedCode,
	MutationSummary,
} from "../../public";
import type { PlannedChangeOp } from "../planned-changes";

export type PlanMutationResult<L extends SupportedLanguage> = {
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
