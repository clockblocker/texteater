import { readingIdentityKey, sameLemma } from "dumling";
import type * as Dumling from "dumling/types";

import type {
	LemmaRecord,
	PendingSemanticRelationRecord,
	PlannedChangeOp,
	ReadingEntry,
	StoreRevision,
} from "../../domain-types";
import {
	deduplicatePendingSemanticRelationRecords,
	pendingSemanticRelationLocatorKey,
} from "../pending";
import {
	planRelationMaintenance,
	type RelationMaintenancePlan,
	type RelationRequest,
	type ShadowOutcome,
} from "../plan-relation-maintenance";
import { relationAdditionsToPatches } from "./relation-additions-to-patches";
import { relationRemovalsToPatches } from "./relation-removals-to-patches";
import { removedTargetClaims } from "./removed-target-claims";

/** A Shadow relation request for a pending record. */
export function shadowRequest<L extends Dumling.Language>(
	record: PendingSemanticRelationRecord<L>,
	mode: "propose" | "reevaluate",
): RelationRequest<L> {
	return {
		sourceReading: record.sourceReading,
		relation: record.pending.relation,
		target: { kind: "shadow", pendingRecord: record, mode },
	};
}

function sameResolution<L extends Dumling.Language>(
	left: PendingSemanticRelationRecord<L>,
	right: PendingSemanticRelationRecord<L>,
): boolean {
	return left.resolvedLemma === undefined || right.resolvedLemma === undefined
		? left.resolvedLemma === right.resolvedLemma
		: sameLemma(left.resolvedLemma, right.resolvedLemma);
}

/**
 * The record writes that bring each Shadow's stored record to its outcome.
 * A stored record whose resolution changes is deleted and created again under
 * its one locator, so every deletion comes before every creation. An absorbed
 * Shadow's stored record is deleted, and a new Shadow's record is created
 * unless it was absorbed.
 */
export function shadowRecordChanges<L extends Dumling.Language>(
	outcomes: readonly ShadowOutcome<L>[],
	stored: readonly PendingSemanticRelationRecord<L>[],
	revision: StoreRevision,
): {
	deletions: PlannedChangeOp<L>[];
	creations: PlannedChangeOp<L>[];
	/** Every record a deletion or a creation names. */
	touched: PendingSemanticRelationRecord<L>[];
} {
	const storedByKey = new Map(
		stored.map((record) => [
			pendingSemanticRelationLocatorKey(record.locator),
			record,
		]),
	);
	const deletions: PlannedChangeOp<L>[] = [];
	const creations: PlannedChangeOp<L>[] = [];
	const touched: PendingSemanticRelationRecord<L>[] = [];
	const remove = (record: PendingSemanticRelationRecord<L>) => {
		deletions.push({
			type: "deletePendingSemanticRelation",
			record,
			preconditions: [
				{ kind: "revisionMatches", revision },
				{ kind: "pendingRelationExists", record },
			],
		});
		touched.push(record);
	};
	const create = (record: PendingSemanticRelationRecord<L>) => {
		creations.push({
			type: "createPendingSemanticRelation",
			record,
			preconditions: [
				{ kind: "revisionMatches", revision },
				{ kind: "pendingRelationMissing", record },
			],
		});
		touched.push(record);
	};
	for (const { record, next } of outcomes) {
		const current = storedByKey.get(
			pendingSemanticRelationLocatorKey(record.locator),
		);
		if (!current) {
			if (next) create(next);
			continue;
		}
		if (!next) remove(current);
		else if (!sameResolution(current, next)) {
			remove(current);
			create(next);
		}
	}
	return { deletions, creations, touched };
}

/** Whether an outcome resolves its Shadow to a Lemma. */
function resolvesShadow<L extends Dumling.Language>(
	outcome: ShadowOutcome<L>,
): boolean {
	return outcome.next?.resolvedLemma !== undefined;
}

/**
 * Re-evaluates stored Shadow records against `lemmas`, the Lemmas they may
 * now target (system ADR 0011): a Shadow that matches exactly one resolves
 * to it, and any other goes back to pending, so its source Reading's claims
 * move with it. Re-evaluating the result again plans nothing.
 *
 * Each claim `readings` hold on a `removedLemmas` Lemma becomes that Lemma's
 * Shadow relation, re-evaluated as if it had resolved to the Lemma, and each
 * Reading-mode claim on one of their Readings is retracted
 * (`removedTargetClaims`).
 */
export function planShadowReevaluation<L extends Dumling.Language>(input: {
	revision: StoreRevision;
	records: readonly PendingSemanticRelationRecord<L>[];
	lemmas: readonly LemmaRecord<L>[];
	readings: readonly ReadingEntry<L>[];
	removedLemmas?: readonly Dumling.Lemma<L>[];
}):
	| {
			status: "planned";
			changes: PlannedChangeOp<L>[];
			readings: Dumling.Reading<L>[];
			pendingIds: string[];
			/** Records that resolve after the plan. */
			resolved: number;
			/** Records whose stored state the plan changes. */
			moved: number;
	  }
	| Extract<RelationMaintenancePlan<L>, { status: "rejected" }> {
	const records = deduplicatePendingSemanticRelationRecords(input.records);
	const { readingClaims, lemmaClaims } = removedTargetClaims({
		readings: input.readings,
		records,
		removedLemmas: input.removedLemmas ?? [],
	});
	const converted = new Map(
		lemmaClaims.map(({ record }) => [
			pendingSemanticRelationLocatorKey(record.locator),
			record,
		]),
	);
	const storedKeys = new Set(
		records.map(({ locator }) =>
			pendingSemanticRelationLocatorKey(locator),
		),
	);
	// A converted claim's record replaces the stored one under its locator.
	const evaluated = [
		...records.map(
			(record) =>
				converted.get(
					pendingSemanticRelationLocatorKey(record.locator),
				) ?? record,
		),
		...[...converted]
			.filter(([key]) => !storedKeys.has(key))
			.map(([, record]) => record),
	];
	const plan = planRelationMaintenance({
		lemmas: input.lemmas,
		readings: input.readings,
		requests: evaluated.map((record) =>
			shadowRequest(record, "reevaluate"),
		),
		retractions: readingClaims,
	});
	if (plan.status === "rejected") return plan;
	const writes = shadowRecordChanges(
		plan.shadowOutcomes,
		records,
		input.revision,
	);
	const readings = new Map<string, Dumling.Reading<L>>();
	for (const { reading } of [...plan.removals, ...plan.additions])
		readings.set(readingIdentityKey(reading), reading);
	return {
		status: "planned",
		changes: [
			...relationRemovalsToPatches(
				plan.removals,
				input.readings,
				input.revision,
			),
			...relationAdditionsToPatches(plan.additions, input.revision),
			...writes.deletions,
			...writes.creations,
		],
		readings: [...readings.values()],
		pendingIds: [
			...new Set(
				writes.touched.map(({ locator }) => locator.targetPendingId),
			),
		],
		resolved: plan.shadowOutcomes.filter(resolvesShadow).length,
		moved: new Set(
			writes.touched.map(({ locator }) =>
				pendingSemanticRelationLocatorKey(locator),
			),
		).size,
	};
}
