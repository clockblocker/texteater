import { readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";

import type { PlannedChangeOp, StoreRevision } from "../../domain-types";
import { relationRemovalsToPatches } from "./relation-removals-to-patches";
import { removedTargetClaims } from "./removed-target-claims";
import { shadowRecordChanges } from "./shadow-record-changes";

/**
 * The writes that move the claims a removal leaves on what it removes, in
 * the plan that removes it (`removeOccurrence`). Every such claim is
 * retracted, and each Lemma-mode one leaves its Shadow relation pending:
 * the slice can't tell which Lemmas its Shadow matches, so the host's
 * `reevaluateShadows` with the removed Lemmas resolves it.
 */
export function planRemovedTargetClaims<L extends Dumling.Language>(
	revision: StoreRevision,
	input: Parameters<typeof removedTargetClaims<L>>[0],
): {
	changes: PlannedChangeOp<L>[];
	readings: Dumling.Reading<L>[];
	pendingIds: string[];
} {
	const { readingClaims, lemmaClaims } = removedTargetClaims(input);
	const claims = [...readingClaims, ...lemmaClaims.map(({ claim }) => claim)];
	const writes = shadowRecordChanges(
		lemmaClaims.map(({ record }) => {
			const { resolvedLemma: _removed, ...pending } = record;
			return { record, next: pending };
		}),
		input.records,
		revision,
	);
	const readings = new Map(
		claims.map(({ reading }) => [readingIdentityKey(reading), reading]),
	);
	return {
		changes: [
			...relationRemovalsToPatches(claims, input.readings, revision),
			...writes.deletions,
			...writes.creations,
		],
		readings: [...readings.values()],
		pendingIds: [
			...new Set(
				writes.touched.map(({ locator }) => locator.targetPendingId),
			),
		],
	};
}
