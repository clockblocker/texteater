import { v } from "convex/values";

export const languageValidator = v.union(v.literal("de"), v.literal("he"));

export const grammaticalLanguageValidator = v.literal("de");

export const segmentKindValidator = v.union(
	v.literal("ResolvableText"),
	v.literal("OpaqueText"),
	v.literal("Whitespace"),
	v.literal("Punctuation"),
);

export const segmentInputValidator = v.object({
	kind: segmentKindValidator,
	text: v.string(),
});

export const sentenceInputValidator = v.object({
	segmentedSentenceId: v.string(),
	position: v.number(),
	language: languageValidator,
	stitchedText: v.string(),
	segments: v.array(segmentInputValidator),
});

export const knowledgeOwnerKindValidator = v.union(
	v.literal("Lemma"),
	v.literal("Reading"),
);

export const semanticRelationValidator = v.union(
	v.literal("synonym"),
	v.literal("nearSynonym"),
	v.literal("antonym"),
	v.literal("hypernym"),
	v.literal("hyponym"),
	v.literal("meronym"),
	v.literal("holonym"),
);

export const grammaticalResolutionInputValidator = v.object({
	resolutionKey: v.string(),
	language: grammaticalLanguageValidator,
	markedContext: v.string(),
	memberSegmentIndices: v.array(v.number()),
	attestation: v.any(),
	surfaceKey: v.string(),
	lemmaKey: v.string(),
});
