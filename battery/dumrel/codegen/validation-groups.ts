/** Knowledge selection, changes, and relation projection load independently. */
export function validationGroup(root: string): string {
	if (
		[
			"knowledgeSettings",
			"knowledgeRequestMask",
			"knowledgeSelectionInput",
		].includes(root)
	)
		return "selection";
	if (["readingKnowledge", "knowledgeChange"].includes(root))
		return "knowledge";
	if (
		[
			"directSemanticRelation",
			"lexicalBreakdown",
			"morphologicalTree",
			"pendingSemanticRelation",
			"semanticRelations",
			"translationLanguage",
			"unitShadow",
			"semanticProjectionInput",
			"semanticRelation",
			"semanticRelationProjection",
		].includes(root)
	)
		return "relations";
	throw new Error(`Unclassified Dumrel validation root: ${root}`);
}
