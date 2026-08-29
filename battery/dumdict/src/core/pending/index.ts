import { readingFingerprint } from "dumling/id";
import type { Reading, SupportedLanguage } from "dumling/types";
import type { UnitShadow } from "dumrel/types";
import type {
	DumdictPendingSemanticRelation,
	PendingEntryId,
	PendingSemanticRelationLocator,
	PendingSemanticRelationRecord,
} from "../../dto";

function normalizeUnitShadow<L extends SupportedLanguage>(
	target: UnitShadow<L>,
): UnitShadow<L> {
	return {
		...target,
		canonicalForm: target.canonicalForm.trim().normalize("NFC"),
		family: target.family.trim().normalize("NFC"),
		kind: target.kind.trim().normalize("NFC"),
	} as UnitShadow<L>;
}

export function derivePendingEntryId<L extends SupportedLanguage>(
	target: UnitShadow<L>,
): PendingEntryId<L> {
	const normalized = normalizeUnitShadow(target);
	const description = [
		normalized.language,
		normalized.family,
		normalized.kind,
		normalized.canonicalForm,
	].map(encodeURIComponent);
	return `pending-entry:v2:${description.join(":")}` as PendingEntryId<L>;
}

export function derivePendingSemanticRelationLocator<
	L extends SupportedLanguage,
>(
	sourceReading: Reading<L>,
	pending: DumdictPendingSemanticRelation<L>,
): PendingSemanticRelationLocator<L> {
	return {
		sourceReadingKey: readingFingerprint(sourceReading),
		relation: pending.relation,
		targetPendingId: derivePendingEntryId(pending.target),
	};
}

export function createPendingSemanticRelationRecord<
	L extends SupportedLanguage,
>(
	sourceReading: Reading<L>,
	pending: DumdictPendingSemanticRelation<L>,
): PendingSemanticRelationRecord<L> {
	const normalizedPending = {
		...pending,
		target: normalizeUnitShadow(pending.target),
	} as DumdictPendingSemanticRelation<L>;
	return {
		sourceReading,
		pending: normalizedPending,
		locator: derivePendingSemanticRelationLocator(
			sourceReading,
			normalizedPending,
		),
	};
}

export function samePendingSemanticRelationLocator<L extends SupportedLanguage>(
	left: PendingSemanticRelationLocator<L>,
	right: PendingSemanticRelationLocator<L>,
): boolean {
	return (
		left.sourceReadingKey === right.sourceReadingKey &&
		left.relation === right.relation &&
		left.targetPendingId === right.targetPendingId
	);
}

export function pendingSemanticRelationLocatorKey<L extends SupportedLanguage>(
	locator: PendingSemanticRelationLocator<L>,
): string {
	return JSON.stringify([
		locator.sourceReadingKey,
		locator.relation,
		locator.targetPendingId,
	]);
}

export function deduplicatePendingSemanticRelationRecords<
	L extends SupportedLanguage,
>(
	records: readonly PendingSemanticRelationRecord<L>[],
): PendingSemanticRelationRecord<L>[] {
	const seen = new Set<string>();
	return records.filter((record) => {
		const key = pendingSemanticRelationLocatorKey(record.locator);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

export function assertPendingSemanticRelationRecordIdentity<
	L extends SupportedLanguage,
>(record: PendingSemanticRelationRecord<L>): void {
	const expected = derivePendingSemanticRelationLocator(
		record.sourceReading,
		record.pending,
	);
	if (record.locator.sourceReadingKey !== expected.sourceReadingKey)
		throw new Error(
			"Pending Semantic Relation locator has the wrong source Reading key.",
		);
	if (record.locator.relation !== expected.relation)
		throw new Error(
			"Pending Semantic Relation locator has the wrong relation.",
		);
	if (record.locator.targetPendingId !== expected.targetPendingId)
		throw new Error(
			"Pending Semantic Relation locator has the wrong target Pending Entry ID.",
		);
}
