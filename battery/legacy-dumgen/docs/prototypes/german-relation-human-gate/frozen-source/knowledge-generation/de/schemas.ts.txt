import { type ZodType, z } from "zod";

import { knowledgeGenerationInputSchema } from "../../schemas/public-schemas";
import { requestableRelationSchema } from "../relations";
import {
	type GermanKnowledgeFamily,
	isRelationBearingKnowledgeFamily,
} from "./families";
import type {
	GermanKnowledgeAnalysis,
	GermanKnowledgeGenerationInput,
} from "./runtime-schema";

export type {
	GermanKnowledgeAnalysis,
	GermanKnowledgeFamily,
	GermanKnowledgeGenerationInput,
	GermanKnowledgeGenerationRequest,
	GermanKnowledgeRelationTarget,
} from "./runtime-schema";

// Named normalization hooks keep the generated runtime-prompt operation
// inventory stable: the codegen derives operation names from function names.
function trimString(value: string): string {
	return value.trim();
}
function normalizeNfc(value: string): string {
	return value.normalize("NFC");
}

const normalizedCandidateSchema = z
	.string()
	.overwrite(trimString)
	.min(1)
	.overwrite(normalizeNfc);

/**
 * One kind-only relation target. The model never proposes a Family; the
 * source Reading's Family is injected before same-Family validation.
 */
const germanRelationTargetSchema = z.strictObject({
	canonicalForm: normalizedCandidateSchema,
	kind: normalizedCandidateSchema,
});

export const germanKnowledgeGenerationInputSchema =
	knowledgeGenerationInputSchema;

const inputSchemasByFamily = new Map<
	GermanKnowledgeFamily,
	ZodType<GermanKnowledgeGenerationInput>
>();
const outputSchemasByFamily = new Map<
	GermanKnowledgeFamily,
	ZodType<GermanKnowledgeAnalysis>
>();

/**
 * The per-route Knowledge input contract. Family dispatch is deterministic,
 * so each route's schema also pins the Reading's Family.
 */
export function germanKnowledgeGenerationInputSchemaForFamily(
	family: GermanKnowledgeFamily,
): ZodType<GermanKnowledgeGenerationInput> {
	let schema = inputSchemasByFamily.get(family);
	if (schema === undefined) {
		schema = germanKnowledgeGenerationInputSchema.refine(
			(value) => value.reading.lemma.family === family,
			{
				path: ["reading", "lemma", "family"],
				message: `The knowledge.de.${family} route requires a ${family} Reading.`,
			},
		) as unknown as ZodType<GermanKnowledgeGenerationInput>;
		inputSchemasByFamily.set(family, schema);
	}
	return schema;
}

/**
 * The per-route analysis contract. Lexeme and Phraseme routes own relation
 * leaves; Morpheme and Construction routes own base leaves only, matching
 * their applicability masks.
 */
export function germanKnowledgeAnalysisSchemaForFamily(
	family: GermanKnowledgeFamily,
): ZodType<GermanKnowledgeAnalysis> {
	let schema = outputSchemasByFamily.get(family);
	if (schema === undefined) {
		schema = z.strictObject({
			transcription: normalizedCandidateSchema.nullable().optional(),
			definition: normalizedCandidateSchema.nullable().optional(),
			translations: z
				.strictObject({
					en: normalizedCandidateSchema.nullable().optional(),
				})
				.optional(),
			...(isRelationBearingKnowledgeFamily(family)
				? {
						semanticRelations: z
							.partialRecord(
								requestableRelationSchema,
								z
									.array(germanRelationTargetSchema)
									.min(1)
									.max(5)
									.nullable(),
							)
							.optional(),
					}
				: {}),
		}) as unknown as ZodType<GermanKnowledgeAnalysis>;
		outputSchemasByFamily.set(family, schema);
	}
	return schema;
}

/** Family-agnostic analysis shape for authoring-side consumers. */
export const germanKnowledgeAnalysisSchema = z.strictObject({
	transcription: normalizedCandidateSchema.nullable().optional(),
	definition: normalizedCandidateSchema.nullable().optional(),
	translations: z
		.strictObject({ en: normalizedCandidateSchema.nullable().optional() })
		.optional(),
	semanticRelations: z
		.partialRecord(
			requestableRelationSchema,
			z.array(germanRelationTargetSchema).min(1).max(5).nullable(),
		)
		.optional(),
}) as ZodType<GermanKnowledgeAnalysis>;

/**
 * Builds the exact strict Structured Outputs schema for one sparse request.
 * Every selected leaf is required and nullable; no unselected property exists.
 * Targets are kind-only; same-Family filtering happens after the exchange.
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
	if (
		request.semanticRelations !== undefined &&
		isRelationBearingKnowledgeFamily(input.reading.lemma.family)
	) {
		const relationShape: Record<string, ZodType> = {};
		for (const relation of requestableRelationSchema.options) {
			if (relation in request.semanticRelations) {
				relationShape[relation] = z
					.array(germanRelationTargetSchema)
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

export { isEmptyGermanKnowledgeRequest } from "./runtime-schema";
