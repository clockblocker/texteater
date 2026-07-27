import type {
	LemmaEntry,
	LexicalRelations,
	MorphologicalRelations,
	SurfaceEntry,
} from "../../dto";
import { makeDumlingIdFor, type SupportedLanguage } from "../../dumling";
import type { NewNoteSlice } from "../../storage";
import { derivePendingLemmaId } from "../pending/identity";
import { assembleAddNewNoteChanges } from "./add-new-note-changes";
import { planPendingRelationsAndRefs } from "./add-new-note-pending";
import {
	planExplicitExistingRelationPatches,
	planPickupRelationPatches,
} from "./add-new-note-relations";
import { uniqueBy } from "./dedupe";
import type {
	AddNewNoteIntent,
	PlanMutationRejected,
	PlanMutationResult,
} from "./result";

export function planAddNewNote<L extends SupportedLanguage>(
	slice: NewNoteSlice<L>,
	intent: AddNewNoteIntent<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	const language = intent.draft.lemma.language as L;
	const lemmaId = makeDumlingIdFor(language, intent.draft.lemma);
	const pendingLemmaId = derivePendingLemmaId({
		language,
		canonicalLemma: intent.draft.lemma.canonicalLemma,
		lemmaKind: intent.draft.lemma.lemmaKind,
		lemmaSubKind: intent.draft.lemma.lemmaSubKind,
	});

	if (
		intent.draft.relations?.some((relation) => {
			if (relation.target.kind === "existing") {
				return relation.target.lemmaId === lemmaId;
			}

			return (
				derivePendingLemmaId({
					language,
					canonicalLemma: relation.target.ref.canonicalLemma,
					lemmaKind: relation.target.ref.lemmaKind,
					lemmaSubKind: relation.target.ref.lemmaSubKind,
				}) === pendingLemmaId
			);
		})
	) {
		return {
			status: "rejected",
			code: "selfRelation",
			message: "A lemma cannot relate to itself.",
		};
	}

	if (slice.existingLemma) {
		return {
			status: "rejected",
			code: "lemmaAlreadyExists",
			message: "Lemma already exists.",
		};
	}

	if (slice.existingOwnedSurfaces.length > 0) {
		return {
			status: "rejected",
			code: "ownedSurfaceAlreadyExists",
			message: "An owned surface already exists.",
		};
	}

	const explicitExistingRelations =
		intent.draft.relations?.filter(
			(relation) => relation.target.kind === "existing",
		) ?? [];
	const existingRelationTargetIds = new Set(
		slice.explicitExistingRelationTargets.map(({ id }) => id),
	);

	if (
		explicitExistingRelations.some(
			(relation) =>
				relation.target.kind === "existing" &&
				!existingRelationTargetIds.has(relation.target.lemmaId),
		)
	) {
		return {
			status: "rejected",
			code: "relationTargetMissing",
			message: "An explicit relation target is missing.",
		};
	}

	const lexicalRelations: LexicalRelations<L> = {};
	const morphologicalRelations: MorphologicalRelations<L> = {};
	const ownedSurfaceEntries: SurfaceEntry<L>[] = uniqueBy(
		intent.draft.ownedSurfaces?.map((ownedSurface) => ({
			id: makeDumlingIdFor(language, ownedSurface.surface),
			surface: ownedSurface.surface,
			ownerLemmaId: lemmaId,
			attestedTranslations: ownedSurface.note.attestedTranslations,
			attestations: ownedSurface.note.attestations,
			notes: ownedSurface.note.notes,
		})) ?? [],
		({ id }) => id,
	);
	const { pendingRefsToCreateById, pendingRelationEntries } =
		planPendingRelationsAndRefs({ slice, intent, language, lemmaId });
	const pickupRelationPatches = planPickupRelationPatches({
		slice,
		lemmaId,
		lexicalRelations,
		morphologicalRelations,
	});
	const inverseRelationPatches = planExplicitExistingRelationPatches({
		slice,
		intent,
		lemmaId,
		lexicalRelations,
		morphologicalRelations,
	});

	const lemmaEntry: LemmaEntry<L> = {
		id: lemmaId,
		lemma: intent.draft.lemma,
		lexicalRelations,
		morphologicalRelations,
		attestedTranslations: intent.draft.note.attestedTranslations,
		attestations: intent.draft.note.attestations,
		notes: intent.draft.note.notes,
	};
	const changes = assembleAddNewNoteChanges({
		slice,
		lemmaId,
		lemmaEntry,
		ownedSurfaceEntries,
		pickupRelationPatches,
		inverseRelationPatches,
		pendingRefsToCreateById,
		pendingRelationEntries,
	});

	return {
		status: "planned",
		baseRevision: slice.revision,
		intent,
		changes,
		affected: {
			lemmaIds: [lemmaId],
			surfaceIds: ownedSurfaceEntries.map(({ id }) => id),
			pendingIds: [
				...Array.from(pendingRefsToCreateById.keys()),
				...slice.matchingPendingRefsForNewLemma.map(
					({ pendingId }) => pendingId,
				),
			],
		},
		summary: { message: "Added new lemma note." },
	};
}
