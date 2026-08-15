import { readingKey, sameLemma } from "../../core/identity";
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

function locatorKey(value: {
	sourceReadingKey: string;
	relation: string;
	targetPendingId: string;
}) {
	return `${value.sourceReadingKey}\0${value.relation}\0${value.targetPendingId}`;
}

export function findStoredReadings<L extends SupportedLanguage>(
	state: InMemoryStorageState<L>,
	request: FindStoredReadingsStorageRequest<L>,
): StoredReadingsSlice<L> {
	return {
		revision: state.currentRevision(),
		candidates: state.storedNotes.flatMap((bundle) =>
			sameLemma(bundle.lemmaRecord.lemma, request.lemma)
				? bundle.readingEntries.map((reading) => ({
						reading,
						lemma: bundle.lemmaRecord,
					}))
				: [],
		),
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
	const existingBundle = state.findStoredBundleByLemma(reading.lemma);
	const draftSurfaceIds =
		request.draft.ownedSurfaces?.map(({ surface }) =>
			makeSurfaceId(state.language, surface),
		) ?? [];
	const explicitReadings =
		request.draft.relations?.flatMap((relation) =>
			relation.target.kind === "existing"
				? [relation.target.reading]
				: [],
		) ?? [];
	const proposedPendingKeys = new Set(
		request.draft.relations?.flatMap((relation) => {
			if (relation.target.kind !== "pending") return [];
			const { pending } = relation.target;
			return [
				locatorKey({
					sourceReadingKey: readingKey(reading),
					relation: pending.relation,
					targetPendingId: derivePendingEntryId(pending.target),
				}),
			];
		}) ?? [],
	);
	return {
		revision: state.currentRevision(),
		existingLemma: existingBundle?.lemmaRecord,
		existingReading: state.findStoredReading(reading),
		existingOwnedSurfaces: draftSurfaceIds
			.map((id) => state.findStoredSurfaceById(id))
			.filter((value) => value !== undefined),
		explicitExistingReadingTargets: explicitReadings
			.map((value) => state.findStoredReading(value))
			.filter((value) => value !== undefined),
		existingPendingRelationsForProposedPendingTargets: state
			.allPendingRelations()
			.filter(({ locator }) =>
				proposedPendingKeys.has(locatorKey(locator)),
			),
	};
}

export function getInfoForRelationsCleanup<L extends SupportedLanguage>(
	state: InMemoryStorageState<L>,
	request: GetInfoForRelationsCleanupStorageRequest<L>,
): RelationsCleanupInfoSlice<L> {
	return {
		revision: state.currentRevision(),
		canonicalForm: request.canonicalForm,
		candidateLemmas: state.storedNotes
			.map(({ lemmaRecord }) => lemmaRecord)
			.filter(
				({ lemma }) => lemma.canonicalForm === request.canonicalForm,
			),
		pendingRelations: state
			.allPendingRelations()
			.filter(
				({ pending }) =>
					pending.target.canonicalForm === request.canonicalForm,
			),
	};
}

export function loadCleanupRelationsContext<L extends SupportedLanguage>(
	state: InMemoryStorageState<L>,
	request: LoadCleanupRelationsContextRequest<L>,
): CleanupRelationsSlice<L> {
	const locatorKeys = new Set(
		request.resolutions.map(({ locator }) => locatorKey(locator)),
	);
	const targetReadings = request.resolutions.flatMap(({ targetReading }) => {
		if (!targetReading) return [];
		const reading = state.findStoredReading(targetReading);
		const lemma =
			reading &&
			state.findStoredBundleByLemma(reading.reading.lemma)?.lemmaRecord;
		return reading && lemma ? [{ reading, lemma }] : [];
	});
	return {
		revision: state.currentRevision(),
		pendingRelations: state
			.allPendingRelations()
			.filter(({ locator }) => locatorKeys.has(locatorKey(locator))),
		targetReadings,
	};
}
