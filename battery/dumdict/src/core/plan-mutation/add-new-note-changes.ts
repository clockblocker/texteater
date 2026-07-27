import type {
	LemmaEntry,
	PendingLemmaRef,
	PendingLemmaRelation,
	SurfaceEntry,
} from "../../dto";
import type { DumlingId, SupportedLanguage } from "../../dumling";
import type { NewNoteSlice } from "../../storage";
import type { PlannedChangeOp } from "../planned-changes";

export function assembleAddNewNoteChanges<L extends SupportedLanguage>({
	slice,
	lemmaId,
	lemmaEntry,
	ownedSurfaceEntries,
	pickupRelationPatches,
	inverseRelationPatches,
	pendingRefsToCreateById,
	pendingRelationEntries,
}: {
	slice: NewNoteSlice<L>;
	lemmaId: DumlingId<"Lemma", L>;
	lemmaEntry: LemmaEntry<L>;
	ownedSurfaceEntries: SurfaceEntry<L>[];
	pickupRelationPatches: PlannedChangeOp<L>[];
	inverseRelationPatches: PlannedChangeOp<L>[];
	pendingRefsToCreateById: Map<string, PendingLemmaRef<L>>;
	pendingRelationEntries: PendingLemmaRelation<L>[];
}): PlannedChangeOp<L>[] {
	return [
		{
			type: "createLemma",
			entry: lemmaEntry,
			preconditions: [
				{ kind: "revisionMatches", revision: slice.revision },
				{ kind: "lemmaMissing", lemmaId },
			],
		},
		...pickupRelationPatches,
		...inverseRelationPatches,
		...Array.from(pendingRefsToCreateById.values()).map(
			(ref): PlannedChangeOp<L> => ({
				type: "createPendingRef",
				ref,
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "pendingRefMissing", pendingId: ref.pendingId },
				],
			}),
		),
		...pendingRelationEntries.map(
			(relation): PlannedChangeOp<L> => ({
				type: "createPendingRelation",
				relation,
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "lemmaExists", lemmaId },
					{ kind: "pendingRefExists", pendingId: relation.targetPendingId },
					{ kind: "pendingRelationMissing", relation },
				],
			}),
		),
		...slice.incomingPendingRelationsForNewLemma.map(
			(relation): PlannedChangeOp<L> => ({
				type: "deletePendingRelation",
				relation,
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "pendingRelationExists", relation },
				],
			}),
		),
		...slice.matchingPendingRefsForNewLemma.map(
			(ref): PlannedChangeOp<L> => ({
				type: "deletePendingRef",
				pendingId: ref.pendingId,
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "pendingRefExists", pendingId: ref.pendingId },
					{
						kind: "pendingRefHasNoIncomingRelations",
						pendingId: ref.pendingId,
					},
				],
			}),
		),
		...ownedSurfaceEntries.map(
			(entry): PlannedChangeOp<L> => ({
				type: "createOwnedSurface",
				entry,
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "lemmaExists", lemmaId },
					{ kind: "surfaceMissing", surfaceId: entry.id },
				],
			}),
		),
	];
}
