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

import { lemmaIdentityKey } from "../../server/linguisticIdentity";
import { readingIdentityKey as publicReadingIdentityKey } from "../../server/linguisticOrchestration";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { pendingLocatorIndexKey } from "../model/dumdictPendingIndexes";
import { dictionaryPlanResult } from "./dictionaryPlan";

/** Production Convex adapter for the Shared Demo Dictionary storage seam. */
export function createConvexDumdictStorage(
	ctx: ActionCtx,
): DumdictStoragePort<"de"> {
	return {
		async findStoredReadings({ lemma }) {
			return ctx.runQuery(
				internal.dumdictStorage.findDumdictStoredReadings,
				{ lemmaKey: lemmaIdentityKey(lemma) },
			) as unknown as Promise<StoredReadingsSlice<"de">>;
		},
		async loadReadingEntryContext(request) {
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
			return ctx.runQuery(
				internal.dumdictStorage.loadDumdictReadingEntryContext,
				{ request: args },
			) as unknown as Promise<ReadingEntryContext<"de">>;
		},
		async loadReadingForPatch({ reading }) {
			return ctx.runQuery(
				internal.dumdictStorage.loadDumdictReadingForPatch,
				{ readingKey: publicReadingIdentityKey(reading) },
			) as Promise<ReadingPatchSlice<"de">>;
		},
		async commitChanges({ baseRevision, changes }) {
			return ctx.runMutation(
				internal.dumdictStorage.commitDumdictChanges,
				dictionaryPlanResult({ baseRevision, changes }),
			);
		},
		async getInfoForRelationsCleanup({ canonicalForm }) {
			return ctx.runQuery(
				internal.dumdictStorage.getDumdictRelationsCleanupInfo,
				{ canonicalForm },
			) as unknown as Promise<RelationsCleanupInfoSlice<"de">>;
		},
		async loadCleanupRelationsContext({ resolutions }) {
			return ctx.runQuery(
				internal.dumdictStorage.loadDumdictCleanupRelationsContext,
				{
					locatorKeys: resolutions.map(({ locator }) =>
						pendingLocatorIdentityKey(locator),
					),
				},
			) as unknown as Promise<CleanupRelationsSlice<"de">>;
		},
	};
}

function pendingLocatorIdentityKey(
	input: Parameters<typeof pendingLocatorIndexKey>[0],
): string {
	return pendingLocatorIndexKey(input);
}
