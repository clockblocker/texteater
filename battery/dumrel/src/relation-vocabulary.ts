export const semanticRelationValues = [
	"synonym",
	"nearSynonym",
	"antonym",
	"hypernym",
	"hyponym",
	"meronym",
	"holonym",
] as const;

export const morphologicalRelationValues = [
	"consistsOf",
	"usedIn",
	"derivedFrom",
	"sourceFor",
] as const;

export type SemanticRelation = (typeof semanticRelationValues)[number];
export type MorphologicalRelation =
	(typeof morphologicalRelationValues)[number];
export type Relation = SemanticRelation | MorphologicalRelation;
export type RelationFamily = "lexical" | "morphological";

/** @deprecated Use semanticRelationValues. */
export const lexicalRelationValues = semanticRelationValues;
/** @deprecated Use SemanticRelation. */
export type LexicalRelation = SemanticRelation;
