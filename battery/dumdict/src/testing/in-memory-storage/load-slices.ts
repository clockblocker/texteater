import { sameLemma } from "../../core/identity";
import { derivePendingEntryId } from "../../core/pending/identity";
import { makeSurfaceId, type SupportedLanguage } from "../../dumling";
import type {
	CleanupRelationsSlice,
	FindStoredReadingsStorageRequest,
	GetInfoForRelationsCleanupStorageRequest,
	LoadCleanupRelationsContextRequest,
	LoadNewNoteContextRequest,
	LoadReadingForPatchRequest,
	NewNoteSlice,
	ReadingPatchSlice,
	RelationsCleanupInfoSlice,
	StoredReadingsSlice,
} from "../../storage";
import type { InMemoryStorageState } from "./state";

export function findStoredReadings<L extends SupportedLanguage>(
	state: InMemoryStorageState<L>,
	request: FindStoredReadingsStorageRequest<L>,
): StoredReadingsSlice<L> {
	return {
		revision: state.currentRevision(),
		candidates: state.storedNotes.flatMap((bundle) => {
			const { lemma } = bundle.lemmaRecord;
			if (!sameLemma(lemma, request.lemma)) {
				return [];
			}
			return bundle.readingEntries.map((reading) => ({
				reading,
				lemma: bundle.lemmaRecord,
			}));
		}),
	};
}

export function loadReadingForPatch<L extends SupportedLanguage>(
	state: InMemoryStorageState<L>,
	request: LoadReadingForPatchRequest<L>,
): ReadingPatchSlice<L> {
	return {
		revision: state.currentRevision(),
		reading: state.findStoredReading(request.reading),
	};
}

export function loadNewNoteContext<L extends SupportedLanguage>(
	state: InMemoryStorageState<L>,
	request: LoadNewNoteContextRequest<L>,
): NewNoteSlice<L> {
	const { reading } = request.draft;
	const { lemma } = reading;
	const existingBundle = state.findStoredBundleByLemma(lemma);
	const matchingPendingId = derivePendingEntryId({
		language: state.language,
		canonicalForm: lemma.canonicalForm,
		family: lemma.family,
		kind: lemma.kind,
	});
	const matchingPendingRefs = state.storedPendingRefs.filter(
		(ref) => ref.pendingId === matchingPendingId,
	);
	const matchingPendingIds = new Set(
		matchingPendingRefs.map(({ pendingId }) => pendingId),
	);
	const incomingPendingRelations = state
		.allPendingRelations()
		.filter((relation) => matchingPendingIds.has(relation.targetPendingId));
	const draftSurfaceIds =
		request.draft.ownedSurfaces?.map(({ surface }) =>
			makeSurfaceId(state.language, surface),
		) ?? [];
	const explicitReadings =
		request.draft.relations
			?.filter(
				(relation) =>
					relation.relationFamily === "lexical" &&
					relation.target.kind === "existing",
			)
			.map((relation) =>
				relation.relationFamily === "lexical" &&
				relation.target.kind === "existing"
					? relation.target.reading
					: undefined,
			)
			.filter((target) => target !== undefined) ?? [];
	const explicitLemmas =
		request.draft.relations
			?.filter(
				(relation) =>
					relation.relationFamily === "morphological" &&
					relation.target.kind === "existing",
			)
			.map((relation) =>
				relation.relationFamily === "morphological" &&
				relation.target.kind === "existing"
					? relation.target.lemma
					: undefined,
			)
			.filter((target) => target !== undefined) ?? [];
	const proposedPendingTargetIds =
		request.draft.relations
			?.filter((relation) => relation.target.kind === "pending")
			.map((relation) =>
				relation.target.kind === "pending"
					? derivePendingEntryId({
							language: state.language,
							canonicalForm: relation.target.ref.canonicalForm,
							family: relation.target.ref.family,
							kind: relation.target.ref.kind,
						})
					: undefined,
			)
			.filter((pendingId) => pendingId !== undefined) ?? [];

	return {
		revision: state.currentRevision(),
		existingLemma: existingBundle?.lemmaRecord,
		existingReading: state.findStoredReading(reading),
		existingOwnedSurfaces: draftSurfaceIds
			.map((surfaceId) => state.findStoredSurfaceById(surfaceId))
			.filter((surface) => surface !== undefined),
		explicitExistingReadingTargets: explicitReadings
			.map((reading) => state.findStoredReading(reading))
			.filter((entry) => entry !== undefined),
		explicitExistingLemmaTargets: explicitLemmas
			.map((lemma) => state.findStoredBundleByLemma(lemma)?.lemmaRecord)
			.filter((entry) => entry !== undefined),
		existingPendingRefsForProposedPendingTargets: proposedPendingTargetIds
			.map((pendingId) => state.findStoredPendingRefById(pendingId))
			.filter((pendingRef) => pendingRef !== undefined),
		matchingPendingRefsForNewEntry: matchingPendingRefs,
		incomingPendingRelationsForNewEntry: incomingPendingRelations,
		incomingPendingSourceReadings: incomingPendingRelations
			.filter((relation) => relation.relationFamily === "lexical")
			.map((relation) =>
				relation.relationFamily === "lexical"
					? state.findStoredReading(relation.sourceReading)
					: undefined,
			)
			.filter((entry) => entry !== undefined),
		incomingPendingSourceLemmas: incomingPendingRelations
			.filter((relation) => relation.relationFamily === "morphological")
			.map((relation) =>
				relation.relationFamily === "morphological"
					? state.findStoredBundleByLemma(relation.sourceLemma)
							?.lemmaRecord
					: undefined,
			)
			.filter((entry) => entry !== undefined),
	};
}

export function getInfoForRelationsCleanup<L extends SupportedLanguage>(
	state: InMemoryStorageState<L>,
	request: GetInfoForRelationsCleanupStorageRequest<L>,
): RelationsCleanupInfoSlice<L> {
	const pendingRefs = state.storedPendingRefs.filter(
		(pendingRef) => pendingRef.canonicalForm === request.canonicalForm,
	);
	const pendingIds = new Set(pendingRefs.map(({ pendingId }) => pendingId));

	return {
		revision: state.currentRevision(),
		canonicalForm: request.canonicalForm,
		candidateLemmas: state.storedNotes
			.map(({ lemmaRecord }) => lemmaRecord)
			.filter(
				({ lemma }) => lemma.canonicalForm === request.canonicalForm,
			),
		pendingRefs,
		pendingRelations: state
			.allPendingRelations()
			.filter((relation) => pendingIds.has(relation.targetPendingId)),
	};
}

export function loadCleanupRelationsContext<L extends SupportedLanguage>(
	state: InMemoryStorageState<L>,
	request: LoadCleanupRelationsContextRequest<L>,
): CleanupRelationsSlice<L> {
	const pendingIds = new Set(
		request.resolutions.map(({ targetPendingId }) => targetPendingId),
	);
	const targetReadings = request.resolutions
		.filter((resolution) => resolution.relationFamily === "lexical")
		.map((resolution) =>
			resolution.relationFamily === "lexical"
				? resolution.targetReading
				: undefined,
		)
		.filter((target) => target !== undefined)
		.map((target) => {
			const reading = state.findStoredReading(target);
			const lemma =
				reading &&
				state.findStoredBundleByLemma(reading.reading.lemma)
					?.lemmaRecord;
			return reading && lemma ? { reading, lemma } : undefined;
		})
		.filter((target) => target !== undefined);
	const targetLemmas = request.resolutions
		.filter((resolution) => resolution.relationFamily === "morphological")
		.map((resolution) =>
			resolution.relationFamily === "morphological"
				? resolution.targetLemma
				: undefined,
		)
		.filter((target) => target !== undefined)
		.map((target) => state.findStoredBundleByLemma(target)?.lemmaRecord)
		.filter((target) => target !== undefined);

	return {
		revision: state.currentRevision(),
		pendingRefs: state.storedPendingRefs.filter(({ pendingId }) =>
			pendingIds.has(pendingId),
		),
		pendingRelations: state
			.allPendingRelations()
			.filter((relation) => pendingIds.has(relation.targetPendingId)),
		targetReadings,
		targetLemmas,
	};
}
