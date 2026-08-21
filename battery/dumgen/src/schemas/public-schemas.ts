import { readingSchema } from "dumling/schema";
import { knowledgeChangeSchema, lexicalUnitShadowSchema } from "dumrel/schema";
import { z } from "zod";
import type { KnowledgeGenerationResult } from "../knowledge-generation/contracts";
import { requestableRelationSchema } from "../knowledge-generation/relations";
import { DE_GRAMMATICAL_RESOLUTION_ROUTE_KINDS } from "../schema/de-grammatical-resolution-inventory";
import {
	bindGermanKnowledgeInput,
	bindGermanKnowledgeReading,
	bindGermanRelationTarget,
	bindKnowledgeGenerationResult,
	bindSegmentedSentenceId,
	deepFreeze,
	grammaticalInputIssues,
	grammaticalInteractionIssues,
	hasEnglishTranslationSelection,
	hasSemanticRelationSelection,
	isGermanKnowledgeReading,
	isGermanRelationTarget,
	isValidWhitespaceSegment,
	knowledgeGenerationResultIssues,
} from "../validation-semantics";
import {
	enabledSegmentationLanguageValues,
	grammaticalResolutionLanguageValues,
	segmentKindValues,
} from "../vocabulary";
import { germanAttestationSchema } from "./german-attestation-schema";

export const enabledSegmentationLanguageSchema = z.enum(
	enabledSegmentationLanguageValues,
);

export const grammaticalResolutionLanguageSchema = z.literal(
	grammaticalResolutionLanguageValues[0],
);

export const knowledgeGenerationLanguageSchema = z.literal("de");

const knowledgeTranslationRequestSchema = z
	.strictObject({ en: z.null().optional() })
	.refine(hasEnglishTranslationSelection, {
		message: "A Translation request must select English.",
	})
	.readonly();

const knowledgeSemanticRelationRequestSchema = z
	.partialRecord(requestableRelationSchema, z.null())
	.refine(hasSemanticRelationSelection, {
		message:
			"A Semantic Relation request must select at least one relation.",
	})
	.readonly();

export const knowledgeGenerationRequestSchema = z
	.strictObject({
		transcription: z.null().optional(),
		definition: z.null().optional(),
		translations: knowledgeTranslationRequestSchema.optional(),
		semanticRelations: knowledgeSemanticRelationRequestSchema.optional(),
	})
	.readonly();

const germanKnowledgeReadingSchema = readingSchema
	.refine(isGermanKnowledgeReading, {
		path: ["lemma", "language"],
		message: "Knowledge generation requires a German Reading.",
	})
	.readonly()
	.transform(bindGermanKnowledgeReading);

export const knowledgeGenerationInputSchema = z
	.strictObject({
		markedContext: z.string().min(1),
		reading: germanKnowledgeReadingSchema,
		request: knowledgeGenerationRequestSchema,
	})
	.readonly()
	.transform(bindGermanKnowledgeInput);

const generatedGermanRelationTargetSchema = lexicalUnitShadowSchema
	.refine(isGermanRelationTarget, {
		path: ["language"],
		message: "German Knowledge relations require German Unit Shadows.",
	})
	.transform(bindGermanRelationTarget);

const generatedPendingSemanticRelationSchema = z.strictObject({
	relation: requestableRelationSchema,
	target: generatedGermanRelationTargetSchema,
});

export const knowledgeGenerationResultSchema: z.ZodType<KnowledgeGenerationResult> =
	z
		.strictObject({
			changes: z.array(knowledgeChangeSchema).readonly(),
			pendingRelations: z
				.array(generatedPendingSemanticRelationSchema)
				.readonly(),
		})
		.superRefine((result, context) => {
			for (const issue of knowledgeGenerationResultIssues(result))
				context.addIssue(issue as never);
		})
		.transform(bindKnowledgeGenerationResult)
		.transform(deepFreeze);

export const segmentedSentenceIdSchema = z
	.string()
	.min(1)
	.transform(bindSegmentedSentenceId);

export const segmentKindSchema = z.enum(segmentKindValues);

export const segmentSchema = z
	.strictObject({
		text: z.string().min(1),
		kind: segmentKindSchema,
	})
	.refine(isValidWhitespaceSegment, {
		message: "Whitespace Segments must contain exactly one ASCII space.",
		path: ["text"],
	})
	.readonly();

const segmentArraySchema = z.array(segmentSchema).min(1).readonly();

const germanSegmentedSentenceSchema = segmentedSentenceSchemaFor("de");
const hebrewSegmentedSentenceSchema = segmentedSentenceSchemaFor("he");

export const segmentedSentenceSchema = z.union([
	germanSegmentedSentenceSchema,
	hebrewSegmentedSentenceSchema,
]);

const acceptedGermanSegmentationDecisionSchema = z
	.strictObject({
		decision: z.literal("Accepted"),
		language: z.literal("de"),
		sentence: germanSegmentedSentenceSchema,
	})
	.readonly();

const acceptedHebrewSegmentationDecisionSchema = z
	.strictObject({
		decision: z.literal("Accepted"),
		language: z.literal("he"),
		sentence: hebrewSegmentedSentenceSchema,
	})
	.readonly();

const unsupportedLanguageDecisionSchema = z
	.strictObject({ decision: z.literal("UnsupportedLanguage") })
	.readonly();

const unintelligibleDecisionSchema = z
	.strictObject({ decision: z.literal("Unintelligible") })
	.readonly();

export const segmentationDecisionSchema = z.union([
	acceptedGermanSegmentationDecisionSchema,
	acceptedHebrewSegmentationDecisionSchema,
	unsupportedLanguageDecisionSchema,
	unintelligibleDecisionSchema,
]);

const dumgenErrorCodeSchema = z.enum([
	"refusal",
	"max-output-tokens",
	"content-filter",
	"provider-error",
	"invalid-input",
	"invalid-output",
]);

export const section1ErrorSchema = z.union([
	z
		.strictObject({
			code: z.literal("InvalidInput"),
			message: z.string(),
			itemIndex: z.number().int().nonnegative().optional(),
		})
		.readonly(),
	z
		.strictObject({
			code: z.literal("IntakeFailure"),
			reason: dumgenErrorCodeSchema,
			message: z.string(),
		})
		.readonly(),
]);

export const segmentationResultSchema = z.union([
	z
		.strictObject({
			ok: z.literal(true),
			value: z.array(segmentationDecisionSchema).min(1).readonly(),
		})
		.readonly(),
	z
		.strictObject({
			ok: z.literal(false),
			error: section1ErrorSchema,
		})
		.readonly(),
]);

const segmentIndexSchema = z.number().int().nonnegative();

export const grammaticalRouteSchema = z.union([
	z
		.strictObject({
			family: z.literal("Lexeme"),
			kind: z.enum([
				...DE_GRAMMATICAL_RESOLUTION_ROUTE_KINDS.Lexeme.enabled,
				...DE_GRAMMATICAL_RESOLUTION_ROUTE_KINDS.Lexeme.notImplemented,
			]),
		})
		.readonly(),
	z
		.strictObject({
			family: z.literal("Phraseme"),
			kind: z.enum([
				...DE_GRAMMATICAL_RESOLUTION_ROUTE_KINDS.Phraseme.enabled,
				...DE_GRAMMATICAL_RESOLUTION_ROUTE_KINDS.Phraseme
					.notImplemented,
			]),
		})
		.readonly(),
	z
		.strictObject({
			family: z.literal("Morpheme"),
			kind: z.enum([
				...DE_GRAMMATICAL_RESOLUTION_ROUTE_KINDS.Morpheme.enabled,
				...DE_GRAMMATICAL_RESOLUTION_ROUTE_KINDS.Morpheme
					.notImplemented,
			]),
		})
		.readonly(),
	z
		.strictObject({
			family: z.literal("Construction"),
			kind: z.enum([
				...DE_GRAMMATICAL_RESOLUTION_ROUTE_KINDS.Construction.enabled,
				...DE_GRAMMATICAL_RESOLUTION_ROUTE_KINDS.Construction
					.notImplemented,
			]),
		})
		.readonly(),
]);

export const grammaticalInteractionSchema = z
	.strictObject({
		segmentedSentenceId: segmentedSentenceIdSchema,
		clickedSegmentIndex: segmentIndexSchema,
		memberSegmentIndices: z
			.tuple([segmentIndexSchema], segmentIndexSchema)
			.readonly(),
	})
	.superRefine((interaction, context) => {
		for (const issue of grammaticalInteractionIssues(interaction))
			context.addIssue(issue as never);
	})
	.readonly();

export const grammaticalInputSchema = z
	.strictObject({
		sentence: germanSegmentedSentenceSchema,
		clickedSegmentIndex: segmentIndexSchema,
	})
	.superRefine((input, context) => {
		for (const issue of grammaticalInputIssues(input))
			context.addIssue(issue as never);
	})
	.readonly();

export const resolvedGrammaticalResultSchema = z
	.strictObject({
		decision: z.literal("Resolved"),
		language: grammaticalResolutionLanguageSchema,
		markedContext: z.string().min(1),
		attestation: germanAttestationSchema,
		interaction: grammaticalInteractionSchema,
	})
	.readonly();

export const notImplementedGrammaticalResultSchema = z
	.strictObject({
		decision: z.literal("NotImplemented"),
		language: grammaticalResolutionLanguageSchema,
		route: grammaticalRouteSchema,
	})
	.readonly();

export const unresolvedGrammaticalResultSchema = z
	.strictObject({
		decision: z.literal("Unresolved"),
		language: grammaticalResolutionLanguageSchema,
	})
	.readonly();

export const grammaticalResultSchema = z.union([
	resolvedGrammaticalResultSchema,
	notImplementedGrammaticalResultSchema,
	unresolvedGrammaticalResultSchema,
]);

function segmentedSentenceSchemaFor<const L extends "de" | "he">(language: L) {
	return z
		.strictObject({
			id: segmentedSentenceIdSchema,
			language: z.literal(language),
			segments: segmentArraySchema,
		})
		.readonly();
}
