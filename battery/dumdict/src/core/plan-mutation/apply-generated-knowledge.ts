import {
	lemmaIdentityKey,
	readingIdentityKey,
	sameLemma,
	sameReading,
} from "dumling";
import type * as Dumling from "dumling/types";
import type {
	PendingSemanticRelationRecord,
	PlannedChangeOp,
	ReadingPatchOp,
} from "../../domain-types";
import { parsePendingSemanticRelationInLanguage } from "../../parsing/lightweight-parsers";
import type { ApplyGeneratedKnowledgeRequest } from "../../public";
import type { ApplyGeneratedKnowledgeContext } from "../../storage";
import { applyDumdictKnowledgeChanges } from "../apply-reading-knowledge-change.js";
import { lemmaLanguage, readingLemma } from "../identity";
import {
	createPendingSemanticRelationRecord,
	deduplicatePendingSemanticRelationRecords,
	pendingSemanticRelationLocatorKey,
} from "../pending";
import {
	planRelationMaintenance,
	type RelationRequest,
} from "../plan-relation-maintenance";
import { relationAdditionsToPatches } from "./relation-additions-to-patches";
import { relationRemovalsToPatches } from "./relation-removals-to-patches";
import type { PlanMutationRejected, PlanMutationResult } from "./result";
import { shadowRecordChanges, shadowRequest } from "./shadow-record-changes";

function pendingRecords<L extends Dumling.Language>(
	request: ApplyGeneratedKnowledgeRequest<L>,
): PendingSemanticRelationRecord<L>[] {
	// The planner's check has already rejected other target languages.
	const language = lemmaLanguage(readingLemma(request.reading));
	const records = request.pendingRelations.map((value) =>
		createPendingSemanticRelationRecord(
			request.reading,
			parsePendingSemanticRelationInLanguage(value, language),
		),
	);
	return deduplicatePendingSemanticRelationRecords(records);
}

function namedClaimKey(relation: string, lemma: Dumling.Lemma): string {
	return JSON.stringify([relation, lemmaIdentityKey(lemma)]);
}

function relationTargetMissing<L extends Dumling.Language>(
	slice: ApplyGeneratedKnowledgeContext<L>,
	change: ApplyGeneratedKnowledgeRequest<L>["changes"][number],
): boolean {
	if (change.aspect !== "semanticRelations" || !("value" in change))
		return false;
	return change.targetKind === "reading"
		? change.value.some(
				(target) =>
					!slice.relationReadings.some((entry) =>
						sameReading(entry.reading, target),
					),
			)
		: change.value.some(
				(target) =>
					!slice.relationLemmas.some((entry) =>
						sameLemma(entry.lemma, target),
					),
			);
}

export function planApplyGeneratedKnowledge<L extends Dumling.Language>(
	slice: ApplyGeneratedKnowledgeContext<L>,
	request: ApplyGeneratedKnowledgeRequest<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	if (!slice.existingReading) {
		return {
			status: "rejected",
			code: "readingMissing",
			message: "Generated Knowledge requires an existing Reading.",
		};
	}

	// A change naming a missing target refuses the request, after the changes
	// before it apply as they would one by one.
	const missingAt = request.changes.findIndex((change) =>
		relationTargetMissing(slice, change),
	);
	let changed: typeof slice.existingReading;
	try {
		changed = applyDumdictKnowledgeChanges(
			slice.existingReading,
			request.changes
				.slice(0, missingAt === -1 ? undefined : missingAt)
				.map((change) => ({ reading: request.reading, change })),
		);
	} catch (error) {
		return {
			status: "rejected",
			code: "invalidRequest",
			message:
				error instanceof Error
					? error.message
					: "Invalid Knowledge change",
		};
	}
	if (missingAt !== -1)
		return {
			status: "rejected",
			code: "invalidRequest",
			message:
				"Direct Semantic Relation target is missing from the dictionary",
		};

	const proposed = pendingRecords(request);
	const existingByKey = new Map(
		slice.exactPendingRelations.map((record) => [
			pendingSemanticRelationLocatorKey(record.locator),
			record,
		]),
	);
	// A change naming the Lemma a stored Shadow resolved to names its claim
	// exactly, so the Shadow is absorbed and its claim never moves again.
	const named = new Set(
		request.changes.flatMap((change) =>
			change.aspect === "semanticRelations" &&
			"value" in change &&
			change.targetKind !== "reading"
				? change.value.map((lemma) =>
						namedClaimKey(change.relation, lemma),
					)
				: [],
		),
	);
	const absorbed = new Set(
		[...existingByKey.entries()].flatMap(([key, record]) =>
			record.resolvedLemma &&
			named.has(
				namedClaimKey(record.pending.relation, record.resolvedLemma),
			)
				? [key]
				: [],
		),
	);
	// A proposal the store already holds is planned from its stored record,
	// which keeps any resolution it has.
	const relationRequests: RelationRequest<L>[] = proposed.flatMap(
		(record) => {
			const key = pendingSemanticRelationLocatorKey(record.locator);
			return absorbed.has(key)
				? []
				: [shadowRequest(existingByKey.get(key) ?? record, "propose")];
		},
	);
	const changedReadings = slice.relationReadings.map((entry) =>
		sameReading(entry.reading, changed.reading) ? changed : entry,
	);
	const relationPlan = planRelationMaintenance({
		lemmas: slice.relationLemmas,
		readings: changedReadings,
		requests: relationRequests,
	});
	if (relationPlan.status === "rejected") return relationPlan;

	const operations = new Map<
		string,
		{ reading: Dumling.Reading<L>; ops: ReadingPatchOp<L>[] }
	>();
	if (request.changes.length > 0) {
		operations.set(readingIdentityKey(request.reading), {
			reading: request.reading,
			ops: request.changes.map(
				(change): ReadingPatchOp<L> => ({
					kind: "applyKnowledgeChange",
					envelope: {
						reading: request.reading,
						change,
					},
				}),
			),
		});
	}
	// A removal rewrites its bucket from the Knowledge before the plan, so it
	// comes before the additions that extend that bucket.
	for (const relationPatch of [
		...relationRemovalsToPatches(
			relationPlan.removals,
			changedReadings,
			slice.revision,
		),
		...relationAdditionsToPatches(relationPlan.additions, slice.revision),
	]) {
		const readingKey = readingIdentityKey(relationPatch.reading);
		const patch = operations.get(readingKey) ?? {
			reading: relationPatch.reading,
			ops: [],
		};
		patch.ops.push(...relationPatch.ops);
		operations.set(readingKey, patch);
	}

	const records = shadowRecordChanges(
		[
			...relationPlan.shadowOutcomes,
			...[...absorbed].flatMap((key) => {
				const record = existingByKey.get(key);
				return record ? [{ record, next: undefined }] : [];
			}),
		],
		[...existingByKey.values()],
		slice.revision,
	);
	const changes: PlannedChangeOp<L>[] = [
		...[...operations.values()].map(
			(patch): PlannedChangeOp<L> => ({
				type: "patchReading",
				reading: patch.reading,
				ops: patch.ops,
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "readingExists", reading: patch.reading },
				],
			}),
		),
		...records.deletions,
		...records.creations,
	];

	const affectedReadings = new Map<string, Dumling.Reading<L>>();
	for (const patch of operations.values())
		affectedReadings.set(readingIdentityKey(patch.reading), patch.reading);
	return {
		status: "planned",
		baseRevision: slice.revision,
		changes,
		affected: {
			readings:
				affectedReadings.size > 0
					? [...affectedReadings.values()]
					: undefined,
			pendingIds:
				proposed.length > 0
					? proposed.map(({ locator }) => locator.targetPendingId)
					: undefined,
		},
		summary: {
			message: `Applied ${request.changes.length} generated Knowledge Change${request.changes.length === 1 ? "" : "s"} and planned ${request.pendingRelations.length} generated relation${request.pendingRelations.length === 1 ? "" : "s"}.`,
		},
	};
}
