import type { SupportedLanguage } from "../../dumling";
import type {
	CleanupRelationsSlice,
	LemmaPatchSlice,
	NewNoteSlice,
} from "../../storage";
import type { DictionaryIntent } from "../intents";
import { planAddNewNote } from "./add-new-note";
import { planCleanupRelations } from "./cleanup-relations";
import { planAppendLemmaAttestation } from "./append-lemma-attestation";
import type { PlanMutationRejected, PlanMutationResult } from "./result";

export { planAddNewNote } from "./add-new-note";
export { planCleanupRelations } from "./cleanup-relations";
export { planAppendLemmaAttestation } from "./append-lemma-attestation";
export type {
	AddNewNoteIntent,
	AppendLemmaAttestationIntent,
	CleanupRelationsIntent,
	PlanMutationRejected,
	PlanMutationResult,
} from "./result";

export function planMutation<L extends SupportedLanguage>(
	slice: LemmaPatchSlice<L> | NewNoteSlice<L> | CleanupRelationsSlice<L>,
	intent: DictionaryIntent<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	if (intent.type === "appendLemmaAttestation") {
		return planAppendLemmaAttestation(slice as LemmaPatchSlice<L>, intent);
	}

	if (intent.type === "cleanupRelations") {
		return planCleanupRelations(slice as CleanupRelationsSlice<L>, intent);
	}

	return planAddNewNote(slice as NewNoteSlice<L>, intent);
}
