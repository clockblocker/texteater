import type { LexicalUnitShadow } from "dumrel";
import { lexicalUnitShadowSchema } from "dumrel";
import { type ZodType, z } from "zod";

import { knowledgeGenerationInputSchema } from "../../schemas/public-schemas";
import type {
	KnowledgeGenerationInput,
	KnowledgeGenerationRequest,
} from "../contracts";
import {
	type RequestableRelation,
	requestableRelationSchema,
} from "../relations";

const normalizedCandidateSchema = z
	.string()
	.trim()
	.min(1)
	.overwrite((value) => value.normalize("NFC"));

const germanLexicalUnitShadowSchema = lexicalUnitShadowSchema.refine(
	(shadow) => shadow.language === "de",
	{
		path: ["language"],
		message: "German Knowledge relations must target German Unit Shadows.",
	},
) as ZodType<LexicalUnitShadow<"de">>;

export type GermanKnowledgeGenerationRequest = KnowledgeGenerationRequest;

export type GermanKnowledgeGenerationInput = KnowledgeGenerationInput<"de">;

export type GermanKnowledgeAnalysis = Readonly<{
	readonly transcription?: string | null;
	readonly definition?: string | null;
	readonly translations?: Readonly<{ readonly en?: string | null }>;
	readonly semanticRelations?: Readonly<
		Partial<
			Record<
				RequestableRelation,
				readonly LexicalUnitShadow<"de">[] | null
			>
		>
	>;
}>;

export const germanKnowledgeGenerationInputSchema =
	knowledgeGenerationInputSchema;

export const germanKnowledgeAnalysisSchema = z.strictObject({
	transcription: normalizedCandidateSchema.nullable().optional(),
	definition: normalizedCandidateSchema.nullable().optional(),
	translations: z
		.strictObject({ en: normalizedCandidateSchema.nullable().optional() })
		.optional(),
	semanticRelations: z
		.partialRecord(
			requestableRelationSchema,
			z.array(germanLexicalUnitShadowSchema).min(1).max(5).nullable(),
		)
		.optional(),
}) as ZodType<GermanKnowledgeAnalysis>;

/**
 * Builds the exact strict Structured Outputs schema for one sparse request.
 * Every selected leaf is required and nullable; no unselected property exists.
 */
export function modelOutputSchemaForGermanKnowledge(
	rawInput: GermanKnowledgeGenerationInput,
): ZodType<GermanKnowledgeAnalysis> {
	const input = germanKnowledgeGenerationInputSchema.parse(rawInput);
	const request = input.request;
	const shape: Record<string, ZodType> = {};

	if ("transcription" in request) {
		shape.transcription = normalizedCandidateSchema.nullable();
	}
	if ("definition" in request) {
		shape.definition = normalizedCandidateSchema.nullable();
	}
	if (request.translations !== undefined) {
		shape.translations = z.strictObject({
			en: normalizedCandidateSchema.nullable(),
		});
	}
	if (request.semanticRelations !== undefined) {
		const relationShape: Record<string, ZodType> = {};
		for (const relation of requestableRelationSchema.options) {
			if (relation in request.semanticRelations) {
				relationShape[relation] = z
					.array(germanLexicalUnitShadowSchema)
					.min(1)
					.max(5)
					.nullable();
			}
		}
		shape.semanticRelations = z.strictObject(relationShape);
	}

	return z.strictObject(shape) as ZodType<GermanKnowledgeAnalysis>;
}

export function assertGermanKnowledgeAnalysisMirrorsRequest(
	rawInput: GermanKnowledgeGenerationInput,
	rawAnalysis: GermanKnowledgeAnalysis,
): void {
	const input = germanKnowledgeGenerationInputSchema.parse(rawInput);
	modelOutputSchemaForGermanKnowledge(input).parse(rawAnalysis);
}

export function isEmptyGermanKnowledgeRequest(
	request: GermanKnowledgeGenerationRequest,
): boolean {
	return Object.keys(request).length === 0;
}
