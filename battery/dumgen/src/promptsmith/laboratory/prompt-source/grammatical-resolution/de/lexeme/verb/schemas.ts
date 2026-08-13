import { schemasFor } from "dumling/schema";
import { z } from "zod";

import {
	grammaticalResolutionMarkedContextSchema,
	normalizedMembersSchema,
	type PromptInputSchema,
	type PromptOutputSchema,
} from "../../../../../../assembly";

type ObjectSchema = z.ZodObject<z.ZodRawShape>;

const canonicalLemmaSchema =
	schemasFor.de.entity.Lemma.Lexeme.VERB() as unknown as ObjectSchema;
const canonicalCitationSurfaceSchema =
	schemasFor.de.entity.Surface.Citation.Lexeme.VERB() as unknown as ObjectSchema;
const canonicalInflectionSurfaceSchema =
	schemasFor.de.entity.Surface.Inflection.Lexeme.VERB() as unknown as ObjectSchema;

const canonicalCoreFeaturesSchema = canonicalLemmaSchema.shape
	.coreFeatures as ObjectSchema;

export const modelLemmaSchema = canonicalLemmaSchema
	.omit({
		language: true,
		family: true,
		kind: true,
	})
	.extend({
		coreFeatures: canonicalCoreFeaturesSchema.omit({ verbType: true }),
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

export const modelCitationSurfaceSchema = canonicalCitationSurfaceSchema
	.omit({ language: true, lemma: true, normalizedSurface: true })
	.extend({ surfaceFeatures: modelSurfaceFeaturesSchema });

export const modelInflectionSurfaceSchema = canonicalInflectionSurfaceSchema
	.omit({ language: true, lemma: true, normalizedSurface: true })
	.extend({
		surfaceFeatures: modelSurfaceFeaturesSchema,
		inflectionalFeatures: modelInflectionalFeaturesSchema,
	});

export const inputSchema = z
	.strictObject({
		markedContext: grammaticalResolutionMarkedContextSchema,
		members: z.array(z.string().min(1)).min(1),
	})
	.superRefine((input, context) => {
		const markedMembers = [
			...input.markedContext.matchAll(/<TARGET>([^<>]+)<\/TARGET>/gu),
		].map((match) => match[1]);
		if (
			markedMembers.length !== input.members.length ||
			markedMembers.some(
				(member, position) => member !== input.members[position],
			)
		) {
			context.addIssue({
				code: "custom",
				path: ["members"],
				message:
					"members must exactly match TARGET contents in source order.",
			});
		}
	}) satisfies PromptInputSchema;

export const outputSchema = z.strictObject({
	memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(1),
	normalizedMembers: normalizedMembersSchema,
	surface: z.union([
		modelCitationSurfaceSchema,
		modelInflectionSurfaceSchema,
	]),
	lemma: modelLemmaSchema,
}) satisfies PromptOutputSchema;
