import { schemasFor } from "dumling/schema";
import { z } from "zod";

import type {
	PromptInputSchema,
	PromptOutputSchema,
} from "../../../../../../assembly";

type ObjectSchema = z.ZodObject<z.ZodRawShape>;

const canonicalLemmaSchema =
	schemasFor.de.entity.Lemma.Lexeme.PRON() as unknown as ObjectSchema;
const canonicalCitationSurfaceSchema =
	schemasFor.de.entity.Surface.Citation.Lexeme.PRON() as unknown as ObjectSchema;
const canonicalInflectionSurfaceSchema =
	schemasFor.de.entity.Surface.Inflection.Lexeme.PRON() as unknown as ObjectSchema;

export const modelLemmaSchema = canonicalLemmaSchema.omit({
	language: true,
	family: true,
	kind: true,
});

const modelSurfaceFeaturesSchema = z
	.strictObject({ historicalStatus: z.literal("Archaic").nullable() })
	.nullable();

export const modelCitationSurfaceSchema = canonicalCitationSurfaceSchema
	.omit({ language: true, lemma: true })
	.extend({ surfaceFeatures: modelSurfaceFeaturesSchema });

export const modelInflectionSurfaceSchema = canonicalInflectionSurfaceSchema
	.omit({ language: true, lemma: true })
	.extend({ surfaceFeatures: modelSurfaceFeaturesSchema });

export const inputSchema = z.strictObject({
	markedContext: z.string().min(1),
}) satisfies PromptInputSchema;

export const outputSchema = z.strictObject({
	decision: z.enum(["Resolved", "Unresolved"]),
	resolution: z
		.strictObject({
			memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(1),
			surface: z.union([
				modelCitationSurfaceSchema,
				modelInflectionSurfaceSchema,
			]),
			lemma: modelLemmaSchema,
		})
		.nullable(),
}) satisfies PromptOutputSchema;
