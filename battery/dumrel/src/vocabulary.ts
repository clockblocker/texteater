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
