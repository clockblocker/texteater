import { readingFingerprint } from "dumling";
import type { DirectSemanticRelation } from "dumrel";
import type { ReadingEntry } from "../../dto";
import type { SupportedLanguage } from "../../dumling";
import type { StoreRevision } from "../../schema";
import { sameLemma } from "../identity";
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
		const key = `${readingKey}\0${removal.relation}`;
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
		const remaining = (
			entry.knowledge?.semanticRelations?.[relation] ?? []
		).filter(
			(target) =>
				!removals.some((removal) =>
					sameLemma(removal.targetLemma, target),
				),
		);
		return {
			type: "patchReading",
			reading: entry.reading,
			ops: [
				{
					kind: "applyKnowledgeChange",
					envelope: {
						reading: entry.reading,
						change:
							remaining.length === 0
								? {
										kind: "Retract",
										aspect: "semanticRelations",
										relation,
									}
								: {
										kind: "Correct",
										aspect: "semanticRelations",
										relation,
										value: remaining,
									},
					},
				},
			],
			preconditions: [
				{ kind: "revisionMatches", revision },
				{ kind: "readingExists", reading: entry.reading },
			],
		};
	});
}
