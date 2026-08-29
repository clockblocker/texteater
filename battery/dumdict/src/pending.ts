export {
	assertPendingSemanticRelationRecordIdentity,
	createPendingSemanticRelationRecord,
	deduplicatePendingSemanticRelationRecords,
	derivePendingEntryId,
	derivePendingSemanticRelationLocator,
	pendingSemanticRelationLocatorKey,
	samePendingSemanticRelationLocator,
} from "./core/pending";
export type {
	DumdictPendingSemanticRelation,
	PendingSemanticRelationLocator,
	PendingSemanticRelationRecord,
} from "./domain-types";
