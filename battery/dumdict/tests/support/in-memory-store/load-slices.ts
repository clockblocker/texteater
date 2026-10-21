import { lemmaIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import { directSemanticRelationValues } from "dumrel";

import { readingLemma, shadowMatchesLemma } from "../../../src/core/identity";
import {
	derivePendingEntryId,
	derivePendingSemanticRelationLocator,
	pendingSemanticRelationLocatorKey,
	reevaluatedPendingEntryIds,
	unitShadowOf,
} from "../../../src/core/pending";
import type { ReadingEntry } from "../../../src/domain-types";
import type { SerializedDictionaryNote } from "../../../src/dto";
import { makeSurfaceId } from "../../../src/dumling-id";
import type {
	CleanupRelationResolution,
	ReevaluateShadowsRequest,
} from "../../../src/public";
import type {
	CleanupRelationsSlice,
	LoadReadingEntryContextRequest,
	OccurrenceSlice,
	OccurrenceSliceRequest,
	ReadingEntryContext,
	ReevaluateShadowsSlice,
	RekeySurfacesSlice,
	RekeySurfacesSliceRequest,
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
		const bundle = state.findStoredBundleByLemma(readingLemma(reading));
		return {
			intent: request.intent,
			revision: state.currentRevision(),
			...(bundle ? { existingLemma: bundle.lemmaRecord } : {}),
			...(existingReading ? { existingReading } : {}),
			lemmaReadings: lemmaReadingsOf(bundle),
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

	if (request.intent === "recordOccurrence") {
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
			attestationLinksWithRefs: linksWithRefs(state, [request.ref]),
		};
	}

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
		lemmaReadings: lemmaReadingsOf(existingBundle),
		attestationLinksWithRefs: linksWithRefs(state, request.attestationRefs),
	};
}

function lemmaReadingsOf<L extends Dumling.Language>(
	bundle: SerializedDictionaryNote<L> | undefined,
): Dumling.Reading<L>[] {
	return bundle?.readingEntries.map(({ reading }) => reading) ?? [];
}

function linksWithRefs<L extends Dumling.Language>(
	state: InMemoryStorageState<L>,
	refs: readonly string[],
) {
	return state.storedNotes.flatMap(({ readingEntries }) =>
		readingEntries.flatMap(({ attestationLinks }) =>
			attestationLinks.filter(({ ref }) => refs.includes(ref)),
		),
	);
}

/**
 * Each Lemma one of whose Readings holds a link with a requested ref, whole,
 * every other Reading claiming one of them or their Readings, and every
 * Shadow relation one of them matches.
 */
export function loadOccurrenceSlice<L extends Dumling.Language>(
	state: InMemoryStorageState<L>,
	request: OccurrenceSliceRequest,
): OccurrenceSlice<L> {
	const lemmas = state.storedNotes
		.filter(({ readingEntries }) =>
			readingEntries.some(({ attestationLinks }) =>
				attestationLinks.some(({ ref }) => request.refs.includes(ref)),
			),
		)
		.map(({ schemaVersion: _version, ...slice }) => slice);
	const lemmaKeys = new Set(
		lemmas.map(({ lemmaRecord }) => lemmaIdentityKey(lemmaRecord.lemma)),
	);
	const claims = (entry: ReadingEntry<L>) => {
		const relations = entry.knowledge?.semanticRelations;
		const targets =
			relations?.targetKind === "reading"
				? (relations.synonym ?? []).map(({ lemma }) => lemma)
				: directSemanticRelationValues.flatMap(
						(relation) => relations?.[relation] ?? [],
					);
		return targets.some((lemma) => lemmaKeys.has(lemmaIdentityKey(lemma)));
	};
	const ids = new Set<string>(
		lemmas.map(({ lemmaRecord }) =>
			derivePendingEntryId<L>(unitShadowOf(lemmaRecord.lemma)),
		),
	);
	return {
		revision: state.currentRevision(),
		lemmas,
		claimingReadings: state.storedNotes
			.filter(
				({ lemmaRecord }) =>
					!lemmaKeys.has(lemmaIdentityKey(lemmaRecord.lemma)),
			)
			.flatMap(({ readingEntries }) => readingEntries.filter(claims)),
		pendingRelationsMatchingLemmas: state
			.allPendingRelations()
			.filter(({ locator }) => ids.has(locator.targetPendingId)),
	};
}

/** Each stored Surface with a requested id, and the Readings linking one. */
export function loadRekeySurfacesSlice<L extends Dumling.Language>(
	state: InMemoryStorageState<L>,
	request: RekeySurfacesSliceRequest<L>,
): RekeySurfacesSlice<L> {
	const ids = new Set<string>(request.surfaceIds);
	return {
		revision: state.currentRevision(),
		surfaces: state.storedNotes.flatMap(({ ownedSurfaceEntries }) =>
			ownedSurfaceEntries
				.filter(({ id }) => ids.has(id))
				.map(({ surface: _surface, ...note }) => note),
		),
		readings: state.storedNotes.flatMap(({ readingEntries }) =>
			readingEntries.filter(({ attestationLinks }) =>
				attestationLinks.some(
					({ surfaceId }) => surfaceId !== null && ids.has(surfaceId),
				),
			),
		),
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
