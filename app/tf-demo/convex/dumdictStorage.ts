export { createConvexDumdictStorage } from "./dumdictStorage/adapter";
export {
	type DictionaryPlanResult,
	dictionaryPlanResult,
} from "./dumdictStorage/dictionaryPlan";
export {
	findDumdictStoredReadings,
	getDumdictRelationsCleanupInfo,
	getDumdictRevision,
	loadDumdictCleanupRelationsContext,
	loadDumdictReadingEntryContext,
	loadDumdictReadingForPatch,
} from "./dumdictStorage/queries";
export {
	applyTrustedReadingKnowledgeChange,
	hasDumdictLemma,
	loadDumdictReadingEntryByKey,
	loadDumdictRevision,
	loadRelationInventory,
} from "./dumdictStorage/storage";
export {
	applyDumdictPlanInTransaction,
	commitDumdictChanges,
} from "./dumdictStorage/transaction";
