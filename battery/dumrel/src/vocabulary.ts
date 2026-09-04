export const semanticRelationValues = [
	"synonym",
	"nearSynonym",
	"antonym",
	"nearAntonym",
	"hypernym",
	"hyponym",
	"meronym",
	"holonym",
] as const;

/** Translation Target Languages supported by Dumrel's application settings. */
export const translationLanguageValues = ["en", "ru"] as const;

/** Relation kinds that may exist as durable direct claims. */
export const directSemanticRelationValues = [
	"synonym",
	"nearSynonym",
	"antonym",
	"nearAntonym",
	"hypernym",
	"holonym",
] as const;

/** Direct grammatical claims. These never enter Semantic Relation algebra. */
export const grammaticalRelationValues = [
	"CaseCounterpart",
	"PersonCounterpart",
	"NumberCounterpart",
] as const;

export const grammaticalSeriesAxisValues = [
	"case",
	"person",
	"number",
] as const;
