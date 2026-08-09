import {
	inverseRelationFor,
	type LexicalRelations,
	type MorphologicalRelation,
	type MorphologicalRelations,
} from "dumrel";
import type {
	LemmaRecord,
	PendingEntryRef,
	PendingEntryRelation,
	ReadingEntry,
	SurfaceEntry,
} from "../../dto";
import type { Lemma, SupportedLanguage } from "../../dumling";
import { makeSurfaceId } from "../../dumling";
import type { AddNewNoteRequest } from "../../public";
import type { NewNoteSlice } from "../../storage";
import { lemmaKey, readingKey, sameLemma, sameReading } from "../identity";
import { derivePendingEntryId, makePendingEntryRef } from "../pending/identity";
import type { PlannedChangeOp } from "../planned-changes";
import type { PlanMutationRejected, PlanMutationResult } from "./result";

function uniqueBy<T>(values: T[], keyFor: (value: T) => string): T[] {
	const seen = new Set<string>();
	return values.filter((value) => {
		const key = keyFor(value);
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
}

function appendRelation<T extends string, I>(
	relations: Partial<Record<T, I[]>>,
	relation: T,
	target: I,
	keyFor: (value: I) => string,
) {
	const existing = relations[relation] ?? [];
	if (!existing.some((value) => keyFor(value) === keyFor(target))) {
		relations[relation] = [...existing, target];
	}
}

function sourceKeyFor<L extends SupportedLanguage>(
	relation: PendingEntryRelation<L>,
) {
	return relation.relationFamily === "lexical"
		? readingKey(relation.sourceReading)
		: lemmaKey(relation.sourceLemma);
}

function pendingRelationKey<L extends SupportedLanguage>(
	relation: PendingEntryRelation<L>,
) {
	return [
		relation.relationFamily,
		sourceKeyFor(relation),
		relation.relation,
		relation.targetPendingId,
	].join("\0");
}

function makePendingRelations<L extends SupportedLanguage>(
	slice: NewNoteSlice<L>,
	request: AddNewNoteRequest<L>,
): {
	refs: PendingEntryRef<L>[];
	relations: PendingEntryRelation<L>[];
} {
	const existingIds = new Set(
		slice.existingPendingRefsForProposedPendingTargets.map(
			({ pendingId }) => pendingId,
		),
	);
	const refs = new Map<string, PendingEntryRef<L>>();
	const relations = (request.draft.relations ?? [])
		.filter((relation) => relation.target.kind === "pending")
		.map((relation): PendingEntryRelation<L> => {
			if (relation.target.kind !== "pending") {
				throw new Error("Unexpected existing relation target.");
			}
			const ref = makePendingEntryRef({
				language: request.draft.reading.lemma.language as L,
				...relation.target.ref,
			});
			if (!existingIds.has(ref.pendingId)) {
				refs.set(ref.pendingId, ref);
			}
			return relation.relationFamily === "lexical"
				? {
						relationFamily: "lexical",
						sourceReading: request.draft.reading,
						relation: relation.relation,
						targetPendingId: ref.pendingId,
					}
				: {
						relationFamily: "morphological",
						sourceLemma: request.draft.reading.lemma,
						relation: relation.relation,
						targetPendingId: ref.pendingId,
					};
		});
	return {
		refs: Array.from(refs.values()),
		relations: uniqueBy(relations, pendingRelationKey),
	};
}

function selfRelationExists<L extends SupportedLanguage>(
	request: AddNewNoteRequest<L>,
) {
	const { reading } = request.draft;
	const { lemma } = reading;
	const selfPendingId = derivePendingEntryId({
		language: lemma.language as L,
		canonicalForm: lemma.canonicalForm,
		family: lemma.family,
		kind: lemma.kind,
	});
	return (request.draft.relations ?? []).some((relation) => {
		if (relation.target.kind === "pending") {
			return (
				derivePendingEntryId({
					language: lemma.language as L,
					...relation.target.ref,
				}) === selfPendingId
			);
		}
		return relation.relationFamily === "lexical"
			? sameReading(relation.target.reading, reading)
			: sameLemma(relation.target.lemma, lemma);
	});
}

function explicitTargetsArePresent<L extends SupportedLanguage>(
	slice: NewNoteSlice<L>,
	request: AddNewNoteRequest<L>,
) {
	const readings = new Set(
		slice.explicitExistingReadingTargets.map(({ reading }) =>
			readingKey(reading),
		),
	);
	const lemmas = new Set(
		slice.explicitExistingLemmaTargets.map(({ lemma }) => lemmaKey(lemma)),
	);
	return (request.draft.relations ?? []).every((relation) => {
		if (relation.target.kind === "pending") {
			return true;
		}
		return relation.relationFamily === "lexical"
			? readings.has(readingKey(relation.target.reading))
			: lemmas.has(lemmaKey(relation.target.lemma));
	});
}

function relationPatches<L extends SupportedLanguage>(
	slice: NewNoteSlice<L>,
	request: AddNewNoteRequest<L>,
	lexicalRelations: LexicalRelations<L>,
	morphologicalRelations: MorphologicalRelations<L>,
): PlannedChangeOp<L>[] {
	const patches: PlannedChangeOp<L>[] = [];
	const { reading } = request.draft;
	const { lemma } = reading;

	for (const relation of slice.incomingPendingRelationsForNewEntry) {
		if (relation.relationFamily === "lexical") {
			appendRelation(
				lexicalRelations,
				inverseRelationFor("lexical", relation.relation),
				relation.sourceReading,
				readingKey,
			);
			patches.push({
				type: "patchReading",
				reading: relation.sourceReading,
				ops: [
					{
						kind: "addRelation",
						relation: relation.relation,
						targetReading: reading,
					},
				],
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{
						kind: "readingExists",
						reading: relation.sourceReading,
					},
				],
			});
		} else {
			appendRelation(
				morphologicalRelations,
				inverseRelationFor("morphological", relation.relation),
				relation.sourceLemma,
				lemmaKey,
			);
			patches.push({
				type: "patchLemma",
				lemma: relation.sourceLemma,
				ops: [
					{
						kind: "addRelation",
						relation: relation.relation,
						targetLemma: lemma,
					},
				],
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{
						kind: "lemmaExists",
						lemma: relation.sourceLemma,
					},
				],
			});
		}
	}

	for (const relation of request.draft.relations ?? []) {
		if (relation.target.kind !== "existing") {
			continue;
		}
		if (relation.relationFamily === "lexical") {
			appendRelation(
				lexicalRelations,
				relation.relation,
				relation.target.reading,
				readingKey,
			);
			patches.push({
				type: "patchReading",
				reading: relation.target.reading,
				ops: [
					{
						kind: "addRelation",
						relation: inverseRelationFor(
							"lexical",
							relation.relation,
						),
						targetReading: reading,
					},
				],
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{
						kind: "readingExists",
						reading: relation.target.reading,
					},
				],
			});
		} else {
			appendRelation(
				morphologicalRelations,
				relation.relation,
				relation.target.lemma,
				lemmaKey,
			);
			patches.push({
				type: "patchLemma",
				lemma: relation.target.lemma,
				ops: [
					{
						kind: "addRelation",
						relation: inverseRelationFor(
							"morphological",
							relation.relation,
						),
						targetLemma: lemma,
					},
				],
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{
						kind: "lemmaExists",
						lemma: relation.target.lemma,
					},
				],
			});
		}
	}
	return patches;
}

export function planAddNewNote<L extends SupportedLanguage>(
	slice: NewNoteSlice<L>,
	request: AddNewNoteRequest<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	const { reading, note } = request.draft;
	const { lemma } = reading;
	if (selfRelationExists(request)) {
		return {
			status: "rejected",
			code: "selfRelation",
			message: "A Reading or Lemma cannot relate to itself.",
		};
	}
	if (slice.existingReading) {
		return {
			status: "rejected",
			code: "readingAlreadyExists",
			message: "Reading already exists.",
		};
	}
	if (slice.existingOwnedSurfaces.length > 0) {
		return {
			status: "rejected",
			code: "ownedSurfaceAlreadyExists",
			message: "An owned surface already exists.",
		};
	}
	if (!explicitTargetsArePresent(slice, request)) {
		return {
			status: "rejected",
			code: "relationTargetMissing",
			message: "An explicit relation target is missing.",
		};
	}

	const lexicalRelations: LexicalRelations<L> = {};
	const morphologicalRelations: MorphologicalRelations<L> = {};
	const patches = relationPatches(
		slice,
		request,
		lexicalRelations,
		morphologicalRelations,
	);
	const storedReading: ReadingEntry<L> = {
		reading,
		lexicalRelations,
		...note,
	};
	const lemmaRecord: LemmaRecord<L> = {
		lemma,
		morphologicalRelations,
	};
	const ownedSurfaceEntries: SurfaceEntry<L>[] = uniqueBy(
		(request.draft.ownedSurfaces ?? []).map(({ surface, note }) => ({
			id: makeSurfaceId(lemma.language as L, surface),
			surface,
			ownerLemma: lemma,
			...note,
		})),
		({ id }) => id,
	);
	const pending = makePendingRelations(slice, request);

	const changes: PlannedChangeOp<L>[] = [];
	if (!slice.existingLemma) {
		changes.push({
			type: "createLemma",
			record: lemmaRecord,
			preconditions: [
				{ kind: "revisionMatches", revision: slice.revision },
				{
					kind: "lemmaMissing",
					lemma,
				},
			],
		});
	} else {
		for (const [relation, targetIds] of Object.entries(
			morphologicalRelations,
		) as [MorphologicalRelation, Lemma<L>[]][]) {
			for (const targetLemma of targetIds) {
				changes.push({
					type: "patchLemma",
					lemma,
					ops: [
						{
							kind: "addRelation",
							relation,
							targetLemma,
						},
					],
					preconditions: [
						{ kind: "revisionMatches", revision: slice.revision },
						{
							kind: "lemmaExists",
							lemma,
						},
					],
				});
			}
		}
	}

	changes.push(
		{
			type: "createReading",
			entry: storedReading,
			preconditions: [
				{ kind: "revisionMatches", revision: slice.revision },
				{
					kind: "lemmaExists",
					lemma,
				},
				{ kind: "readingMissing", reading },
			],
		},
		...patches,
		...pending.refs.map(
			(ref): PlannedChangeOp<L> => ({
				type: "createPendingRef",
				ref,
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "pendingRefMissing", pendingId: ref.pendingId },
				],
			}),
		),
		...pending.relations.map(
			(relation): PlannedChangeOp<L> => ({
				type: "createPendingRelation",
				relation,
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{
						kind: "pendingRefExists",
						pendingId: relation.targetPendingId,
					},
					{ kind: "pendingRelationMissing", relation },
				],
			}),
		),
		...slice.incomingPendingRelationsForNewEntry.map(
			(relation): PlannedChangeOp<L> => ({
				type: "deletePendingRelation",
				relation,
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "pendingRelationExists", relation },
				],
			}),
		),
		...slice.matchingPendingRefsForNewEntry.map(
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
					{
						kind: "lemmaExists",
						lemma,
					},
					{ kind: "surfaceMissing", surfaceId: entry.id },
				],
			}),
		),
	);

	return {
		status: "planned",
		baseRevision: slice.revision,
		changes,
		affected: {
			lemmas: [lemma],
			readings: [reading],
			surfaceIds: ownedSurfaceEntries.map(({ id }) => id),
			pendingIds: [
				...pending.refs.map(({ pendingId }) => pendingId),
				...slice.matchingPendingRefsForNewEntry.map(
					({ pendingId }) => pendingId,
				),
			],
		},
		summary: { message: "Added new learner reading." },
	};
}
