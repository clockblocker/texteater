import {
	knowledgeChangeSchema,
	knowledgeRequestMaskSchema,
	pendingSemanticRelationSchema,
} from "dumrel/schema";
import { z } from "zod";

export const segmentSchema = z.strictObject({
	kind: z.enum(["ResolvableText", "OpaqueText", "Whitespace", "Punctuation"]),
	text: z.string().min(1),
});
export const segmentedSentenceSchema = z.strictObject({
	id: z.string().min(1),
	language: z.enum(["de", "en", "he"]),
	segments: z.array(segmentSchema).min(1),
});
const sourceSentenceSchema = z.string().min(1);
export const segmentInputSchema = z.strictObject({
	sourceSentences: z.tuple([sourceSentenceSchema], sourceSentenceSchema),
});
export const classifyInputSchema = z.strictObject({
	sentence: segmentedSentenceSchema,
	clickedSegmentIndex: z.number().int().nonnegative(),
});
const indexSchema = z.number().int().nonnegative();
export const memberIndicesSchema = z.tuple([indexSchema], indexSchema);
export const knowledgeFailureSchema = z.strictObject({
	aspect: z.enum([
		"transcription",
		"definition",
		"translations",
		"semanticRelations",
		"morphologicalTree",
		"lexicalBreakdown",
	]),
	leaf: z.string().optional(),
	candidate: z.string().optional(),
	code: z.enum([
		"InvalidInput",
		"ProviderFailure",
		"InvalidModelOutput",
		"Unresolved",
		"NotImplemented",
		"CatalogMiss",
	]),
	message: z.string(),
});
export const knowledgeProductionSchema = z.strictObject({
	changes: z.array(knowledgeChangeSchema),
	pendingRelations: z.array(pendingSemanticRelationSchema),
	failures: z.array(knowledgeFailureSchema),
});
export { knowledgeRequestMaskSchema };
export const segmentationDecisionSchema = z.union([
	z.strictObject({
		decision: z.literal("Accepted"),
		language: z.literal("en"),
		sentence: segmentedSentenceSchema.extend({ language: z.literal("en") }),
	}),
	z.strictObject({
		decision: z.literal("Accepted"),
		language: z.literal("de"),
		sentence: segmentedSentenceSchema.extend({ language: z.literal("de") }),
	}),
	z.strictObject({
		decision: z.literal("Accepted"),
		language: z.literal("he"),
		sentence: segmentedSentenceSchema.extend({ language: z.literal("he") }),
	}),
	z.strictObject({ decision: z.literal("UnsupportedLanguage") }),
	z.strictObject({ decision: z.literal("Unintelligible") }),
]);
