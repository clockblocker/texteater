import { derivePendingSemanticRelationLocator } from "dumdict/pending";
import {
	type CleanupRelationsSlice,
	type DumdictStoragePort,
	makeSurfaceId,
	type ReadingEntryContext,
	type ReadingPatchSlice,
	type RelationsCleanupInfoSlice,
	type StoredReadingsSlice,
} from "dumdict/runtime";
import * as Effect from "effect/Effect";

import { lemmaIdentityKey } from "../../server/linguisticIdentity";
import { readingIdentityKey as publicReadingIdentityKey } from "../../server/linguisticOrchestration";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { pendingLocatorIndexKey } from "../model/dumdictPendingIndexes";
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
			const readingKey = publicReadingIdentityKey(request.reading);
			const args = (() => {
				switch (request.intent) {
					case "addNewNote":
						return {
							intent: request.intent,
							lemmaKey: lemmaIdentityKey(request.reading.lemma),
							proposedLemma: request.reading.lemma,
							readingKey,
							surfaceKeys: request.ownedSurfaces.map((surface) =>
								makeSurfaceId("de", surface),
							),
							explicitLemmaTargetKeys: request.relations.flatMap(
								({ target }) =>
									target.kind === "existing"
										? [lemmaIdentityKey(target.lemma)]
										: [],
							),
							pendingLocatorKeys: request.relations.flatMap(
								({ target }) =>
									target.kind === "pending"
										? [
												pendingLocatorIndexKey(
													derivePendingSemanticRelationLocator(
														request.reading,
														target.pending,
													),
												),
											]
										: [],
							),
						};
					case "applyGeneratedKnowledge":
						return {
							intent: request.intent,
							readingKey,
							pendingLocatorKeys: request.pendingRelations.map(
								(pending) =>
									pendingLocatorIndexKey(
										derivePendingSemanticRelationLocator(
											request.reading,
											pending,
										),
									),
							),
						};
					case "ensureOwnedSurface":
						return {
							intent: request.intent,
							lemmaKey: lemmaIdentityKey(request.reading.lemma),
							readingKey,
							surfaceKey: makeSurfaceId("de", request.surface),
						};
					case "ensureReadingEntry":
						return {
							intent: request.intent,
							lemmaKey: lemmaIdentityKey(request.reading.lemma),
							readingKey,
						};
				}
			})();
			return storageEffect(
				"loadReadingEntryContext",
				() =>
					ctx.runQuery(
						internal.dumdictStorage.loadDumdictReadingEntryContext,
						{ request: args },
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
