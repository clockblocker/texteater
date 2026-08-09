import type {
	LexicalRelation,
	MorphologicalRelation,
	Relation,
	RelationFamily,
} from "./types.js";

const relationRules = {
	synonym: { family: "lexical", inverse: "synonym" },
	nearSynonym: { family: "lexical", inverse: "nearSynonym" },
	antonym: { family: "lexical", inverse: "antonym" },
	hypernym: { family: "lexical", inverse: "hyponym" },
	hyponym: { family: "lexical", inverse: "hypernym" },
	meronym: { family: "lexical", inverse: "holonym" },
	holonym: { family: "lexical", inverse: "meronym" },
	consistsOf: { family: "morphological", inverse: "usedIn" },
	usedIn: { family: "morphological", inverse: "consistsOf" },
	derivedFrom: { family: "morphological", inverse: "sourceFor" },
	sourceFor: { family: "morphological", inverse: "derivedFrom" },
} as const satisfies Record<
	LexicalRelation,
	{ family: "lexical"; inverse: LexicalRelation }
> &
	Record<
		MorphologicalRelation,
		{ family: "morphological"; inverse: MorphologicalRelation }
	>;

export function isKnownRelation(relation: string): relation is Relation {
	return Object.hasOwn(relationRules, relation);
}

export function relationFamilyFor(relation: Relation): RelationFamily {
	const rule = relationRules[relation];
	if (!rule) {
		throw new Error(`Unknown relation: ${String(relation)}`);
	}
	return rule.family;
}

export function inverseRelationFor(
	family: "lexical",
	relation: LexicalRelation,
): LexicalRelation;
export function inverseRelationFor(
	family: "morphological",
	relation: MorphologicalRelation,
): MorphologicalRelation;
export function inverseRelationFor(family: RelationFamily, relation: Relation) {
	const rule = relationRules[relation];
	if (!rule || rule.family !== family) {
		throw new Error(
			`Relation ${String(relation)} does not belong to the ${family} family.`,
		);
	}
	return rule.inverse;
}
