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
] as const;

export const grammaticalSeriesAxisValues = ["case", "person"] as const;
