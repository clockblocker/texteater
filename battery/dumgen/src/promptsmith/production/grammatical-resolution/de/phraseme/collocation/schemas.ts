import { dangerouslyHeavySchemasForAbout100MiBRss as schemasFor } from "dumling/dangerously-heavy-schema-tree";
import { z } from "zod";

import {
	grammaticalResolutionMarkedContextSchema,
	normalizedMembersSchema,
	type PromptInputSchema,
	type PromptOutputSchema,
} from "../../../../../assembly";

type ObjectSchema = z.ZodObject<z.ZodRawShape>;

const canonicalLemmaSchema =
	schemasFor.de.entity.Lemma.Phraseme.Collocation() as unknown as ObjectSchema;
const canonicalCitationSurfaceSchema =
	schemasFor.de.entity.Surface.Citation.Phraseme.Collocation() as unknown as ObjectSchema;
const canonicalInflectionSurfaceSchema =
	schemasFor.de.entity.Surface.Inflection.Phraseme.Collocation() as unknown as ObjectSchema;

const modelLemmaSchema = canonicalLemmaSchema.omit({
	language: true,
	family: true,
	kind: true,
});

const modelSurfaceFeaturesSchema = z
	.strictObject({ historicalStatus: z.literal("Archaic").nullable() })
	.nullable();

const finiteInflectionalFeaturesSchema = z.strictObject({
	mood: z.enum(["Ind", "Sub"]).nullable(),
	number: z.enum(["Plur", "Sing"]).nullable(),
	person: z.enum(["1", "2", "3"]).nullable(),
	tense: z.enum(["Past", "Pres"]).nullable(),
	verbForm: z.literal("Fin"),
	voice: z.literal("Pass").nullable(),
});

const imperativeInflectionalFeaturesSchema = z.strictObject({
	mood: z.literal("Imp"),
	number: z.enum(["Plur", "Sing"]).nullable(),
	person: z.enum(["1", "2", "3"]).nullable(),
	tense: z.null(),
	verbForm: z.literal("Fin"),
	voice: z.literal("Pass").nullable(),
});

const infinitiveInflectionalFeaturesSchema = z.strictObject({
	mood: z.null(),
	number: z.enum(["Plur", "Sing"]).nullable(),
	person: z.null(),
	tense: z.null(),
	verbForm: z.literal("Inf"),
	voice: z.literal("Pass").nullable(),
});

const participleInflectionalFeaturesSchema = z.strictObject({
	aspect: z.literal("Perf").nullable(),
	gender: z.enum(["Fem", "Masc", "Neut"]).nullable(),
	mood: z.null(),
	number: z.enum(["Plur", "Sing"]).nullable(),
	person: z.null(),
	tense: z.enum(["Past", "Pres"]).nullable(),
	verbForm: z.literal("Part"),
	voice: z.literal("Pass").nullable(),
});

const modelInflectionalFeaturesSchema = z.union([
	finiteInflectionalFeaturesSchema,
	imperativeInflectionalFeaturesSchema,
	infinitiveInflectionalFeaturesSchema,
	participleInflectionalFeaturesSchema,
]);

const modelCitationSurfaceSchema = canonicalCitationSurfaceSchema
	.omit({ language: true, lemma: true, normalizedSurface: true })
	.extend({ surfaceFeatures: modelSurfaceFeaturesSchema });

const modelInflectionSurfaceSchema = canonicalInflectionSurfaceSchema
	.omit({ language: true, lemma: true, normalizedSurface: true })
	.extend({
		surfaceFeatures: modelSurfaceFeaturesSchema,
		inflectionalFeatures: modelInflectionalFeaturesSchema,
	});

export const inputSchema = z.strictObject({
	markedContext: grammaticalResolutionMarkedContextSchema,
}) satisfies PromptInputSchema;

export const outputSchema = z.strictObject({
	decision: z.enum(["Resolved", "Unresolved"]),
	resolution: z
		.strictObject({
			memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(2),
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
