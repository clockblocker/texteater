import type { SupportedLanguage } from "dumling/types";
import { sameLemma } from "../../core/identity";
import {
	derivePendingSemanticRelationLocator,
	pendingSemanticRelationLocatorKey,
} from "../../core/pending";
import { makeSurfaceId } from "../../dumling-id";
import type {
	CleanupRelationsSlice,
	FindStoredReadingsStorageRequest,
	GetInfoForRelationsCleanupStorageRequest,
	LoadCleanupRelationsContextRequest,
	LoadReadingEntryContextRequest,
	LoadReadingForPatchRequest,
	ReadingEntryContext,
	ReadingPatchSlice,
	RelationsCleanupInfoSlice,
	StoredReadingsSlice,
} from "../../storage";
import type { InMemoryStorageState } from "./state";

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

export type ReadingEntryContextRead =
	| "existingLemma"
	| "existingReading"
	| "requestedOwnedSurfaces"
	| "explicitLemmaTargets"
	| "exactPendingRelations"
	| "pendingRelationsMatchingLemma"
	| "relationLemmas"
	| "relationReadings";

export function loadReadingEntryContext<L extends SupportedLanguage>(
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
	const existingBundle = state.findStoredBundleByLemma(reading.lemma);
	if (request.intent === "ensureReadingEntry")
		return {
			intent: request.intent,
			revision: state.currentRevision(),
			...(existingBundle
				? { existingLemma: existingBundle.lemmaRecord }
				: {}),
			...(existingReading ? { existingReading } : {}),
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
	recordRead("pendingRelationsMatchingLemma");
	const matchingPending = state
		.allPendingRelations()
		.filter((record) => pendingMatchesLemma(record, reading.lemma));
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
		existingLemma: existingBundle?.lemmaRecord,
		...(existingReading ? { existingReading } : {}),
		existingOwnedSurfaces,
		explicitExistingLemmaTargets,
		exactPendingRelations: exactPending,
		pendingRelationsMatchingProposedLemma: matchingPending,
		relationLemmas,
		relationReadings,
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
