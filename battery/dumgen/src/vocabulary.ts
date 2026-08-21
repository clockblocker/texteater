export const enabledSegmentationLanguageValues = ["de", "he"] as const;

export const grammaticalResolutionLanguageValues = ["de"] as const;

export const requestableRelationValues = [
	"synonym",
	"nearSynonym",
	"antonym",
	"nearAntonym",
	"hypernym",
	"holonym",
] as const;
export type RequestableRelation = (typeof requestableRelationValues)[number];

export const segmentKindValues = [
	"ResolvableText",
	"OpaqueText",
	"Whitespace",
	"Punctuation",
] as const;
