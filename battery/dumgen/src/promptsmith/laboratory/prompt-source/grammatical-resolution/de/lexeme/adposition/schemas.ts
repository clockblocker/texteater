import { schemasFor } from "dumling/schema";
import { z } from "zod";

import type {
	PromptInputSchema,
	PromptOutputSchema,
} from "../../../../../../assembly";

type ObjectSchema = z.ZodObject<z.ZodRawShape>;

const canonicalLemmaSchema =
	schemasFor.de.entity.Lemma.Lexeme.ADP() as unknown as ObjectSchema;
const canonicalCitationSurfaceSchema =
	schemasFor.de.entity.Surface.Citation.Lexeme.ADP() as unknown as ObjectSchema;

export const modelLemmaSchema = canonicalLemmaSchema.omit({
	language: true,
	family: true,
	kind: true,
});

const canonicalModelCitationSurfaceSchema = canonicalCitationSurfaceSchema.omit(
	{
		language: true,
		lemma: true,
	},
);

// OpenAI Structured Outputs requires every object property, so it may emit an
// all-null feature bag where Dumling's canonical schema requires null. Accept
// that model representation here; the evaluator normalizes it to canonical
// null semantics.
const modelSurfaceFeaturesSchema = z
	.strictObject({ historicalStatus: z.literal("Archaic").nullable() })
	.nullable();

export const modelCitationSurfaceSchema =
	canonicalModelCitationSurfaceSchema.extend({
		surfaceFeatures: modelSurfaceFeaturesSchema,
	});

export const inputSchema = z.strictObject({
	markedContext: z.string().min(1),
}) satisfies PromptInputSchema;

export const outputSchema = z.strictObject({
	decision: z.enum(["Resolved", "Unresolved"]),
	resolution: z
		.strictObject({
			memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(1),
			surface: modelCitationSurfaceSchema,
			lemma: modelLemmaSchema,
		})
		.nullable(),
}) satisfies PromptOutputSchema;
