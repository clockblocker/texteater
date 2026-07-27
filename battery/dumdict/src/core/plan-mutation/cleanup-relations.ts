import type {
	LemmaEntry,
	LexicalRelation,
	MorphologicalRelation,
	PendingLemmaRelation,
} from "../../dto";
import type { SupportedLanguage } from "../../dumling";
import type { CleanupRelationsSlice } from "../../storage";
import { relationFamilyFor } from "../relations/family";
import { inverseRelationFor } from "../relations/inverse-rules";
import type {
	CleanupRelationsIntent,
	PlanMutationRejected,
	PlanMutationResult,
} from "./result";

function relationKey<L extends SupportedLanguage>(
	relation: Pick<
		PendingLemmaRelation<L>,
		"sourceLemmaId" | "relation" | "targetPendingId"
	>,
) {
	return `${relation.sourceLemmaId}:${relation.relation}:${relation.targetPendingId}`;
}

function lemmaMatchesPendingRef<L extends SupportedLanguage>(
	lemma: LemmaEntry<L>,
	pendingRef: CleanupRelationsSlice<L>["pendingRefs"][number],
) {
	return (
		lemma.lemma.canonicalLemma === pendingRef.canonicalLemma &&
		lemma.lemma.lemmaKind === pendingRef.lemmaKind &&
		lemma.lemma.lemmaSubKind === pendingRef.lemmaSubKind
	);
}

function lexicalPendingRelation<L extends SupportedLanguage>(
	sourceLemmaId: PendingLemmaRelation<L>["sourceLemmaId"],
	relation: LexicalRelation,
	targetPendingId: CleanupRelationsSlice<L>["pendingRefs"][number]["pendingId"],
): Extract<PendingLemmaRelation<L>, { relationFamily: "lexical" }> {
	return {
		sourceLemmaId,
		relationFamily: "lexical",
		relation,
		targetPendingId,
	};
}

function morphologicalPendingRelation<L extends SupportedLanguage>(
	sourceLemmaId: PendingLemmaRelation<L>["sourceLemmaId"],
	relation: MorphologicalRelation,
	targetPendingId: CleanupRelationsSlice<L>["pendingRefs"][number]["pendingId"],
): Extract<PendingLemmaRelation<L>, { relationFamily: "morphological" }> {
	return {
		sourceLemmaId,
		relationFamily: "morphological",
		relation,
		targetPendingId,
	};
}

export function planCleanupRelations<L extends SupportedLanguage>(
	slice: CleanupRelationsSlice<L>,
	intent: CleanupRelationsIntent<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	const resolutionKeys = intent.resolutions.map((resolution) =>
		relationKey({
			sourceLemmaId: resolution.sourceLemmaId,
			relation: resolution.relation,
			targetPendingId: resolution.targetPendingId,
		}),
	);
	if (new Set(resolutionKeys).size !== resolutionKeys.length) {
		return {
			status: "rejected",
			code: "invalidRequest",
			message: "Duplicate cleanup resolutions are not allowed.",
		};
	}

	const pendingRefsById = new Map(
		slice.pendingRefs.map((pendingRef) => [pendingRef.pendingId, pendingRef] as const),
	);
	const targetLemmasById = new Map(
		slice.targetLemmas.map((lemma) => [lemma.id, lemma] as const),
	);
	const incomingCountsByPendingId = new Map<string, number>();
	for (const relation of slice.pendingRelations) {
		incomingCountsByPendingId.set(
			relation.targetPendingId,
			(incomingCountsByPendingId.get(relation.targetPendingId) ?? 0) + 1,
		);
	}

	for (const resolution of intent.resolutions) {
		if (resolution.targetLemmaId === resolution.sourceLemmaId) {
			return {
				status: "rejected",
				code: "selfRelation",
				message: "A lemma cannot relate to itself.",
			};
		}

		if (!resolution.targetLemmaId) {
			continue;
		}

		const pendingRef = pendingRefsById.get(resolution.targetPendingId);
		if (!pendingRef) {
			continue;
		}
		const targetLemma = targetLemmasById.get(resolution.targetLemmaId);
		if (!targetLemma) {
			continue;
		}

		if (!lemmaMatchesPendingRef(targetLemma, pendingRef)) {
			return {
				status: "rejected",
				code: "invalidRequest",
				message:
					"Cleanup target lemma must match the pending ref identity tuple.",
			};
		}
	}

	const changes: PlanMutationResult<L>["changes"] = [];
	const affectedLemmaIds = new Set<string>();
	const affectedPendingIds = new Set<string>();

	for (const resolution of intent.resolutions) {
		const family = relationFamilyFor(resolution.relation);
		if (family === "lexical") {
			const relation = resolution.relation as LexicalRelation;
			const pendingRelation = lexicalPendingRelation(
				resolution.sourceLemmaId,
				relation,
				resolution.targetPendingId,
			);

			if (resolution.targetLemmaId) {
				changes.push({
					type: "patchLemma",
					lemmaId: resolution.sourceLemmaId,
					ops: [
						{
							kind: "addRelation",
							family,
							relation,
							targetLemmaId: resolution.targetLemmaId,
						},
					],
					preconditions: [
						{ kind: "revisionMatches", revision: slice.revision },
						{ kind: "lemmaExists", lemmaId: resolution.sourceLemmaId },
						{ kind: "lemmaExists", lemmaId: resolution.targetLemmaId },
					],
				});
				changes.push({
					type: "patchLemma",
					lemmaId: resolution.targetLemmaId,
					ops: [
						{
							kind: "addRelation",
							family,
							relation: inverseRelationFor(family, relation),
							targetLemmaId: resolution.sourceLemmaId,
						},
					],
					preconditions: [
						{ kind: "revisionMatches", revision: slice.revision },
						{ kind: "lemmaExists", lemmaId: resolution.targetLemmaId },
						{ kind: "lemmaExists", lemmaId: resolution.sourceLemmaId },
					],
				});
				affectedLemmaIds.add(resolution.targetLemmaId);
			}

			changes.push({
				type: "deletePendingRelation",
				relation: pendingRelation,
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "pendingRelationExists", relation: pendingRelation },
				],
			});
		} else {
			const relation = resolution.relation as MorphologicalRelation;
			const pendingRelation = morphologicalPendingRelation(
				resolution.sourceLemmaId,
				relation,
				resolution.targetPendingId,
			);

			if (resolution.targetLemmaId) {
				changes.push({
					type: "patchLemma",
					lemmaId: resolution.sourceLemmaId,
					ops: [
						{
							kind: "addRelation",
							family,
							relation,
							targetLemmaId: resolution.targetLemmaId,
						},
					],
					preconditions: [
						{ kind: "revisionMatches", revision: slice.revision },
						{ kind: "lemmaExists", lemmaId: resolution.sourceLemmaId },
						{ kind: "lemmaExists", lemmaId: resolution.targetLemmaId },
					],
				});
				changes.push({
					type: "patchLemma",
					lemmaId: resolution.targetLemmaId,
					ops: [
						{
							kind: "addRelation",
							family,
							relation: inverseRelationFor(family, relation),
							targetLemmaId: resolution.sourceLemmaId,
						},
					],
					preconditions: [
						{ kind: "revisionMatches", revision: slice.revision },
						{ kind: "lemmaExists", lemmaId: resolution.targetLemmaId },
						{ kind: "lemmaExists", lemmaId: resolution.sourceLemmaId },
					],
				});
				affectedLemmaIds.add(resolution.targetLemmaId);
			}

			changes.push({
				type: "deletePendingRelation",
				relation: pendingRelation,
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "pendingRelationExists", relation: pendingRelation },
				],
			});
		}

		affectedLemmaIds.add(resolution.sourceLemmaId);
		affectedPendingIds.add(resolution.targetPendingId);
		incomingCountsByPendingId.set(
			resolution.targetPendingId,
			(incomingCountsByPendingId.get(resolution.targetPendingId) ?? 0) - 1,
		);
	}

	for (const pendingId of affectedPendingIds) {
		if ((incomingCountsByPendingId.get(pendingId) ?? 0) > 0) {
			continue;
		}

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

	return {
		status: "planned",
		baseRevision: slice.revision,
		intent,
		changes,
		affected: {
			lemmaIds:
				affectedLemmaIds.size > 0
					? Array.from(affectedLemmaIds) as PlanMutationResult<L>["affected"]["lemmaIds"]
					: undefined,
			pendingIds:
				affectedPendingIds.size > 0 ? Array.from(affectedPendingIds) : undefined,
		},
		summary: {
			message:
				intent.resolutions.length === 1
					? "Cleaned up 1 relation."
					: `Cleaned up ${intent.resolutions.length} relations.`,
		},
	};
}
