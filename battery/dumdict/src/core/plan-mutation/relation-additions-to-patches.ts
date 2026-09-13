import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import type { StoreRevision } from "../../domain-types";
import type { ReadingKnowledgeChange } from "../../dto";
import { readingFingerprint } from "../identity";
import type { PlannedRelationAddition } from "../plan-relation-maintenance";
import type { PlannedChangeOp } from "../planned-changes";

type ReadingPatch<L extends Dumling.Language> = Extract<
	PlannedChangeOp<L>,
	{ type: "patchReading" }
>;

export function relationAdditionsToPatches<L extends Dumling.Language>(
	additions: readonly PlannedRelationAddition<L>[],
	revision: StoreRevision,
): ReadingPatch<L>[] {
	const lemmaBuckets = new Map<
		string,
		{
			reading: Dumling.Reading<L>;
			relation: Dumrel.DirectSemanticRelation;
			targets: Dumling.Lemma<L>[];
		}
	>();
	const readingBuckets = new Map<
		string,
		{ reading: Dumling.Reading<L>; targets: Dumling.Reading<L>[] }
	>();
	for (const addition of additions) {
		const key = `${readingFingerprint(addition.reading)}\0${addition.relation}`;
		if (addition.targetKind === "reading") {
			const bucket = readingBuckets.get(key);
			if (bucket) bucket.targets.push(addition.targetReading);
			else
				readingBuckets.set(key, {
					reading: addition.reading,
					targets: [addition.targetReading],
				});
		} else {
			const bucket = lemmaBuckets.get(key);
			if (bucket) bucket.targets.push(addition.targetLemma);
			else
				lemmaBuckets.set(key, {
					reading: addition.reading,
					relation: addition.relation,
					targets: [addition.targetLemma],
				});
		}
	}
	return [
		...[...lemmaBuckets.values()].map(
			({ reading, relation, targets }): ReadingPatch<L> =>
				patch(reading, revision, {
					kind: "Contribute",
					aspect: "semanticRelations",
					relation,
					targetKind: "lemma",
					value: targets,
				}),
		),
		...[...readingBuckets.values()].map(
			({ reading, targets }): ReadingPatch<L> =>
				patch(reading, revision, {
					kind: "Contribute",
					aspect: "semanticRelations",
					relation: "synonym",
					targetKind: "reading",
					value: targets,
				}),
		),
	];
}

function patch<L extends Dumling.Language>(
	reading: Dumling.Reading<L>,
	revision: StoreRevision,
	change: ReadingKnowledgeChange<L>["change"],
): ReadingPatch<L> {
	return {
		type: "patchReading",
		reading,
		ops: [{ kind: "applyKnowledgeChange", envelope: { reading, change } }],
		preconditions: [
			{ kind: "revisionMatches", revision },
			{ kind: "readingExists", reading },
		],
	};
}
