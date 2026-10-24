/** Gold's Semantic Relation targets and the key a run's claims are matched by (#884 ruling 3). */
import { foldCase } from "dumling";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

export type Shadow = {
	readonly family: string;
	readonly kind: string;
	readonly canonicalForm: string;
};

/** A Unit Shadow's identity, as relations are matched (#884 ruling 3). */
export const shadowKey = ({ family, kind, canonicalForm }: Shadow) =>
	`${family}/${kind}/${foldCase(canonicalForm, "de")}`;

/**
 * Gold's targets of each Semantic Relation, by relation, in gold's order. A
 * Reading target stands for its Lemma's Unit Shadow.
 */
export function goldRelationTargets(
	knowledge: Dumrel.ReadingKnowledge | undefined,
): ReadonlyMap<string, readonly Shadow[]> {
	const targets = new Map<string, readonly Shadow[]>();
	for (const [relation, value] of Object.entries(
		knowledge?.semanticRelations ?? {},
	))
		if (Array.isArray(value))
			targets.set(
				relation,
				value.map((target: Dumling.Lemma | Dumling.Reading) =>
					target.unitKind === "Reading" ? target.lemma : target,
				),
			);
	return targets;
}
