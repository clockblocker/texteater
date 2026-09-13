import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import type {
	DumdictPendingSemanticRelation,
	PendingEntryId,
	PendingSemanticRelationLocator,
	PendingSemanticRelationRecord,
} from "../../dto";
import { readingFingerprint } from "../identity";

function normalizeUnitShadow<L extends Dumling.Language>(
	target: Dumrel.UnitShadow & { language: L },
): Dumrel.UnitShadow & { language: L } {
	return {
		...target,
		canonicalForm: target.canonicalForm.trim().normalize("NFC"),
		family: target.family.trim().normalize("NFC"),
		kind: target.kind.trim().normalize("NFC"),
	} as Dumrel.UnitShadow & { language: L };
}

export function derivePendingEntryId<L extends Dumling.Language>(
	target: Dumrel.UnitShadow & { language: L },
): PendingEntryId<L> {
	const normalized = normalizeUnitShadow<L>(target);
	const description = [
		normalized.language,
		normalized.family,
		normalized.kind,
		normalized.canonicalForm,
	].map(encodeURIComponent);
	return `pending-entry:v2:${description.join(":")}` as PendingEntryId<L>;
}

export function derivePendingSemanticRelationLocator<
	L extends Dumling.Language,
>(
	sourceReading: Dumling.Reading<L>,
	pending: DumdictPendingSemanticRelation<L>,
): PendingSemanticRelationLocator<L> {
	return {
		sourceReadingKey: readingFingerprint(sourceReading),
		relation: pending.relation,
		targetPendingId: derivePendingEntryId<L>(pending.target),
	};
}

export function createPendingSemanticRelationRecord<L extends Dumling.Language>(
	sourceReading: Dumling.Reading<L>,
	pending: DumdictPendingSemanticRelation<L>,
): PendingSemanticRelationRecord<L> {
	const normalizedPending = {
		...pending,
		target: normalizeUnitShadow<L>(pending.target),
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

export function samePendingSemanticRelationLocator<L extends Dumling.Language>(
	left: PendingSemanticRelationLocator<L>,
	right: PendingSemanticRelationLocator<L>,
): boolean {
	return (
		left.sourceReadingKey === right.sourceReadingKey &&
		left.relation === right.relation &&
		left.targetPendingId === right.targetPendingId
	);
}

export function pendingSemanticRelationLocatorKey<L extends Dumling.Language>(
	locator: PendingSemanticRelationLocator<L>,
): string {
	return JSON.stringify([
		locator.sourceReadingKey,
		locator.relation,
		locator.targetPendingId,
	]);
}

export function deduplicatePendingSemanticRelationRecords<
	L extends Dumling.Language,
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
	L extends Dumling.Language,
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
