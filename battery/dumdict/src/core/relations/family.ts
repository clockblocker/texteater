import type {
	LexicalRelation,
	MorphologicalRelation,
	RelationFamily,
} from "../../dto";

const lexicalRelations = new Set<LexicalRelation>([
	"synonym",
	"nearSynonym",
	"antonym",
	"hypernym",
	"hyponym",
	"meronym",
	"holonym",
]);

const morphologicalRelations = new Set<MorphologicalRelation>([
	"consistsOf",
	"usedIn",
	"derivedFrom",
	"sourceFor",
]);

export function relationFamilyFor(
	relation: LexicalRelation | MorphologicalRelation,
): RelationFamily {
	if (lexicalRelations.has(relation as LexicalRelation)) {
		return "lexical";
	}
	if (morphologicalRelations.has(relation as MorphologicalRelation)) {
		return "morphological";
	}

	throw new Error(`Unknown relation: ${String(relation)}`);
}

export function isKnownRelation(
	relation: string,
): relation is LexicalRelation | MorphologicalRelation {
	return (
		lexicalRelations.has(relation as LexicalRelation) ||
		morphologicalRelations.has(relation as MorphologicalRelation)
	);
}
