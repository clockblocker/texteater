/**
 * Convex transport functions for the action-level Dumdict storage adapter.
 *
 * This file is deliberately only a registered-function surface. Production
 * callers choose either `dumdictActionStorage.ts` or `dumdictTransaction.ts`.
 */
export {
	findDumdictStoredReadings,
	getDumdictRelationsCleanupInfo,
	getDumdictRevision,
	loadDumdictCleanupRelationsContext,
	loadDumdictReadingEntryContext,
	loadDumdictReadingForPatch,
} from "./dumdictStorage/queries";
export { commitDumdictChanges } from "./dumdictStorage/transaction";
