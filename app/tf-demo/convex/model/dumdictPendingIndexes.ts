import {
	assertPendingSemanticRelationRecordIdentity,
	derivePendingSemanticRelationLocator,
	type PendingSemanticRelationLocator,
	type PendingSemanticRelationRecord,
} from "dumdict/pending";
import type { SupportedLanguage } from "dumling/types";

export function pendingLocatorIndexKey(
	locator: PendingSemanticRelationLocator<SupportedLanguage>,
): string {
	return JSON.stringify([
		locator.sourceReadingKey,
		locator.relation,
		locator.targetPendingId,
	]);
}

export function pendingRecordLocatorIndexKey(
	record: PendingSemanticRelationRecord<SupportedLanguage>,
): string {
	assertPendingSemanticRelationRecordIdentity(record);
	return pendingLocatorIndexKey(
		derivePendingSemanticRelationLocator(
			record.sourceReading,
			record.pending,
		),
	);
}
