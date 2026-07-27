import type {
	LexicalRelation,
	MorphologicalRelation,
	RelationFamily,
} from "../../dto";

const lexicalRelationInverses = {
	synonym: "synonym",
	nearSynonym: "nearSynonym",
	antonym: "antonym",
	hypernym: "hyponym",
	hyponym: "hypernym",
	meronym: "holonym",
	holonym: "meronym",
} satisfies Record<LexicalRelation, LexicalRelation>;

const morphologicalRelationInverses = {
	consistsOf: "usedIn",
	usedIn: "consistsOf",
	derivedFrom: "sourceFor",
	sourceFor: "derivedFrom",
} satisfies Record<MorphologicalRelation, MorphologicalRelation>;

export function inverseRelationFor(
	family: "lexical",
	relation: LexicalRelation,
): LexicalRelation;
export function inverseRelationFor(
	family: "morphological",
	relation: MorphologicalRelation,
): MorphologicalRelation;
export function inverseRelationFor(
	family: RelationFamily,
	relation: LexicalRelation | MorphologicalRelation,
) {
	switch (family) {
		case "lexical":
			return lexicalRelationInverses[relation as LexicalRelation];
		case "morphological":
			return morphologicalRelationInverses[relation as MorphologicalRelation];
	}
}

