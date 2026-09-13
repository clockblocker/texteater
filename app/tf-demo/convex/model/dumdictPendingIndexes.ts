import {
	assertPendingSemanticRelationRecordIdentity,
	derivePendingSemanticRelationLocator,
	type PendingSemanticRelationLocator,
	type PendingSemanticRelationRecord,
} from "dumdict/pending";
import type * as Dumling from "dumling/types";

export function pendingLocatorIndexKey(
	locator: PendingSemanticRelationLocator<Dumling.Language>,
): string {
	return JSON.stringify([
		locator.sourceReadingKey,
		locator.relation,
		locator.targetPendingId,
	]);
}

export function pendingRecordLocatorIndexKey(
	record: PendingSemanticRelationRecord<Dumling.Language>,
): string {
	assertPendingSemanticRelationRecordIdentity(record);
	return pendingLocatorIndexKey(
		derivePendingSemanticRelationLocator(
			record.sourceReading,
			record.pending,
		),
	);
}
