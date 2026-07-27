import type {
	LemmaEntry,
	LexicalRelation,
	LexicalRelations,
	MorphologicalRelation,
	MorphologicalRelations,
	PendingLemmaRef,
	PendingLemmaRelation,
	SurfaceEntry,
} from "../../dto";
import type { DumlingId, SupportedLanguage } from "../../dumling";
import { makeDumlingIdFor } from "../../dumling";
import type { AddNewNoteRequest } from "../../public";
import type { NewNoteSlice } from "../../storage";
import { derivePendingLemmaId, makePendingLemmaRef } from "../pending/identity";
import type { PlannedChangeOp } from "../planned-changes";
import { inverseRelationFor } from "../relations/rules";
import type { PlanMutationRejected, PlanMutationResult } from "./result";

function uniqueBy<T>(values: T[], keyFor: (value: T) => string): T[] {
	const seen = new Set<string>();
	const uniqueValues: T[] = [];
	for (const value of values) {
		const key = keyFor(value);
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		uniqueValues.push(value);
	}
	return uniqueValues;
}

function pendingRelationKey<L extends SupportedLanguage>(
	relation: PendingLemmaRelation<L>,
) {
	return [
		relation.sourceLemmaId,
		relation.relationFamily,
		relation.relation,
		relation.targetPendingId,
	].join("\0");
}

function appendLexicalRelation<L extends SupportedLanguage>(
	relations: LexicalRelations<L>,
	relation: LexicalRelation,
	targetLemmaId: DumlingId<"Lemma", L>,
) {
	const existing = relations[relation] ?? [];
	if (!existing.includes(targetLemmaId)) {
		relations[relation] = [...existing, targetLemmaId];
	}
}

function appendMorphologicalRelation<L extends SupportedLanguage>(
	relations: MorphologicalRelations<L>,
	relation: MorphologicalRelation,
	targetLemmaId: DumlingId<"Lemma", L>,
) {
	const existing = relations[relation] ?? [];
	if (!existing.includes(targetLemmaId)) {
		relations[relation] = [...existing, targetLemmaId];
	}
}

function planPendingRelationsAndRefs<L extends SupportedLanguage>({
	slice,
	request,
	language,
	lemmaId,
}: {
	slice: NewNoteSlice<L>;
	request: AddNewNoteRequest<L>;
	language: L;
	lemmaId: DumlingId<"Lemma", L>;
}): {
	pendingRefsToCreateById: Map<string, PendingLemmaRef<L>>;
	pendingRelationEntries: PendingLemmaRelation<L>[];
} {
	const pendingRelations =
		request.draft.relations?.filter(
			(relation) => relation.target.kind === "pending",
		) ?? [];
	const existingPendingRefIds = new Set(
		slice.existingPendingRefsForProposedPendingTargets.map(
			({ pendingId }) => pendingId,
		),
	);
	const pendingRefsToCreateById = new Map<string, PendingLemmaRef<L>>();
	const pendingRelationEntries: PendingLemmaRelation<L>[] = uniqueBy(
		pendingRelations.map((relation) => {
			if (relation.target.kind !== "pending") {
				throw new Error("Unexpected existing relation target");
			}

			const pendingRef = makePendingLemmaRef({
				language,
				canonicalLemma: relation.target.ref.canonicalLemma,
				lemmaKind: relation.target.ref.lemmaKind,
				lemmaSubKind: relation.target.ref.lemmaSubKind,
			});
			if (!existingPendingRefIds.has(pendingRef.pendingId)) {
				pendingRefsToCreateById.set(pendingRef.pendingId, pendingRef);
			}

			if (relation.relationFamily === "lexical") {
				return {
					sourceLemmaId: lemmaId,
					relationFamily: "lexical",
					relation: relation.relation,
					targetPendingId: pendingRef.pendingId,
				};
			}

			return {
				sourceLemmaId: lemmaId,
				relationFamily: "morphological",
				relation: relation.relation,
				targetPendingId: pendingRef.pendingId,
			};
		}),
		pendingRelationKey,
	);

	return { pendingRefsToCreateById, pendingRelationEntries };
}

function planPickupRelationPatches<L extends SupportedLanguage>({
	slice,
	lemmaId,
	lexicalRelations,
	morphologicalRelations,
}: {
	slice: NewNoteSlice<L>;
	lemmaId: DumlingId<"Lemma", L>;
	lexicalRelations: LexicalRelations<L>;
	morphologicalRelations: MorphologicalRelations<L>;
}): PlannedChangeOp<L>[] {
	return slice.incomingPendingRelationsForNewLemma.map((relation) => {
		if (relation.relationFamily === "lexical") {
			appendLexicalRelation(
				lexicalRelations,
				inverseRelationFor(relation.relationFamily, relation.relation),
				relation.sourceLemmaId,
			);
			return {
				type: "patchLemma",
				lemmaId: relation.sourceLemmaId,
				ops: [
					{
						kind: "addRelation",
						family: "lexical",
						relation: relation.relation,
						targetLemmaId: lemmaId,
					},
				],
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "lemmaExists", lemmaId: relation.sourceLemmaId },
				],
			};
		}

		appendMorphologicalRelation(
			morphologicalRelations,
			inverseRelationFor(relation.relationFamily, relation.relation),
			relation.sourceLemmaId,
		);
		return {
			type: "patchLemma",
			lemmaId: relation.sourceLemmaId,
			ops: [
				{
					kind: "addRelation",
					family: "morphological",
					relation: relation.relation,
					targetLemmaId: lemmaId,
				},
			],
			preconditions: [
				{ kind: "revisionMatches", revision: slice.revision },
				{ kind: "lemmaExists", lemmaId: relation.sourceLemmaId },
			],
		};
	});
}

function planExplicitExistingRelationPatches<L extends SupportedLanguage>({
	slice,
	request,
	lemmaId,
	lexicalRelations,
	morphologicalRelations,
}: {
	slice: NewNoteSlice<L>;
	request: AddNewNoteRequest<L>;
	lemmaId: DumlingId<"Lemma", L>;
	lexicalRelations: LexicalRelations<L>;
	morphologicalRelations: MorphologicalRelations<L>;
}): PlannedChangeOp<L>[] {
	const explicitExistingRelations =
		request.draft.relations?.filter(
			(relation) => relation.target.kind === "existing",
		) ?? [];

	return explicitExistingRelations.map((relation) => {
		if (relation.target.kind !== "existing") {
			throw new Error("Unexpected pending relation target");
		}

		if (relation.relationFamily === "lexical") {
			appendLexicalRelation(
				lexicalRelations,
				relation.relation,
				relation.target.lemmaId,
			);
			return {
				type: "patchLemma",
				lemmaId: relation.target.lemmaId,
				ops: [
					{
						kind: "addRelation",
						family: "lexical",
						relation: inverseRelationFor(
							relation.relationFamily,
							relation.relation,
						),
						targetLemmaId: lemmaId,
					},
				],
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "lemmaExists", lemmaId: relation.target.lemmaId },
				],
			};
		}

		appendMorphologicalRelation(
			morphologicalRelations,
			relation.relation,
			relation.target.lemmaId,
		);
		return {
			type: "patchLemma",
			lemmaId: relation.target.lemmaId,
			ops: [
				{
					kind: "addRelation",
					family: "morphological",
					relation: inverseRelationFor(
						relation.relationFamily,
						relation.relation,
					),
					targetLemmaId: lemmaId,
				},
			],
			preconditions: [
				{ kind: "revisionMatches", revision: slice.revision },
				{ kind: "lemmaExists", lemmaId: relation.target.lemmaId },
			],
		};
	});
}

function assembleAddNewNoteChanges<L extends SupportedLanguage>({
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
					{
						kind: "pendingRefExists",
						pendingId: relation.targetPendingId,
					},
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

export function planAddNewNote<L extends SupportedLanguage>(
	slice: NewNoteSlice<L>,
	request: AddNewNoteRequest<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	const language = request.draft.lemma.language as L;
	const lemmaId = makeDumlingIdFor(language, request.draft.lemma);
	const pendingLemmaId = derivePendingLemmaId({
		language,
		canonicalLemma: request.draft.lemma.canonicalLemma,
		lemmaKind: request.draft.lemma.lemmaKind,
		lemmaSubKind: request.draft.lemma.lemmaSubKind,
	});

	if (
		request.draft.relations?.some((relation) => {
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
		request.draft.relations?.filter(
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
		request.draft.ownedSurfaces?.map((ownedSurface) => ({
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
		planPendingRelationsAndRefs({ slice, request, language, lemmaId });
	const pickupRelationPatches = planPickupRelationPatches({
		slice,
		lemmaId,
		lexicalRelations,
		morphologicalRelations,
	});
	const inverseRelationPatches = planExplicitExistingRelationPatches({
		slice,
		request,
		lemmaId,
		lexicalRelations,
		morphologicalRelations,
	});

	const lemmaEntry: LemmaEntry<L> = {
		id: lemmaId,
		lemma: request.draft.lemma,
		lexicalRelations,
		morphologicalRelations,
		attestedTranslations: request.draft.note.attestedTranslations,
		attestations: request.draft.note.attestations,
		notes: request.draft.note.notes,
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
