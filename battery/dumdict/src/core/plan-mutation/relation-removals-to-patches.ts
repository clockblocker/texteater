import { readingFingerprint } from "dumling/id";
import type { SupportedLanguage } from "dumling/types";
import type { DirectSemanticRelation } from "dumrel/types";
import type { StoreRevision } from "../../domain-types";
import type { ReadingEntry, ReadingKnowledgeChange } from "../../dto";
import { sameLemma, sameReading } from "../identity";
import type { PlannedRelationRemoval } from "../plan-relation-maintenance";
import type { PlannedChangeOp } from "../planned-changes";

type ReadingPatch<L extends SupportedLanguage> = Extract<
	PlannedChangeOp<L>,
	{ type: "patchReading" }
>;

export function relationRemovalsToPatches<L extends SupportedLanguage>(
	removals: readonly PlannedRelationRemoval<L>[],
	readings: readonly ReadingEntry<L>[],
	revision: StoreRevision,
): ReadingPatch<L>[] {
	const readingByKey = new Map(
		readings.map((entry) => [readingFingerprint(entry.reading), entry]),
	);
	const grouped = new Map<
		string,
		{
			entry: ReadingEntry<L>;
			relation: DirectSemanticRelation;
			removals: PlannedRelationRemoval<L>[];
		}
	>();
	for (const removal of removals) {
		const readingKey = readingFingerprint(removal.reading);
		const entry = readingByKey.get(readingKey);
		if (!entry) continue;
		const key = `${readingKey}\0${removal.relation}\0${removal.targetKind}`;
		const bucket = grouped.get(key);
		if (bucket) bucket.removals.push(removal);
		else
			grouped.set(key, {
				entry,
				relation: removal.relation,
				removals: [removal],
			});
	}

	return [...grouped.values()].map(({ entry, relation, removals }) => {
		const relations = entry.knowledge?.semanticRelations;
		const readingMode = relations?.targetKind === "reading";
		let change: ReadingKnowledgeChange<L>["change"];
		if (readingMode) {
			const readingRemovals = removals.filter(
				(removal) => removal.targetKind === "reading",
			);
			const remaining = (relations.synonym ?? []).filter(
				(target) =>
					!readingRemovals.some((removal) =>
						sameReading(removal.targetReading, target),
					),
			);
			change =
				remaining.length === 0
					? {
							kind: "Retract",
							aspect: "semanticRelations",
							relation: "synonym",
							targetKind: "reading",
						}
					: {
							kind: "Correct",
							aspect: "semanticRelations",
							relation: "synonym",
							targetKind: "reading",
							value: remaining,
						};
		} else {
			const remaining = (relations?.[relation] ?? []).filter(
				(target) =>
					!removals.some(
						(removal) =>
							removal.targetKind !== "reading" &&
							sameLemma(removal.targetLemma, target),
					),
			);
			change =
				remaining.length === 0
					? {
							kind: "Retract",
							aspect: "semanticRelations",
							relation,
							targetKind: "lemma",
						}
					: {
							kind: "Correct",
							aspect: "semanticRelations",
							relation,
							targetKind: "lemma",
							value: remaining,
						};
		}
		return {
			type: "patchReading",
			reading: entry.reading,
			ops: [
				{
					kind: "applyKnowledgeChange",
					envelope: { reading: entry.reading, change },
				},
			],
			preconditions: [
				{ kind: "revisionMatches", revision },
				{ kind: "readingExists", reading: entry.reading },
			],
		};
	});
}
