import {
	derivePendingLemmaId,
	samePendingLemmaIdentity,
} from "../../core/pending/identity";
import { makeDumlingIdFor, type SupportedLanguage } from "../../dumling";
import type {
	CleanupRelationsSlice,
	FindStoredLemmaSensesStorageRequest,
	GetInfoForRelationsCleanupStorageRequest,
	LemmaPatchSlice,
	LoadCleanupRelationsContextRequest,
	LoadLemmaForPatchRequest,
	LoadNewNoteContextRequest,
	NewNoteSlice,
	RelationsCleanupInfoSlice,
	StoredLemmaSensesSlice,
} from "../../storage";
import type { InMemoryStorageState } from "./state";

export function findStoredLemmaSenses<L extends SupportedLanguage>(
	state: InMemoryStorageState<L>,
	request: FindStoredLemmaSensesStorageRequest<L>,
): StoredLemmaSensesSlice<L> {
	const { lemmaDescription } = request;
	return {
		revision: state.currentRevision(),
		candidates: state.storedNotes
			.filter(({ lemmaEntry }) => {
				const { lemma } = lemmaEntry;
				return (
					lemma.language === lemmaDescription.language &&
					lemma.canonicalLemma === lemmaDescription.canonicalLemma &&
					lemma.lemmaKind === lemmaDescription.lemmaKind &&
					lemma.lemmaSubKind === lemmaDescription.lemmaSubKind
				);
			})
			.map(({ lemmaEntry }) => ({
				entry: lemmaEntry,
			})),
	};
}

export function loadLemmaForPatch<L extends SupportedLanguage>(
	state: InMemoryStorageState<L>,
	request: LoadLemmaForPatchRequest<L>,
): LemmaPatchSlice<L> {
	return {
		revision: state.currentRevision(),
		lemma: state.findStoredNoteByLemmaId(request.lemmaId)?.lemmaEntry,
	};
}

export function loadNewNoteContext<L extends SupportedLanguage>(
	state: InMemoryStorageState<L>,
	request: LoadNewNoteContextRequest<L>,
): NewNoteSlice<L> {
	const draftLemmaId = makeDumlingIdFor(state.language, request.draft.lemma);
	const existingLemma = state.findStoredNoteByLemmaId(draftLemmaId)?.lemmaEntry;
	const matchingPendingId = derivePendingLemmaId({
		language: state.language,
		canonicalLemma: request.draft.lemma.canonicalLemma,
		lemmaKind: request.draft.lemma.lemmaKind,
		lemmaSubKind: request.draft.lemma.lemmaSubKind,
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
			makeDumlingIdFor(state.language, surface),
		) ?? [];
	const explicitExistingRelationTargetIds =
		request.draft.relations
			?.filter((relation) => relation.target.kind === "existing")
			.map((relation) =>
				relation.target.kind === "existing"
					? relation.target.lemmaId
					: undefined,
			)
			.filter((lemmaId) => lemmaId !== undefined) ?? [];
	const proposedPendingTargetIds =
		request.draft.relations
			?.filter((relation) => relation.target.kind === "pending")
			.map((relation) =>
				relation.target.kind === "pending"
					? derivePendingLemmaId({
							language: state.language,
							canonicalLemma: relation.target.ref.canonicalLemma,
							lemmaKind: relation.target.ref.lemmaKind,
							lemmaSubKind: relation.target.ref.lemmaSubKind,
						})
					: undefined,
			)
			.filter((pendingId) => pendingId !== undefined) ?? [];

	return {
		revision: state.currentRevision(),
		existingLemma,
		existingOwnedSurfaces: draftSurfaceIds
			.map((surfaceId) => state.findStoredSurfaceById(surfaceId))
			.filter((surface) => surface !== undefined),
		explicitExistingRelationTargets: explicitExistingRelationTargetIds
			.map((lemmaId) => state.findStoredNoteByLemmaId(lemmaId)?.lemmaEntry)
			.filter((lemmaEntry) => lemmaEntry !== undefined),
		existingPendingRefsForProposedPendingTargets: proposedPendingTargetIds
			.map((pendingId) => state.findStoredPendingRefById(pendingId))
			.filter((pendingRef) => pendingRef !== undefined),
		matchingPendingRefsForNewLemma: matchingPendingRefs,
		incomingPendingRelationsForNewLemma: incomingPendingRelations,
		incomingPendingSourceLemmas: incomingPendingRelations
			.map(
				(relation) =>
					state.findStoredNoteByLemmaId(relation.sourceLemmaId)?.lemmaEntry,
			)
			.filter((lemmaEntry) => lemmaEntry !== undefined),
	};
}

export function getInfoForRelationsCleanup<L extends SupportedLanguage>(
	state: InMemoryStorageState<L>,
	request: GetInfoForRelationsCleanupStorageRequest<L>,
): RelationsCleanupInfoSlice<L> {
	const pendingRefs = state.storedPendingRefs.filter(
		(pendingRef) =>
			samePendingLemmaIdentity(pendingRef, {
				language: state.language,
				canonicalLemma: request.canonicalLemma,
				lemmaKind: pendingRef.lemmaKind,
				lemmaSubKind: pendingRef.lemmaSubKind,
			}),
	);
	const pendingIds = new Set(pendingRefs.map(({ pendingId }) => pendingId));

	return {
		revision: state.currentRevision(),
		canonicalLemma: request.canonicalLemma,
		candidateLemmas: state.storedNotes
			.filter(
				({ lemmaEntry }) =>
					samePendingLemmaIdentity(
						{
							language: state.language,
							canonicalLemma: lemmaEntry.lemma.canonicalLemma,
							lemmaKind: lemmaEntry.lemma.lemmaKind,
							lemmaSubKind: lemmaEntry.lemma.lemmaSubKind,
						},
						{
							language: state.language,
							canonicalLemma: request.canonicalLemma,
							lemmaKind: lemmaEntry.lemma.lemmaKind,
							lemmaSubKind: lemmaEntry.lemma.lemmaSubKind,
						},
					),
			)
			.map(({ lemmaEntry }) => lemmaEntry),
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
	const targetLemmaIds = new Set(
		request.resolutions
			.map(({ targetLemmaId }) => targetLemmaId)
			.filter((targetLemmaId) => targetLemmaId !== undefined),
	);

	return {
		revision: state.currentRevision(),
		pendingRefs: state.storedPendingRefs.filter(({ pendingId }) =>
			pendingIds.has(pendingId),
		),
		pendingRelations: state
			.allPendingRelations()
			.filter((relation) => pendingIds.has(relation.targetPendingId)),
		targetLemmas: Array.from(targetLemmaIds)
			.map((lemmaId) => state.findStoredNoteByLemmaId(lemmaId)?.lemmaEntry)
			.filter((lemmaEntry) => lemmaEntry !== undefined),
	};
}
