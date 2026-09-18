"use node";
import type {
	CleanupRelationsSlice,
	DumdictStoragePort,
	ReadingEntryContext,
	ReadingPatchSlice,
	RelationsCleanupInfoSlice,
	StoredReadingsSlice,
} from "dumdict/runtime";
import * as Effect from "effect/Effect";

import {
	lemmaIdentityKey,
	readingIdentityKey as publicReadingIdentityKey,
} from "../../server/linguisticIdentity";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { pendingLocatorIndexKey } from "../model/dumdictPendingIndexes";
import { readingEntryContextArgs } from "./contextRequest";
import { dictionaryPlanResult } from "./dictionaryPlan";

type DumdictStorageFailure = Readonly<{
	_tag: "DumdictStorageFailure";
	operation: string;
	cause: unknown;
}>;

/** Production Convex adapter for the Shared Demo Dictionary storage seam. */
export function createConvexDumdictStorage(
	ctx: ActionCtx,
): DumdictStoragePort<"de"> {
	return {
		findStoredReadings({ lemma }) {
			return storageEffect(
				"findStoredReadings",
				() =>
					ctx.runQuery(
						internal.dumdictStorage.findDumdictStoredReadings,
						{ lemmaKey: lemmaIdentityKey(lemma) },
					) as unknown as Promise<StoredReadingsSlice<"de">>,
			);
		},
		loadReadingEntryContext(request) {
			return storageEffect(
				"loadReadingEntryContext",
				() =>
					ctx.runQuery(
						internal.dumdictStorage.loadDumdictReadingEntryContext,
						{ request: readingEntryContextArgs(request) },
					) as unknown as Promise<ReadingEntryContext<"de">>,
			);
		},
		loadReadingForPatch({ reading }) {
			return storageEffect(
				"loadReadingForPatch",
				() =>
					ctx.runQuery(
						internal.dumdictStorage.loadDumdictReadingForPatch,
						{ readingKey: publicReadingIdentityKey(reading) },
					) as Promise<ReadingPatchSlice<"de">>,
			);
		},
		commitChanges({ baseRevision, changes }) {
			return storageEffect("commitChanges", () =>
				ctx.runMutation(
					internal.dumdictStorage.commitDumdictChanges,
					dictionaryPlanResult({ baseRevision, changes }),
				),
			);
		},
		getInfoForRelationsCleanup({ canonicalForm }) {
			return storageEffect(
				"getInfoForRelationsCleanup",
				() =>
					ctx.runQuery(
						internal.dumdictStorage.getDumdictRelationsCleanupInfo,
						{ canonicalForm },
					) as unknown as Promise<RelationsCleanupInfoSlice<"de">>,
			);
		},
		loadCleanupRelationsContext({ resolutions }) {
			return storageEffect(
				"loadCleanupRelationsContext",
				() =>
					ctx.runQuery(
						internal.dumdictStorage
							.loadDumdictCleanupRelationsContext,
						{
							locatorKeys: resolutions.map(({ locator }) =>
								pendingLocatorIdentityKey(locator),
							),
						},
					) as unknown as Promise<CleanupRelationsSlice<"de">>,
			);
		},
	};
}

function storageEffect<Value>(
	operation: string,
	operationEffect: () => Promise<Value>,
): Effect.Effect<Value, DumdictStorageFailure> {
	return Effect.tryPromise({
		try: operationEffect,
		catch: (cause): DumdictStorageFailure => ({
			_tag: "DumdictStorageFailure",
			operation,
			cause,
		}),
	});
}

function pendingLocatorIdentityKey(
	input: Parameters<typeof pendingLocatorIndexKey>[0],
): string {
	return pendingLocatorIndexKey(input);
}
