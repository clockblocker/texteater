/**
 * Deterministic per-Family dispatch vocabulary for German Knowledge routes.
 * ADR-0020 keeps Semantic Relations inside one Family, so the source
 * Reading's Family selects the route, the schema, and the relation-target
 * inventory.
 */
export const germanKnowledgeFamilies = [
	"Lexeme",
	"Phraseme",
	"Morpheme",
	"Construction",
] as const;

export type GermanKnowledgeFamily = (typeof germanKnowledgeFamilies)[number];

/**
 * Dumling Kind inventories per relation-bearing Family. Only Lexeme and
 * Phraseme Readings request Semantic Relations, so only those inventories
 * accept relation targets. Must stay aligned with Dumling's Lemma registry;
 * the authoring tests cross-check it against
 * `relationTargetWithinFamilySchema` from dumrel/schema.
 */
export const germanRelationTargetKindsByFamily: Readonly<
	Record<"Lexeme" | "Phraseme", readonly string[]>
> = Object.freeze({
	Lexeme: Object.freeze([
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
	]),
	Phraseme: Object.freeze([
		"Aphorism",
		"Collocation",
		"DiscourseFormula",
		"Idiom",
		"Proverb",
	]),
});

export function isRelationBearingKnowledgeFamily(
	family: string,
): family is "Lexeme" | "Phraseme" {
	return family === "Lexeme" || family === "Phraseme";
}

/** Whether an injected relation target Kind stays inside the source Family. */
export function germanFamilySupportsRelationTargetKind(
	family: string,
	kind: string,
): boolean {
	return isRelationBearingKnowledgeFamily(family)
		? germanRelationTargetKindsByFamily[family].includes(kind)
		: false;
}
