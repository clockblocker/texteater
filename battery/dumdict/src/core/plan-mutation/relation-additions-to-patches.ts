import { readingFingerprint } from "dumling";
import type { SemanticRelation } from "dumrel";
import type { Reading } from "../../dto";
import type { Lemma, SupportedLanguage } from "../../dumling";
import type { StoreRevision } from "../../schema";
import type { PlannedRelationAddition } from "../plan-relation-maintenance";
import type { PlannedChangeOp } from "../planned-changes";

type ReadingPatch<L extends SupportedLanguage> = Extract<
	PlannedChangeOp<L>,
	{ type: "patchReading" }
>;

export function relationAdditionsToPatches<L extends SupportedLanguage>(
	additions: readonly PlannedRelationAddition<L>[],
	revision: StoreRevision,
): ReadingPatch<L>[] {
	const buckets = new Map<
		string,
		{
			reading: Reading<L>;
			relation: SemanticRelation;
			targets: Lemma<L>[];
		}
	>();
	for (const addition of additions) {
		const key = `${readingFingerprint(addition.reading)}\0${addition.relation}`;
		const bucket = buckets.get(key);
		if (bucket) bucket.targets.push(addition.targetLemma);
		else
			buckets.set(key, {
				reading: addition.reading,
				relation: addition.relation,
				targets: [addition.targetLemma],
			});
	}
	return [...buckets.values()].map((bucket) => ({
		type: "patchReading",
		reading: bucket.reading,
		ops: [
			{
				kind: "applyKnowledgeChange",
				envelope: {
					reading: bucket.reading,
					change: {
						kind: "Contribute",
						aspect: "semanticRelations",
						relation: bucket.relation,
						value: bucket.targets,
					},
				},
			},
		],
		preconditions: [
			{ kind: "revisionMatches", revision },
			{ kind: "readingExists", reading: bucket.reading },
		],
	}));
}
