import { readingFingerprint } from "dumling/id";
import type { SupportedLanguage } from "dumling/types";
import type {
	PendingSemanticRelationRecord,
	Reading,
	ReadingKnowledgeChange,
} from "../../dto";
import {
	parsePendingSemanticRelationForDumdictRuntime,
	unwrapDumdictParse,
} from "../../parsing/lightweight-parsers";
import type { ApplyGeneratedKnowledgeRequest } from "../../public";
import type {
	ApplyGeneratedKnowledgeContext,
	ReadingPatchOp,
} from "../../storage";
import {
	createPendingSemanticRelationRecord,
	deduplicatePendingSemanticRelationRecords,
	pendingSemanticRelationLocatorKey,
} from "../pending";
import {
	planRelationMaintenance,
	type RelationRequest,
} from "../plan-relation-maintenance";
import type { PlannedChangeOp } from "../planned-changes";
import { relationAdditionsToPatches } from "./relation-additions-to-patches";
import { relationRemovalsToPatches } from "./relation-removals-to-patches";
import type { PlanMutationRejected, PlanMutationResult } from "./result";

function pendingRecords<L extends SupportedLanguage>(
	request: ApplyGeneratedKnowledgeRequest<L>,
): PendingSemanticRelationRecord<L>[] {
	const records = request.pendingRelations.map((value) => {
		const pending = unwrapDumdictParse(
			parsePendingSemanticRelationForDumdictRuntime(value),
		) as unknown as PendingSemanticRelationRecord<L>["pending"];
		return createPendingSemanticRelationRecord(request.reading, pending);
	});
	return deduplicatePendingSemanticRelationRecords(records);
}

export function planApplyGeneratedKnowledge<L extends SupportedLanguage>(
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

	const proposed = pendingRecords(request);
	const existingByKey = new Map(
		slice.exactPendingRelations.map((record) => [
			pendingSemanticRelationLocatorKey(record.locator),
			record,
		]),
	);
	const relationRequests: RelationRequest<L>[] = proposed.map((record) => {
		const pendingRecord =
			existingByKey.get(
				pendingSemanticRelationLocatorKey(record.locator),
			) ?? record;
		return {
			sourceReading: request.reading,
			relation: pendingRecord.pending.relation,
			target: {
				kind: "shadow",
				shadow: pendingRecord.pending.target,
				pendingRecord,
			},
		};
	});
	const relationPlan = planRelationMaintenance({
		lemmas: slice.relationLemmas,
		readings: slice.relationReadings,
		requests: relationRequests,
	});
	if (relationPlan.status === "rejected") return relationPlan;

	const operations = new Map<
		string,
		{ reading: Reading<L>; ops: ReadingPatchOp<L>[] }
	>();
	if (request.changes.length > 0) {
		operations.set(readingFingerprint(request.reading), {
			reading: request.reading,
			ops: request.changes.map(
				(change): ReadingPatchOp<L> => ({
					kind: "applyKnowledgeChange",
					envelope: {
						reading: request.reading,
						change: change as ReadingKnowledgeChange<L>["change"],
					},
				}),
			),
		});
	}
	for (const relationPatch of relationAdditionsToPatches(
		relationPlan.additions,
		slice.revision,
	)) {
		const readingKey = readingFingerprint(relationPatch.reading);
		const patch = operations.get(readingKey) ?? {
			reading: relationPatch.reading,
			ops: [],
		};
		patch.ops.push(...relationPatch.ops);
		operations.set(readingKey, patch);
	}
	for (const relationPatch of relationRemovalsToPatches(
		relationPlan.removals,
		slice.relationReadings,
		slice.revision,
	)) {
		const readingKey = readingFingerprint(relationPatch.reading);
		const patch = operations.get(readingKey) ?? {
			reading: relationPatch.reading,
			ops: [],
		};
		patch.ops.push(...relationPatch.ops);
		operations.set(readingKey, patch);
	}

	const resolvedKeys = new Set(
		relationPlan.resolvedPending.map(({ locator }) =>
			pendingSemanticRelationLocatorKey(locator),
		),
	);
	const unresolvedKeys = new Set(
		relationPlan.unresolvedPending.map(({ locator }) =>
			pendingSemanticRelationLocatorKey(locator),
		),
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
		...proposed.flatMap((record): PlannedChangeOp<L>[] => {
			const key = pendingSemanticRelationLocatorKey(record.locator);
			if (existingByKey.has(key) || !unresolvedKeys.has(key)) return [];
			return [
				{
					type: "createPendingSemanticRelation",
					record,
					preconditions: [
						{ kind: "revisionMatches", revision: slice.revision },
						{ kind: "pendingRelationMissing", record },
					],
				},
			];
		}),
		...[...existingByKey.values()].flatMap(
			(record): PlannedChangeOp<L>[] =>
				resolvedKeys.has(
					pendingSemanticRelationLocatorKey(record.locator),
				)
					? [
							{
								type: "deletePendingSemanticRelation",
								record,
								preconditions: [
									{
										kind: "revisionMatches",
										revision: slice.revision,
									},
									{ kind: "pendingRelationExists", record },
								],
							},
						]
					: [],
		),
	];

	const affectedReadings = new Map<string, Reading<L>>();
	for (const patch of operations.values())
		affectedReadings.set(readingFingerprint(patch.reading), patch.reading);
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
