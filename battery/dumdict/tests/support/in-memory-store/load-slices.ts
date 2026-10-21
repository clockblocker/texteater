import type * as Dumling from "dumling/types";

import { readingLemma, shadowMatchesLemma } from "../../../src/core/identity";
import {
	derivePendingSemanticRelationLocator,
	pendingSemanticRelationLocatorKey,
	reevaluatedPendingEntryIds,
} from "../../../src/core/pending";
import { makeSurfaceId } from "../../../src/dumling-id";
import type {
	CleanupRelationResolution,
	ReevaluateShadowsRequest,
} from "../../../src/public";
import type {
	CleanupRelationsSlice,
	LoadReadingEntryContextRequest,
	ReadingEntryContext,
	ReevaluateShadowsSlice,
} from "../../../src/storage";
import type { InMemoryStorageState } from "./state";

export type ReadingEntryContextRead =
	| "existingLemma"
	| "existingReading"
	| "requestedOwnedSurfaces"
	| "explicitLemmaTargets"
	| "exactPendingRelations"
	| "pendingRelationsMatchingLemma"
	| "relationLemmas"
	| "relationReadings";

export function loadReadingEntryContext<L extends Dumling.Language>(
	state: InMemoryStorageState<L>,
	request: LoadReadingEntryContextRequest<L>,
	recordRead: (read: ReadingEntryContextRead) => void = () => {},
): ReadingEntryContext<L> {
	const { reading } = request;
	recordRead("existingReading");
	const existingReading = state.findStoredReading(reading);
	if (request.intent === "applyGeneratedKnowledge") {
		const proposedPendingKeys = new Set(
			request.pendingRelations.map((pending) =>
				pendingSemanticRelationLocatorKey(
					derivePendingSemanticRelationLocator(reading, pending),
				),
			),
		);
		recordRead("exactPendingRelations");
		const exactPending = state
			.allPendingRelations()
			.filter(({ locator }) =>
				proposedPendingKeys.has(
					pendingSemanticRelationLocatorKey(locator),
				),
			);
		recordRead("relationLemmas");
		const relationLemmas = state.storedNotes.map(
			({ lemmaRecord }) => lemmaRecord,
		);
		recordRead("relationReadings");
		const relationReadings = state.storedNotes.flatMap(
			({ readingEntries }) => readingEntries,
		);
		return {
			intent: request.intent,
			revision: state.currentRevision(),
			...(existingReading ? { existingReading } : {}),
			exactPendingRelations: exactPending,
			relationLemmas,
			relationReadings,
		};
	}

	recordRead("existingLemma");
	const existingBundle = state.findStoredBundleByLemma(readingLemma(reading));
	const matchingPending = () => {
		recordRead("pendingRelationsMatchingLemma");
		return state
			.allPendingRelations()
			.filter((record) =>
				shadowMatchesLemma(
					record.pending.target,
					readingLemma(reading),
				),
			);
	};
	if (request.intent === "ensureReadingEntry")
		return {
			intent: request.intent,
			revision: state.currentRevision(),
			...(existingBundle
				? { existingLemma: existingBundle.lemmaRecord }
				: {}),
			...(existingReading ? { existingReading } : {}),
			pendingRelationsMatchingProposedLemma: matchingPending(),
			...relationInventory(state, recordRead),
		};

	if (request.intent === "ensureOwnedSurface") {
		recordRead("requestedOwnedSurfaces");
		const existingSurface = state.findStoredSurfaceById(
			makeSurfaceId(state.language, request.surface),
		);
		return {
			intent: request.intent,
			revision: state.currentRevision(),
			...(existingBundle
				? { existingLemma: existingBundle.lemmaRecord }
				: {}),
			...(existingReading ? { existingReading } : {}),
			existingOwnedSurfaces: existingSurface ? [existingSurface] : [],
		};
	}

	const draftSurfaceIds = request.ownedSurfaces.map((surface) =>
		makeSurfaceId(state.language, surface),
	);
	const explicitLemmas = request.relations.flatMap((relation) =>
		relation.target.kind === "existing" ? [relation.target.lemma] : [],
	);
	const proposedPendingKeys = new Set(
		request.relations.flatMap((relation) => {
			if (relation.target.kind !== "pending") return [];
			const { pending } = relation.target;
			return [
				pendingSemanticRelationLocatorKey(
					derivePendingSemanticRelationLocator(reading, pending),
				),
			];
		}),
	);
	recordRead("requestedOwnedSurfaces");
	const existingOwnedSurfaces = draftSurfaceIds
		.map((id) => state.findStoredSurfaceById(id))
		.filter((value) => value !== undefined);
	recordRead("explicitLemmaTargets");
	const explicitExistingLemmaTargets = explicitLemmas
		.map((value) => state.findStoredBundleByLemma(value)?.lemmaRecord)
		.filter((value) => value !== undefined);
	recordRead("exactPendingRelations");
	const exactPending = state
		.allPendingRelations()
		.filter(({ locator }) =>
			proposedPendingKeys.has(pendingSemanticRelationLocatorKey(locator)),
		);
	const pendingRelationsMatchingProposedLemma = matchingPending();
	const { relationLemmas, relationReadings } = relationInventory(
		state,
		recordRead,
	);
	return {
		intent: request.intent,
		revision: state.currentRevision(),
		existingLemma: existingBundle?.lemmaRecord,
		...(existingReading ? { existingReading } : {}),
		existingOwnedSurfaces,
		explicitExistingLemmaTargets,
		exactPendingRelations: exactPending,
		pendingRelationsMatchingProposedLemma,
		relationLemmas,
		relationReadings,
	};
}

/** The whole dictionary, as a relation inventory. */
function relationInventory<L extends Dumling.Language>(
	state: InMemoryStorageState<L>,
	recordRead: (read: ReadingEntryContextRead) => void,
) {
	recordRead("relationLemmas");
	const relationLemmas = state.storedNotes.map(
		({ lemmaRecord }) => lemmaRecord,
	);
	recordRead("relationReadings");
	const relationReadings = state.storedNotes.flatMap(
		({ readingEntries }) => readingEntries,
	);
	return { relationLemmas, relationReadings };
}

export function loadReevaluateShadowsContext<L extends Dumling.Language>(
	state: InMemoryStorageState<L>,
	request: Omit<ReevaluateShadowsRequest<L>, "baseRevision">,
): ReevaluateShadowsSlice<L> {
	const ids = new Set<string>(reevaluatedPendingEntryIds(request));
	return {
		revision: state.currentRevision(),
		pendingRelations: state
			.allPendingRelations()
			.filter(({ locator }) => ids.has(locator.targetPendingId)),
		...relationInventory(state, () => {}),
	};
}

export function loadCleanupRelationsContext<L extends Dumling.Language>(
	state: InMemoryStorageState<L>,
	request: { resolutions: CleanupRelationResolution<L>[] },
): CleanupRelationsSlice<L> {
	const locatorKeys = new Set(
		request.resolutions.map(({ locator }) =>
			pendingSemanticRelationLocatorKey(locator),
		),
	);
	return {
		revision: state.currentRevision(),
		pendingRelations: state
			.allPendingRelations()
			.filter(({ locator }) =>
				locatorKeys.has(pendingSemanticRelationLocatorKey(locator)),
			),
		relationLemmas: state.storedNotes.map(({ lemmaRecord }) => lemmaRecord),
		relationReadings: state.storedNotes.flatMap(
			({ readingEntries }) => readingEntries,
		),
	};
}
