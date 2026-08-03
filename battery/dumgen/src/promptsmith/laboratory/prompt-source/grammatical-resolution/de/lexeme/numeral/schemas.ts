import { schemasFor } from "dumling/schema";
import { z } from "zod";

import type {
	PromptInputSchema,
	PromptOutputSchema,
} from "../../../../../../assembly";

type ObjectSchema = z.ZodObject<z.ZodRawShape>;

const canonicalLemmaSchema =
	schemasFor.de.entity.Lemma.Lexeme.NUM() as unknown as ObjectSchema;
const canonicalCitationSurfaceSchema =
	schemasFor.de.entity.Surface.Citation.Lexeme.NUM() as unknown as ObjectSchema;
const canonicalInflectionSurfaceSchema =
	schemasFor.de.entity.Surface.Inflection.Lexeme.NUM() as unknown as ObjectSchema;

export const modelLemmaSchema = canonicalLemmaSchema.omit({
	language: true,
	family: true,
	kind: true,
});

const modelSurfaceFeaturesSchema = z
	.strictObject({ historicalStatus: z.literal("Archaic").nullable() })
	.nullable();

const numeralCaseSchema = z.enum(["Acc", "Dat", "Gen", "Nom"]);
const numeralGenderSchema = z.enum(["Fem", "Masc", "Neut"]);
const numeralNumberSchema = z.enum(["Plur", "Sing"]);

// Dumling requires at least one non-null inflectional feature. Express the
// accepted set structurally so the generated JSON Schema cannot admit the
// all-null object that the canonical Zod refinement rejects at parse time.
export const modelInflectionalFeaturesSchema = z.union([
	z.strictObject({
		case: numeralCaseSchema,
		gender: numeralGenderSchema.nullable(),
		number: numeralNumberSchema.nullable(),
	}),
	z.strictObject({
		case: numeralCaseSchema.nullable(),
		gender: numeralGenderSchema,
		number: numeralNumberSchema.nullable(),
	}),
	z.strictObject({
		case: numeralCaseSchema.nullable(),
		gender: numeralGenderSchema.nullable(),
		number: numeralNumberSchema,
	}),
]);

export const modelCitationSurfaceSchema = canonicalCitationSurfaceSchema
	.omit({ language: true, lemma: true })
	.extend({ surfaceFeatures: modelSurfaceFeaturesSchema });

export const modelInflectionSurfaceSchema = canonicalInflectionSurfaceSchema
	.omit({ language: true, lemma: true })
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
			surface: z.union([
				modelCitationSurfaceSchema,
				modelInflectionSurfaceSchema,
			]),
			lemma: modelLemmaSchema,
		})
		.nullable(),
}) satisfies PromptOutputSchema;
