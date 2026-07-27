import type { StoreRevision } from "../../dto";
import type { SupportedLanguage } from "../../dumling";
import type { MutationRejectedCode } from "../../public";
import type { AffectedDictionaryEntities } from "../affected";
import type { DictionaryIntent } from "../intents";
import type { PlannedChangeOp } from "../planned-changes";
import type { MutationPlanSummary } from "../summaries";

export type AppendLemmaAttestationIntent<L extends SupportedLanguage> = Extract<
	DictionaryIntent<L>,
	{ type: "appendLemmaAttestation" }
>;

export type AddNewNoteIntent<L extends SupportedLanguage> = Extract<
	DictionaryIntent<L>,
	{ type: "addNewNote" }
>;

export type CleanupRelationsIntent<L extends SupportedLanguage> = Extract<
	DictionaryIntent<L>,
	{ type: "cleanupRelations" }
>;

export type PlanMutationResult<L extends SupportedLanguage> = {
	status: "planned";
	baseRevision: StoreRevision;
	intent: DictionaryIntent<L>;
	changes: PlannedChangeOp<L>[];
	affected: AffectedDictionaryEntities<L>;
	summary: MutationPlanSummary;
};

export type PlanMutationRejected = {
	status: "rejected";
	code: MutationRejectedCode;
	message?: string;
};
