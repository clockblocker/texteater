import { lemmaIdentityKey, readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import { directSemanticRelationValues } from "dumrel";

import type {
	PendingSemanticRelationRecord,
	ReadingEntry,
} from "../../domain-types";
import {
	createPendingSemanticRelationRecord,
	pendingSemanticRelationLocatorKey,
	unitShadowOf,
} from "../pending";
import type { PlannedRelationRemoval } from "../plan-relation-maintenance";

/**
 * A Lemma-mode claim on a removed Lemma, and the Shadow relation it becomes:
 * the record stored under its locator, or a new one from the Lemma's Shadow,
 * resolved to the removed Lemma for as long as the plan evaluates it.
 */
export type RemovedLemmaClaim<L extends Dumling.Language> = {
	claim: PlannedRelationRemoval<L>;
	record: PendingSemanticRelationRecord<L>;
};

/**
 * What a removal does to the claims the Readings it keeps hold on what it
 * removes (system ADR 0011). A Reading-mode claim on a removed Reading is
 * retracted, whether or not its Lemma stays: no Shadow names a sense. A
 * Lemma-mode claim on a removed Lemma becomes that Lemma's Shadow relation,
 * with the claim's source Reading and relation. Claims a removed Reading,
 * or a Reading of a removed Lemma, holds go with it.
 */
export function removedTargetClaims<L extends Dumling.Language>(input: {
	readonly readings: readonly ReadingEntry<L>[];
	readonly records: readonly PendingSemanticRelationRecord<L>[];
	readonly removedLemmas: readonly Dumling.Lemma<L>[];
	readonly removedReadings?: readonly Dumling.Reading<L>[];
}): {
	readingClaims: PlannedRelationRemoval<L>[];
	lemmaClaims: RemovedLemmaClaim<L>[];
} {
	const removedLemmaKeys = new Set(input.removedLemmas.map(lemmaIdentityKey));
	const removedReadingKeys = new Set(
		(input.removedReadings ?? []).map(readingIdentityKey),
	);
	const readingGone = (reading: Dumling.Reading<L>) =>
		removedReadingKeys.has(readingIdentityKey(reading)) ||
		removedLemmaKeys.has(lemmaIdentityKey(reading.lemma));
	const storedByLocator = new Map(
		input.records.map((record) => [
			pendingSemanticRelationLocatorKey(record.locator),
			record,
		]),
	);
	const readingClaims: PlannedRelationRemoval<L>[] = [];
	const lemmaClaims: RemovedLemmaClaim<L>[] = [];
	const seen = new Set<string>();
	for (const entry of input.readings) {
		const { reading } = entry;
		const readingKey = readingIdentityKey(reading);
		if (seen.has(readingKey) || readingGone(reading)) continue;
		seen.add(readingKey);
		const relations = entry.knowledge?.semanticRelations;
		if (relations?.targetKind === "reading")
			readingClaims.push(
				...(relations.synonym ?? []).filter(readingGone).map(
					(targetReading): PlannedRelationRemoval<L> => ({
						reading,
						relation: "synonym",
						targetKind: "reading",
						targetReading,
					}),
				),
			);
		else
			lemmaClaims.push(
				...claimsOnLemmas(entry, removedLemmaKeys, storedByLocator),
			);
	}
	return { readingClaims, lemmaClaims };
}

/** The entry's Lemma-mode claims on removed Lemmas, as Shadow relations. */
function claimsOnLemmas<L extends Dumling.Language>(
	{ reading, knowledge }: ReadingEntry<L>,
	removedLemmaKeys: ReadonlySet<string>,
	storedByLocator: ReadonlyMap<string, PendingSemanticRelationRecord<L>>,
): RemovedLemmaClaim<L>[] {
	const relations = knowledge?.semanticRelations;
	if (!relations || relations.targetKind === "reading") return [];
	return directSemanticRelationValues.flatMap((relation) =>
		(relations[relation] ?? [])
			.filter((lemma) => removedLemmaKeys.has(lemmaIdentityKey(lemma)))
			.map((targetLemma) => {
				const fresh = createPendingSemanticRelationRecord(reading, {
					relation,
					target: unitShadowOf(targetLemma),
				});
				const stored = storedByLocator.get(
					pendingSemanticRelationLocatorKey(fresh.locator),
				);
				return {
					claim: { reading, relation, targetLemma },
					record: {
						...(stored ?? fresh),
						resolvedLemma: targetLemma,
					},
				};
			}),
	);
}
