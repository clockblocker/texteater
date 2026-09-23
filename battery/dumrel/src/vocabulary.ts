export const directSemanticRelationValues = [
	"synonym",
	"nearSynonym",
	"antonym",
	"nearAntonym",
	"hypernym",
	"holonym",
] as const;

export const translationLanguageValues = ["en", "ru"] as const;

/** Cases a lexically governed preposition can assign to its complement. */
export const governedCaseValues = ["Acc", "Dat", "Gen"] as const;
