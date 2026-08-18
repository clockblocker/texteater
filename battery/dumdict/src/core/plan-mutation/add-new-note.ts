import { readingFingerprint } from "dumling";
import {
	inverseRelationFor,
	pendingSemanticRelationSchema,
	type ReadingKnowledge,
	type SemanticRelation,
} from "dumrel";
import type {
	LemmaRecord,
	PendingSemanticRelationRecord,
	Reading,
	ReadingEntry,
	SurfaceEntry,
} from "../../dto";
import type { SupportedLanguage } from "../../dumling";
import { makeSurfaceId } from "../../dumling";
import type { AddNewNoteRequest } from "../../public";
import type { NewNoteSlice } from "../../storage";
import { sameReading } from "../identity";
import { derivePendingEntryId } from "../pending/identity";
import type { PlannedChangeOp } from "../planned-changes";
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
	knowledge: ReadingKnowledge<string, Reading<L>>,
	relation: SemanticRelation,
	target: Reading<L>,
) {
	const semanticRelations = knowledge.semanticRelations ?? {};
	const existing = semanticRelations[relation] ?? [];
	if (!existing.some((value) => sameReading(value, target))) {
		semanticRelations[relation] = [...existing, target];
	}
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
			const pending = pendingSemanticRelationSchema.parse(
				relation.target.pending,
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

function selfRelationExists<L extends SupportedLanguage>(
	request: AddNewNoteRequest<L>,
) {
	const source = request.draft.reading;
	return (request.draft.relations ?? []).some(
		(relation) =>
			relation.target.kind === "existing" &&
			sameReading(relation.target.reading, source),
	);
}

function relationLanguagesMatch<L extends SupportedLanguage>(
	request: AddNewNoteRequest<L>,
) {
	const language = request.draft.reading.lemma.language;
	return (request.draft.relations ?? []).every((relation) =>
		relation.target.kind === "existing"
			? relation.target.reading.lemma.language === language
			: pendingSemanticRelationSchema.parse(relation.target.pending)
					.target.language === language,
	);
}

function explicitTargetsArePresent<L extends SupportedLanguage>(
	slice: NewNoteSlice<L>,
	request: AddNewNoteRequest<L>,
) {
	const readings = new Set(
		slice.explicitExistingReadingTargets.map(({ reading }) =>
			readingFingerprint(reading),
		),
	);
	return (request.draft.relations ?? []).every(
		(relation) =>
			relation.target.kind === "pending" ||
			readings.has(readingFingerprint(relation.target.reading)),
	);
}

export function planAddNewNote<L extends SupportedLanguage>(
	slice: NewNoteSlice<L>,
	request: AddNewNoteRequest<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	const { reading, note } = request.draft;
	const { lemma } = reading;
	if (!relationLanguagesMatch(request)) {
		return {
			status: "rejected",
			code: "invalidDraft",
			message:
				"Semantic Relation endpoints must use the source Reading language.",
		};
	}
	if (selfRelationExists(request)) {
		return {
			status: "rejected",
			code: "selfRelation",
			message: "A Reading cannot relate directly to itself.",
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

	const knowledge: ReadingKnowledge<string, Reading<L>> = {};
	const patches: PlannedChangeOp<L>[] = [];
	for (const relation of request.draft.relations ?? []) {
		if (!("relation" in relation) || relation.target.kind !== "existing")
			continue;
		appendRelation(knowledge, relation.relation, relation.target.reading);
		patches.push({
			type: "patchReading",
			reading: relation.target.reading,
			ops: [
				{
					kind: "applyKnowledgeChange",
					envelope: {
						owner: {
							kind: "Reading",
							reading: relation.target.reading,
						},
						change: {
							kind: "Contribute",
							aspect: "semanticRelations",
							relation: inverseRelationFor(relation.relation),
							value: [reading],
						},
					},
				},
			],
			preconditions: [
				{ kind: "revisionMatches", revision: slice.revision },
				{ kind: "readingExists", reading: relation.target.reading },
			],
		});
	}

	const storedReading: ReadingEntry<L> = {
		reading,
		...(Object.keys(knowledge).length === 0 ? {} : { knowledge }),
		...note,
	};
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
	const pending = makePendingRecords(slice, request);

	const changes: PlannedChangeOp<L>[] = [];
	if (!slice.existingLemma) {
		changes.push({
			type: "createLemma",
			record: lemmaRecord,
			preconditions: [
				{ kind: "revisionMatches", revision: slice.revision },
				{ kind: "lemmaMissing", lemma },
			],
		});
	}
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
		...pending.map(
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
			readings: [reading],
			surfaceIds: ownedSurfaceEntries.map(({ id }) => id),
			pendingIds: pending.map(({ locator }) => locator.targetPendingId),
		},
		summary: { message: "Added new learner reading." },
	};
}
