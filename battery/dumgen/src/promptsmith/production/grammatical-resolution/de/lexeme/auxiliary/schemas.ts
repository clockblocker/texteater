import { codecBuilder4 } from "codec-builder-library/v4";
import { dangerouslyHeavySchemasForAbout100MiBRss as schemasFor } from "dumling/dangerously-heavy-schema-tree";
import { z } from "zod";

import { asObjectSchema } from "../../../../../../schema/as-object-schema";
import {
	grammaticalResolutionMarkedContextSchema,
	normalizedMembersSchema,
	type PromptInputSchema,
	type PromptOutputSchema,
} from "../../../../../assembly";

const canonicalLemmaSchema = asObjectSchema(
	schemasFor.de.entity.Lemma.Lexeme.AUX(),
);
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Lexeme.AUX(),
);
const canonicalInflectionSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Inflection.Lexeme.AUX(),
);

const deAuxiliaryLemmaCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalLemmaSchema,
	{
		language: "de",
		family: "Lexeme",
		kind: "AUX",
	},
);

const modelLemmaSchema = deAuxiliaryLemmaCodec.in;

type DeAuxiliaryLemma = z.output<typeof deAuxiliaryLemmaCodec>;

const modelSurfaceFeaturesSchema = z
	.strictObject({ historicalStatus: z.literal("Archaic").nullable() })
	.nullable();

function normalizeModelSurfaceFeatures<
	Surface extends {
		readonly surfaceFeatures: {
			readonly historicalStatus: "Archaic" | null;
		} | null;
	},
>(surface: Surface): Surface {
	if (
		surface.surfaceFeatures === null ||
		surface.surfaceFeatures.historicalStatus !== null
	) {
		return surface;
	}
	return { ...surface, surfaceFeatures: null };
}

const auxiliaryNumberSchema = z.enum(["Plur", "Sing"]);
const auxiliaryTenseSchema = z.enum(["Past", "Pres"]);
const auxiliaryVoiceSchema = z.literal("Pass");

// The codec exposes one legacy-compatible verbal shape without a VerbForm.
// A structural union preserves its non-empty refinement in provider schemas.
const unspecifiedVerbFormFeaturesSchema = z.union([
	z.strictObject({
		number: auxiliaryNumberSchema,
		tense: auxiliaryTenseSchema.nullable(),
		verbForm: z.null(),
		voice: auxiliaryVoiceSchema.nullable(),
	}),
	z.strictObject({
		number: auxiliaryNumberSchema.nullable(),
		tense: auxiliaryTenseSchema,
		verbForm: z.null(),
		voice: auxiliaryVoiceSchema.nullable(),
	}),
	z.strictObject({
		number: auxiliaryNumberSchema.nullable(),
		tense: auxiliaryTenseSchema.nullable(),
		verbForm: z.null(),
		voice: auxiliaryVoiceSchema,
	}),
]);

const imperativeInflectionalFeaturesSchema = z.strictObject({
	mood: z.literal("Imp"),
	number: auxiliaryNumberSchema.nullable(),
	person: z.enum(["1", "2", "3"]).nullable(),
	tense: z.null(),
	verbForm: z.literal("Fin"),
	voice: auxiliaryVoiceSchema.nullable(),
});

const finiteInflectionalFeaturesSchema = z.strictObject({
	mood: z.enum(["Ind", "Sub"]).nullable(),
	number: auxiliaryNumberSchema.nullable(),
	person: z.enum(["1", "2", "3"]).nullable(),
	tense: auxiliaryTenseSchema.nullable(),
	verbForm: z.literal("Fin"),
	voice: auxiliaryVoiceSchema.nullable(),
});

const infinitiveInflectionalFeaturesSchema = z.strictObject({
	mood: z.null(),
	number: auxiliaryNumberSchema.nullable(),
	person: z.null(),
	tense: z.null(),
	verbForm: z.literal("Inf"),
	voice: auxiliaryVoiceSchema.nullable(),
});

const participleInflectionalFeaturesSchema = z.strictObject({
	aspect: z.literal("Perf").nullable(),
	gender: z.enum(["Fem", "Masc", "Neut"]).nullable(),
	mood: z.null(),
	number: auxiliaryNumberSchema.nullable(),
	person: z.null(),
	tense: auxiliaryTenseSchema.nullable(),
	verbForm: z.literal("Part"),
	voice: auxiliaryVoiceSchema.nullable(),
});

export const modelInflectionalFeaturesSchema = z.union([
	unspecifiedVerbFormFeaturesSchema,
	imperativeInflectionalFeaturesSchema,
	finiteInflectionalFeaturesSchema,
	infinitiveInflectionalFeaturesSchema,
	participleInflectionalFeaturesSchema,
]);

function buildDeAuxiliaryCitationSurfaceCodec(lemma: DeAuxiliaryLemma) {
	const canonicalCodec = codecBuilder4.buildFixedFieldsCodec(
		canonicalCitationSurfaceSchema,
		{ language: "de", lemma },
	);
	const modelSchema = canonicalCodec.in.extend({
		surfaceFeatures: modelSurfaceFeaturesSchema,
	});
	return z.codec(modelSchema, canonicalCodec.out, {
		decode: (model) =>
			canonicalCodec.decode(normalizeModelSurfaceFeatures(model)),
		encode: (canonical) => canonicalCodec.encode(canonical),
	});
}

function buildDeAuxiliaryInflectionSurfaceCodec(lemma: DeAuxiliaryLemma) {
	const canonicalCodec = codecBuilder4.buildFixedFieldsCodec(
		canonicalInflectionSurfaceSchema,
		{ language: "de", lemma },
	);
	const modelSchema = canonicalCodec.in.extend({
		surfaceFeatures: modelSurfaceFeaturesSchema,
		inflectionalFeatures: modelInflectionalFeaturesSchema,
	});
	return z.codec(modelSchema, canonicalCodec.out, {
		decode: (model) =>
			canonicalCodec.decode(normalizeModelSurfaceFeatures(model)),
		encode: (canonical) =>
			modelSchema.parse(canonicalCodec.encode(canonical)),
	});
}

const schemaProjectionLemma = deAuxiliaryLemmaCodec.decode({
	canonicalForm: "sein",
	coreFeatures: { verbType: null },
});

const modelCitationSurfaceSchema = buildDeAuxiliaryCitationSurfaceCodec(
	schemaProjectionLemma,
).in.omit({
	normalizedSurface: true,
});

const modelInflectionSurfaceSchema = buildDeAuxiliaryInflectionSurfaceCodec(
	schemaProjectionLemma,
).in.omit({
	normalizedSurface: true,
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
