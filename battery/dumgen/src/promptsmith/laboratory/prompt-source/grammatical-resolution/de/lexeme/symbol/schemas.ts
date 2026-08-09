import { schemasFor } from "dumling/schema";
import { z } from "zod";

import {
	normalizedMembersSchema,
	type PromptInputSchema,
	type PromptOutputSchema,
} from "../../../../../../assembly";

type ObjectSchema = z.ZodObject<z.ZodRawShape>;

const canonicalLemmaSchema =
	schemasFor.de.entity.Lemma.Lexeme.SYM() as unknown as ObjectSchema;
const canonicalCitationSurfaceSchema =
	schemasFor.de.entity.Surface.Citation.Lexeme.SYM() as unknown as ObjectSchema;
const canonicalInflectionSurfaceSchema =
	schemasFor.de.entity.Surface.Inflection.Lexeme.SYM() as unknown as ObjectSchema;

export const modelLemmaSchema = canonicalLemmaSchema.omit({
	language: true,
	family: true,
	kind: true,
});

const modelSurfaceFeaturesSchema = z
	.strictObject({ historicalStatus: z.literal("Archaic").nullable() })
	.nullable();
const symbolCaseSchema = z.enum(["Acc", "Dat", "Gen", "Nom"]);
const symbolGenderSchema = z.enum(["Fem", "Masc", "Neut"]);
const symbolNumberSchema = z.enum(["Plur", "Sing"]);

// The canonical Dumling refinement rejects an all-null inflection object. A
// structural union preserves that invariant in generated provider schemas.
export const modelInflectionalFeaturesSchema = z.union([
	z.strictObject({
		case: symbolCaseSchema,
		gender: symbolGenderSchema.nullable(),
		number: symbolNumberSchema.nullable(),
	}),
	z.strictObject({
		case: symbolCaseSchema.nullable(),
		gender: symbolGenderSchema,
		number: symbolNumberSchema.nullable(),
	}),
	z.strictObject({
		case: symbolCaseSchema.nullable(),
		gender: symbolGenderSchema.nullable(),
		number: symbolNumberSchema,
	}),
]);

export const modelCitationSurfaceSchema = canonicalCitationSurfaceSchema
	.omit({ language: true, lemma: true, normalizedSurface: true })
	.extend({ surfaceFeatures: modelSurfaceFeaturesSchema });

export const modelInflectionSurfaceSchema = canonicalInflectionSurfaceSchema
	.omit({ language: true, lemma: true, normalizedSurface: true })
	.extend({
		surfaceFeatures: modelSurfaceFeaturesSchema,
		inflectionalFeatures: modelInflectionalFeaturesSchema,
	});

export const inputSchema = z.strictObject({
	markedContext: z.string().min(1),
}) satisfies PromptInputSchema;

export const outputSchema = z.strictObject({
	decision: z.enum(["Resolved", "Unresolved"]),
	resolution: z
		.strictObject({
			memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(1),
			normalizedMembers: normalizedMembersSchema,
			realizationCoverage: z.enum(["Full", "Partial"]),
			surface: z.union([
				modelCitationSurfaceSchema,
				modelInflectionSurfaceSchema,
			]),
			lemma: modelLemmaSchema,
		})
		.nullable(),
}) satisfies PromptOutputSchema;
