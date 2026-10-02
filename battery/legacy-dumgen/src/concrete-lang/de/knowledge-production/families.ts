/**
 * Deterministic per-Family dispatch vocabulary for German Knowledge routes.
 * ADR-0020 keeps Semantic Relations inside one Family, so the source
 * Reading's Family selects the route, the schema, and the relation-target
 * inventory.
 */
/**
 * Dumling Kind inventories per relation-bearing Family. Only Lexeme and
 * Phraseme Readings request Semantic Relations, so only those inventories
 * accept relation targets. Must stay aligned with Dumling's Lemma registry;
 * no test checks the alignment.
 */
export const germanRelationTargetKindsByFamily: Readonly<
	Record<"Lexeme" | "Phraseme", readonly string[]>
> = {
	Lexeme: [
		"ADJ",
		"ADP",
		"ADV",
		"AUX",
		"CCONJ",
		"DET",
		"INTJ",
		"NOUN",
		"NUM",
		"PART",
		"PRON",
		"PROPN",
		"PUNCT",
		"SCONJ",
		"SYM",
		"VERB",
		"X",
	],
	Phraseme: [
		"Aphorism",
		"Collocation",
		"DiscourseFormula",
		"Idiom",
		"Proverb",
	],
};

export function isRelationBearingKnowledgeFamily(
	family: string,
): family is "Lexeme" | "Phraseme" {
	return family === "Lexeme" || family === "Phraseme";
}
