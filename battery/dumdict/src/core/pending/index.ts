import { canonicalFormKey, normalizeForm, readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import type {
	DumdictPendingSemanticRelation,
	PendingEntryId,
	PendingSemanticRelationLocator,
	PendingSemanticRelationRecord,
} from "../../domain-types";

/**
 * Normalizes a checked Shadow's Canonical Form. Its Family and Kind are closed
 * names the schema already matched exactly, so they stay as they are.
 */
function normalizeUnitShadow<L extends Dumling.Language>(
	target: Dumrel.UnitShadow & { language: L },
): Dumrel.UnitShadow & { language: L } {
	return { ...target, canonicalForm: normalizeForm(target.canonicalForm) };
}

/**
 * A Pending Entry's ID names its Unit Shadow with the Canonical Form keyed as
 * Lemma identity keys it, so `LOL` and `lol`, and `um ... willen` and
 * `um … willen`, name one entry, as they name one Lemma (system ADR 0002).
 */
export function derivePendingEntryId<L extends Dumling.Language>(
	target: Dumrel.UnitShadow & { language: L },
): PendingEntryId<L> {
	const normalized = normalizeUnitShadow<L>(target);
	const description = [
		normalized.language,
		normalized.family,
		normalized.kind,
		canonicalFormKey(normalized.canonicalForm, normalized.language),
	].map(encodeURIComponent);
	// The brand is type-only, so the ID is minted here from its description.
	return `pending-entry:v2:${description.join(":")}` as PendingEntryId<L>;
}

export function derivePendingSemanticRelationLocator<
	L extends Dumling.Language,
>(
	sourceReading: Dumling.Reading<L>,
	pending: DumdictPendingSemanticRelation<L>,
): PendingSemanticRelationLocator<L> {
	return {
		sourceReadingKey: readingIdentityKey(sourceReading),
		relation: pending.relation,
		targetPendingId: derivePendingEntryId<L>(pending.target),
	};
}

export function createPendingSemanticRelationRecord<L extends Dumling.Language>(
	sourceReading: Dumling.Reading<L>,
	pending: DumdictPendingSemanticRelation<L>,
): PendingSemanticRelationRecord<L> {
	const normalizedPending: DumdictPendingSemanticRelation<L> = {
		...pending,
		target: normalizeUnitShadow<L>(pending.target),
	};
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

/**
 * The Unit Shadow that describes a Lemma: its language, Family, Kind and
 * Canonical Form. Every Shadow that matches the Lemma has its Pending Entry
 * ID.
 */
export function unitShadowOf<L extends Dumling.Language>(
	lemma: Dumling.Lemma<L>,
): Dumrel.UnitShadow & { language: L } {
	// A Lemma's route is a Shadow's route; the union can't be narrowed field
	// by field, so the four fields are copied as one Shadow.
	return {
		language: lemma.language,
		family: lemma.family,
		kind: lemma.kind,
		canonicalForm: lemma.canonicalForm,
	} as Dumrel.UnitShadow & { language: L };
}

/**
 * The Pending Entry IDs whose stored records a `reevaluateShadows` slice
 * holds: those of the request's Shadows and of its removed Lemmas.
 */
export function reevaluatedPendingEntryIds<
	L extends Dumling.Language,
>(request: {
	readonly shadows?: readonly (Dumrel.UnitShadow & { language: L })[];
	readonly removedLemmas?: readonly Dumling.Lemma<L>[];
}): PendingEntryId<L>[] {
	return [
		...new Set([
			...(request.shadows ?? []).map((shadow) =>
				derivePendingEntryId<L>(shadow),
			),
			...(request.removedLemmas ?? []).map((lemma) =>
				derivePendingEntryId<L>(unitShadowOf(lemma)),
			),
		]),
	];
}
