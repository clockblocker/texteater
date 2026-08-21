import { readingFingerprint } from "dumling/id";
import type { SupportedLanguage } from "dumling/types";
import { sameLemma } from "../../core/identity";
import { derivePendingEntryId } from "../../core/pending/identity";
import { makeSurfaceId } from "../../dumling-id";
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

function pendingMatchesLemma<L extends SupportedLanguage>(
	record: InMemoryStorageState<L>["storedNotes"][number]["pendingRelations"][number],
	lemma: InMemoryStorageState<L>["storedNotes"][number]["lemmaRecord"]["lemma"],
) {
	const target = record.pending.target;
	return (
		target.language === lemma.language &&
		target.canonicalForm === lemma.canonicalForm &&
		target.family === lemma.family &&
		target.kind === lemma.kind
	);
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
	const explicitLemmas =
		request.draft.relations?.flatMap((relation) =>
			relation.target.kind === "existing" ? [relation.target.lemma] : [],
		) ?? [];
	const proposedPendingKeys = new Set(
		request.draft.relations?.flatMap((relation) => {
			if (relation.target.kind !== "pending") return [];
			const { pending } = relation.target;
			return [
				locatorKey({
					sourceReadingKey: readingFingerprint(reading),
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
		explicitExistingLemmaTargets: explicitLemmas
			.map((value) => state.findStoredBundleByLemma(value)?.lemmaRecord)
			.filter((value) => value !== undefined),
		existingPendingRelationsForProposedPendingTargets: state
			.allPendingRelations()
			.filter(({ locator }) =>
				proposedPendingKeys.has(locatorKey(locator)),
			),
		pendingRelationsMatchingProposedLemma: state
			.allPendingRelations()
			.filter((record) => pendingMatchesLemma(record, reading.lemma)),
		relationLemmas: state.storedNotes.map(({ lemmaRecord }) => lemmaRecord),
		relationReadings: state.storedNotes.flatMap(
			({ readingEntries }) => readingEntries,
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
	return {
		revision: state.currentRevision(),
		pendingRelations: state
			.allPendingRelations()
			.filter(({ locator }) => locatorKeys.has(locatorKey(locator))),
		relationLemmas: state.storedNotes.map(({ lemmaRecord }) => lemmaRecord),
		relationReadings: state.storedNotes.flatMap(
			({ readingEntries }) => readingEntries,
		),
	};
}
