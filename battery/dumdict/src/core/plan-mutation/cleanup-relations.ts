import type { PendingEntryRef, PendingEntryRelation, Reading } from "../../dto";
import type { Lemma, SupportedLanguage } from "../../dumling";
import type {
	CleanupRelationResolution,
	CleanupRelationsRequest,
} from "../../public";
import type { CleanupRelationsSlice } from "../../storage";
import { lemmaKey, readingKey, sameLemma, sameReading } from "../identity";
import { inverseRelationFor } from "../relations/rules";
import type { PlanMutationRejected, PlanMutationResult } from "./result";

function sourceKeyFor<L extends SupportedLanguage>(
	value: PendingEntryRelation<L> | CleanupRelationResolution<L>,
) {
	return value.relationFamily === "lexical"
		? readingKey(value.sourceReading)
		: lemmaKey(value.sourceLemma);
}

function relationKey<L extends SupportedLanguage>(
	value: PendingEntryRelation<L> | CleanupRelationResolution<L>,
) {
	return [
		value.relationFamily,
		sourceKeyFor(value),
		value.relation,
		value.targetPendingId,
	].join("\0");
}

function entryMatchesPendingRef(
	entry: Lemma<SupportedLanguage>,
	pendingRef: PendingEntryRef<SupportedLanguage>,
) {
	return (
		entry.language === pendingRef.language &&
		entry.canonicalForm === pendingRef.canonicalForm &&
		entry.family === pendingRef.family &&
		entry.kind === pendingRef.kind
	);
}

export function planCleanupRelations<L extends SupportedLanguage>(
	slice: CleanupRelationsSlice<L>,
	request: CleanupRelationsRequest<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	const keys = request.resolutions.map(relationKey);
	if (new Set(keys).size !== keys.length) {
		return {
			status: "rejected",
			code: "invalidRequest",
			message: "Duplicate cleanup resolutions are not allowed.",
		};
	}

	const pendingRefsById = new Map(
		slice.pendingRefs.map((ref) => [ref.pendingId, ref] as const),
	);
	const targetReadingsByKey = new Map(
		slice.targetReadings.map((target) => [
			readingKey(target.reading.reading),
			target,
		]),
	);
	const targetLemmasByKey = new Map(
		slice.targetLemmas.map((record) => [lemmaKey(record.lemma), record]),
	);
	const incomingCounts = new Map<string, number>();
	for (const relation of slice.pendingRelations) {
		incomingCounts.set(
			relation.targetPendingId,
			(incomingCounts.get(relation.targetPendingId) ?? 0) + 1,
		);
	}

	for (const resolution of request.resolutions) {
		const pendingRef = pendingRefsById.get(resolution.targetPendingId);
		if (!pendingRef) {
			continue;
		}
		if (resolution.relationFamily === "lexical") {
			if (
				resolution.targetReading &&
				sameReading(resolution.targetReading, resolution.sourceReading)
			) {
				return {
					status: "rejected",
					code: "selfRelation",
					message: "A reading cannot relate to itself.",
				};
			}
			const target =
				resolution.targetReading &&
				targetReadingsByKey.get(readingKey(resolution.targetReading));
			if (
				target &&
				!entryMatchesPendingRef(target.lemma.lemma, pendingRef)
			) {
				return {
					status: "rejected",
					code: "invalidRequest",
					message:
						"Cleanup target Reading must belong to a Lemma matching the pending description.",
				};
			}
		} else {
			if (
				resolution.targetLemma &&
				sameLemma(resolution.targetLemma, resolution.sourceLemma)
			) {
				return {
					status: "rejected",
					code: "selfRelation",
					message: "A Lemma cannot relate to itself.",
				};
			}
			const target =
				resolution.targetLemma &&
				targetLemmasByKey.get(lemmaKey(resolution.targetLemma));
			if (target && !entryMatchesPendingRef(target.lemma, pendingRef)) {
				return {
					status: "rejected",
					code: "invalidRequest",
					message:
						"Cleanup target Lemma must match the pending description.",
				};
			}
		}
	}

	const changes: PlanMutationResult<L>["changes"] = [];
	const affectedReadings = new Map<string, Reading<L>>();
	const affectedLemmas = new Map<string, Lemma<L>>();
	const affectedPendingIds = new Set<string>();

	for (const resolution of request.resolutions) {
		if (resolution.relationFamily === "lexical") {
			const pendingRelation: Extract<
				PendingEntryRelation<L>,
				{ relationFamily: "lexical" }
			> = {
				relationFamily: "lexical",
				sourceReading: resolution.sourceReading,
				relation: resolution.relation,
				targetPendingId: resolution.targetPendingId,
			};
			if (resolution.targetReading) {
				const target = resolution.targetReading;
				changes.push(
					{
						type: "patchReading",
						reading: resolution.sourceReading,
						ops: [
							{
								kind: "addRelation",
								relation: resolution.relation,
								targetReading: target,
							},
						],
						preconditions: [
							{
								kind: "revisionMatches",
								revision: slice.revision,
							},
							{
								kind: "readingExists",
								reading: resolution.sourceReading,
							},
							{ kind: "readingExists", reading: target },
						],
					},
					{
						type: "patchReading",
						reading: target,
						ops: [
							{
								kind: "addRelation",
								relation: inverseRelationFor(
									"lexical",
									resolution.relation,
								),
								targetReading: resolution.sourceReading,
							},
						],
						preconditions: [
							{
								kind: "revisionMatches",
								revision: slice.revision,
							},
							{ kind: "readingExists", reading: target },
						],
					},
				);
				affectedReadings.set(readingKey(target), target);
			}
			changes.push({
				type: "deletePendingRelation",
				relation: pendingRelation,
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{
						kind: "pendingRelationExists",
						relation: pendingRelation,
					},
				],
			});
			affectedReadings.set(
				readingKey(resolution.sourceReading),
				resolution.sourceReading,
			);
		} else {
			const pendingRelation: Extract<
				PendingEntryRelation<L>,
				{ relationFamily: "morphological" }
			> = {
				relationFamily: "morphological",
				sourceLemma: resolution.sourceLemma,
				relation: resolution.relation,
				targetPendingId: resolution.targetPendingId,
			};
			if (resolution.targetLemma) {
				const target = resolution.targetLemma;
				changes.push(
					{
						type: "patchLemma",
						lemma: resolution.sourceLemma,
						ops: [
							{
								kind: "addRelation",
								relation: resolution.relation,
								targetLemma: target,
							},
						],
						preconditions: [
							{
								kind: "revisionMatches",
								revision: slice.revision,
							},
							{
								kind: "lemmaExists",
								lemma: resolution.sourceLemma,
							},
							{
								kind: "lemmaExists",
								lemma: target,
							},
						],
					},
					{
						type: "patchLemma",
						lemma: target,
						ops: [
							{
								kind: "addRelation",
								relation: inverseRelationFor(
									"morphological",
									resolution.relation,
								),
								targetLemma: resolution.sourceLemma,
							},
						],
						preconditions: [
							{
								kind: "revisionMatches",
								revision: slice.revision,
							},
							{
								kind: "lemmaExists",
								lemma: target,
							},
						],
					},
				);
				affectedLemmas.set(lemmaKey(target), target);
			}
			changes.push({
				type: "deletePendingRelation",
				relation: pendingRelation,
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{
						kind: "pendingRelationExists",
						relation: pendingRelation,
					},
				],
			});
			affectedLemmas.set(
				lemmaKey(resolution.sourceLemma),
				resolution.sourceLemma,
			);
		}

		affectedPendingIds.add(resolution.targetPendingId);
		incomingCounts.set(
			resolution.targetPendingId,
			(incomingCounts.get(resolution.targetPendingId) ?? 0) - 1,
		);
	}

	for (const pendingId of affectedPendingIds) {
		if ((incomingCounts.get(pendingId) ?? 0) === 0) {
			changes.push({
				type: "deletePendingRef",
				pendingId,
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "pendingRefExists", pendingId },
					{ kind: "pendingRefHasNoIncomingRelations", pendingId },
				],
			});
		}
	}

	return {
		status: "planned",
		baseRevision: slice.revision,
		changes,
		affected: {
			readings:
				affectedReadings.size > 0
					? Array.from(affectedReadings.values())
					: undefined,
			lemmas:
				affectedLemmas.size > 0
					? Array.from(affectedLemmas.values())
					: undefined,
			pendingIds:
				affectedPendingIds.size > 0
					? Array.from(affectedPendingIds)
					: undefined,
		},
		summary: {
			message:
				request.resolutions.length === 1
					? "Cleaned up 1 relation."
					: `Cleaned up ${request.resolutions.length} relations.`,
		},
	};
}
