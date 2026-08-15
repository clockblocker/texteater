import { codecBuilder4 } from "codec-builder-library/v4";
import { schemasFor } from "dumling/schema";
import { z } from "zod";

import {
	asObjectSchema,
	grammaticalResolutionMarkedContextSchema,
	normalizedMembersSchema,
	type PromptInputSchema,
	type PromptOutputSchema,
} from "../../../../../assembly";

const canonicalLemmaSchema = asObjectSchema(
	schemasFor.de.entity.Lemma.Phraseme.Idiom(),
);
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Phraseme.Idiom(),
);
const canonicalInflectionSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Inflection.Phraseme.Idiom(),
);

const deIdiomLemmaCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalLemmaSchema,
	{ language: "de", family: "Phraseme", kind: "Idiom" },
);

const modelLemmaWithCoreFeaturesSchema = deIdiomLemmaCodec.in;
const modelLemmaCodec = codecBuilder4.buildFixedFieldsCodec(
	modelLemmaWithCoreFeaturesSchema,
	{ coreFeatures: {} },
);

const deIdiomModelLemmaSchema = modelLemmaCodec.in;

type DeIdiomLemma = z.output<typeof deIdiomLemmaCodec>;

const modelSurfaceFeaturesSchema = z
	.strictObject({ historicalStatus: z.literal("Archaic").nullable() })
	.nullable();

const unspecifiedInflectionalFeaturesSchema = z.strictObject({
	number: z.enum(["Plur", "Sing"]).nullable(),
	tense: z.enum(["Past", "Pres"]).nullable(),
	verbForm: z.null(),
	voice: z.literal("Pass").nullable(),
});

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
	unspecifiedInflectionalFeaturesSchema,
	finiteInflectionalFeaturesSchema,
	imperativeInflectionalFeaturesSchema,
	infinitiveInflectionalFeaturesSchema,
	participleInflectionalFeaturesSchema,
]);

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

function buildDeIdiomCitationSurfaceCodec(lemma: DeIdiomLemma) {
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

function buildDeIdiomInflectionSurfaceCodec(lemma: DeIdiomLemma) {
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

const schemaProjectionLemma = deIdiomLemmaCodec.decode({
	canonicalForm: "mit den Wölfen heulen",
	coreFeatures: {},
});

const deIdiomModelCitationSurfaceSchema = buildDeIdiomCitationSurfaceCodec(
	schemaProjectionLemma,
).in.omit({
	normalizedSurface: true,
});
const deIdiomModelInflectionSurfaceSchema = buildDeIdiomInflectionSurfaceCodec(
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

const modelOutputSchema = z.strictObject({
	memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(1),
	normalizedMembers: normalizedMembersSchema,
	realizationCoverage: z.enum(["Full", "Partial"]),
	surface: z.union([
		deIdiomModelCitationSurfaceSchema,
		deIdiomModelInflectionSurfaceSchema,
	]),
	lemma: deIdiomModelLemmaSchema,
});

const extractModelLemmaCodec = codecBuilder4.buildReshapeCodec(
	modelOutputSchema,
	{
		fieldName: "modelLemma",
		fieldSchema: modelLemmaCodec.in,
		dropFields: ["lemma"],
		construct: (output) => output.lemma,
		reconstruct: (modelLemma) => ({ lemma: modelLemma }),
	},
);
const restoreRuntimeLemmaCodec = codecBuilder4.buildReshapeCodec(
	extractModelLemmaCodec.out,
	{
		fieldName: "lemma",
		fieldSchema: modelLemmaCodec.out,
		dropFields: ["modelLemma"],
		construct: (output) => modelLemmaCodec.decode(output.modelLemma),
		reconstruct: (lemma) => ({
			modelLemma: modelLemmaCodec.encode(lemma),
		}),
	},
);

const idiomResolutionCodec = codecBuilder4.helpers.pipeCodecs(
	extractModelLemmaCodec,
	restoreRuntimeLemmaCodec,
);

export const outputSchema =
	idiomResolutionCodec.in satisfies PromptOutputSchema;
