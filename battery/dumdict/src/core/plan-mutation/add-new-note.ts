import { readingFingerprint } from "dumling/id";
import type { Lemma, SupportedLanguage } from "dumling/types";
import type { DirectSemanticRelation, ReadingKnowledge } from "dumrel/types";
import type {
	LemmaRecord,
	PendingSemanticRelationRecord,
	ReadingEntry,
	SurfaceEntry,
} from "../../dto";
import { makeSurfaceId } from "../../dumling-id";
import {
	parsePendingSemanticRelationForDumdictRuntime,
	unwrapDumdictParse,
} from "../../parsing/lightweight-parsers";
import type { AddNewNoteRequest } from "../../public";
import type { NewNoteSlice } from "../../storage";
import { lemmaFingerprint, sameLemma, sameReading } from "../identity";
import { derivePendingEntryId } from "../pending/identity";
import {
	planRelationMaintenance,
	type RelationRequest,
} from "../plan-relation-maintenance";
import type { PlannedChangeOp } from "../planned-changes";
import { relationAdditionsToPatches } from "./relation-additions-to-patches";
import { relationRemovalsToPatches } from "./relation-removals-to-patches";
import type { PlanMutationRejected, PlanMutationResult } from "./result";

function uniqueBy<T>(values: T[], keyFor: (value: T) => string): T[] {
	const seen = new Set<string>();
	return values.filter((value) => {
		const key = keyFor(value);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function appendRelation<L extends SupportedLanguage>(
	knowledge: ReadingKnowledge<string, Lemma<L>>,
	relation: DirectSemanticRelation,
	target: Lemma<L>,
) {
	const semanticRelations = knowledge.semanticRelations ?? {};
	const existing = semanticRelations[relation] ?? [];
	if (!existing.some((value) => sameLemma(value, target)))
		semanticRelations[relation] = [...existing, target];
	knowledge.semanticRelations = semanticRelations;
}

function pendingRecordKey<L extends SupportedLanguage>(
	record: PendingSemanticRelationRecord<L>,
) {
	const { sourceReadingKey, relation, targetPendingId } = record.locator;
	return `${sourceReadingKey}\0${relation}\0${targetPendingId}`;
}

function makePendingRecords<L extends SupportedLanguage>(
	slice: NewNoteSlice<L>,
	request: AddNewNoteRequest<L>,
): PendingSemanticRelationRecord<L>[] {
	const existing = new Set(
		slice.existingPendingRelationsForProposedPendingTargets.map(
			pendingRecordKey,
		),
	);
	return uniqueBy(
		(request.draft.relations ?? []).flatMap((relation) => {
			if (relation.target.kind !== "pending") return [];
			const pending = unwrapDumdictParse(
				parsePendingSemanticRelationForDumdictRuntime(
					relation.target.pending,
				),
			) as unknown as PendingSemanticRelationRecord<L>["pending"];
			const targetPendingId = derivePendingEntryId(
				pending.target as Parameters<typeof derivePendingEntryId<L>>[0],
			);
			const record: PendingSemanticRelationRecord<L> = {
				sourceReading: request.draft.reading,
				pending,
				locator: {
					sourceReadingKey: readingFingerprint(request.draft.reading),
					relation: pending.relation,
					targetPendingId,
				},
			};
			return existing.has(pendingRecordKey(record)) ? [] : [record];
		}),
		pendingRecordKey,
	);
}

function relationLanguagesMatch<L extends SupportedLanguage>(
	request: AddNewNoteRequest<L>,
) {
	const language = request.draft.reading.lemma.language;
	return (request.draft.relations ?? []).every((relation) =>
		relation.target.kind === "existing"
			? relation.target.lemma.language === language
			: unwrapDumdictParse(
					parsePendingSemanticRelationForDumdictRuntime(
						relation.target.pending,
					),
				).target.language === language,
	);
}

function explicitTargetsArePresent<L extends SupportedLanguage>(
	slice: NewNoteSlice<L>,
	request: AddNewNoteRequest<L>,
) {
	const lemmas = new Set(
		slice.explicitExistingLemmaTargets.map(({ lemma }) =>
			lemmaFingerprint(lemma),
		),
	);
	return (request.draft.relations ?? []).every(
		(relation) =>
			relation.target.kind === "pending" ||
			lemmas.has(lemmaFingerprint(relation.target.lemma)),
	);
}

export function planAddNewNote<L extends SupportedLanguage>(
	slice: NewNoteSlice<L>,
	request: AddNewNoteRequest<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	const { reading, note } = request.draft;
	const { lemma } = reading;
	if (!relationLanguagesMatch(request))
		return {
			status: "rejected",
			code: "invalidDraft",
			message:
				"Semantic Relation endpoints must use the source Reading language.",
		};
	if (
		(request.draft.relations ?? []).some(
			(relation) =>
				relation.target.kind === "existing" &&
				sameLemma(relation.target.lemma, lemma),
		)
	)
		return {
			status: "rejected",
			code: "selfRelation",
			message: "A Reading cannot relate directly to its own Lemma.",
		};
	if (slice.existingReading)
		return {
			status: "rejected",
			code: "readingAlreadyExists",
			message: "Reading already exists.",
		};
	if (slice.existingOwnedSurfaces.length > 0)
		return {
			status: "rejected",
			code: "ownedSurfaceAlreadyExists",
			message: "An owned surface already exists.",
		};
	if (!explicitTargetsArePresent(slice, request))
		return {
			status: "rejected",
			code: "relationTargetMissing",
			message: "An explicit relation target Lemma is missing.",
		};

	const baseReading: ReadingEntry<L> = { reading, ...note };
	const lemmaRecord: LemmaRecord<L> = { lemma };
	const ownedSurfaceEntries: SurfaceEntry<L>[] = uniqueBy(
		(request.draft.ownedSurfaces ?? []).map(
			({ surface, note: surfaceNote }) => ({
				id: makeSurfaceId(lemma.language as L, surface),
				surface,
				ownerLemma: lemma,
				...surfaceNote,
			}),
		),
		({ id }) => id,
	);
	const newPending = makePendingRecords(slice, request);
	const pending = uniqueBy(
		[...newPending, ...slice.pendingRelationsMatchingProposedLemma],
		pendingRecordKey,
	);
	const requests: RelationRequest<L>[] = [
		...(request.draft.relations ?? []).flatMap((relation) =>
			relation.target.kind === "existing" && "relation" in relation
				? [
						{
							sourceReading: reading,
							relation: relation.relation,
							target: {
								kind: "lemma" as const,
								lemma: relation.target.lemma,
							},
						},
					]
				: [],
		),
		...pending.map((record) => ({
			sourceReading: record.sourceReading,
			relation: record.pending.relation,
			target: {
				kind: "shadow" as const,
				shadow: record.pending.target,
				pendingRecord: record,
			},
		})),
	];
	const relationPlan = planRelationMaintenance({
		lemmas: [
			...slice.relationLemmas,
			...(slice.existingLemma ? [] : [lemmaRecord]),
		],
		readings: [...slice.relationReadings, baseReading],
		requests,
	});
	if (relationPlan.status === "rejected") return relationPlan;

	const knowledge: ReadingKnowledge<string, Lemma<L>> = {};
	for (const addition of relationPlan.additions) {
		if (sameReading(addition.reading, reading))
			appendRelation(knowledge, addition.relation, addition.targetLemma);
	}
	const storedReading: ReadingEntry<L> = {
		...baseReading,
		...(Object.keys(knowledge).length === 0 ? {} : { knowledge }),
	};
	const patches = [
		...relationRemovalsToPatches(
			relationPlan.removals,
			slice.relationReadings,
			slice.revision,
		),
		...relationAdditionsToPatches(
			relationPlan.additions.filter(
				(addition) => !sameReading(addition.reading, reading),
			),
			slice.revision,
		),
	];
	const newPendingKeys = new Set(newPending.map(pendingRecordKey));
	const pendingToCreate = relationPlan.unresolvedPending.filter((record) =>
		newPendingKeys.has(pendingRecordKey(record)),
	);
	const pendingToDelete = relationPlan.resolvedPending.filter(
		(record) => !newPendingKeys.has(pendingRecordKey(record)),
	);

	const changes: PlannedChangeOp<L>[] = [];
	if (!slice.existingLemma)
		changes.push({
			type: "createLemma",
			record: lemmaRecord,
			preconditions: [
				{ kind: "revisionMatches", revision: slice.revision },
				{ kind: "lemmaMissing", lemma },
			],
		});
	changes.push(
		{
			type: "createReading",
			entry: storedReading,
			preconditions: [
				{ kind: "revisionMatches", revision: slice.revision },
				{ kind: "lemmaExists", lemma },
				{ kind: "readingMissing", reading },
			],
		},
		...patches,
		...pendingToDelete.map(
			(record): PlannedChangeOp<L> => ({
				type: "deletePendingSemanticRelation",
				record,
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "pendingRelationExists", record },
				],
			}),
		),
		...pendingToCreate.map(
			(record): PlannedChangeOp<L> => ({
				type: "createPendingSemanticRelation",
				record,
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "pendingRelationMissing", record },
				],
			}),
		),
		...ownedSurfaceEntries.map(
			(entry): PlannedChangeOp<L> => ({
				type: "createOwnedSurface",
				entry,
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "lemmaExists", lemma },
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
			readings: uniqueBy(
				[
					reading,
					...relationPlan.additions.map(({ reading }) => reading),
				],
				readingFingerprint,
			),
			surfaceIds: ownedSurfaceEntries.map(({ id }) => id),
			pendingIds: [...pendingToCreate, ...pendingToDelete].map(
				({ locator }) => locator.targetPendingId,
			),
		},
		summary: { message: "Added new learner reading." },
	};
}
