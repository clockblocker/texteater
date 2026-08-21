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
	schemasFor.de.entity.Lemma.Lexeme.VERB(),
);
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Lexeme.VERB(),
);
const canonicalInflectionSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Inflection.Lexeme.VERB(),
);
const canonicalCoreFeaturesSchema = asObjectSchema(
	canonicalLemmaSchema.shape.coreFeatures,
);

const coreFeaturesCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalCoreFeaturesSchema,
	{ verbType: null },
);
const routeFieldsCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalLemmaSchema,
	{
		language: "de",
		family: "Lexeme",
		kind: "VERB",
	},
);
const modelLemmaWithCoreFeaturesSchema = routeFieldsCodec.in.extend({
	coreFeatures: coreFeaturesCodec.in,
});
const extractModelCoreFeaturesCodec = codecBuilder4.buildReshapeCodec(
	modelLemmaWithCoreFeaturesSchema,
	{
		fieldName: "modelCoreFeatures",
		fieldSchema: coreFeaturesCodec.in,
		dropFields: ["coreFeatures"],
		construct: (lemma) => lemma.coreFeatures,
		reconstruct: (modelCoreFeatures) => ({
			coreFeatures: modelCoreFeatures,
		}),
	},
);
const restoreCanonicalCoreFeaturesCodec = codecBuilder4.buildReshapeCodec(
	extractModelCoreFeaturesCodec.out,
	{
		fieldName: "coreFeatures",
		fieldSchema: coreFeaturesCodec.out,
		dropFields: ["modelCoreFeatures"],
		construct: (lemma) => coreFeaturesCodec.decode(lemma.modelCoreFeatures),
		reconstruct: (coreFeatures) => ({
			modelCoreFeatures: coreFeaturesCodec.encode(coreFeatures),
		}),
	},
);
const modelLemmaCodec = codecBuilder4.helpers.pipeCodecs(
	extractModelCoreFeaturesCodec,
	restoreCanonicalCoreFeaturesCodec,
);

const deVerbLemmaCodec = codecBuilder4.helpers.pipeCodecs(
	modelLemmaCodec,
	routeFieldsCodec,
);
const modelLemmaSchema = deVerbLemmaCodec.in;

type DeVerbLemma = z.output<typeof deVerbLemmaCodec>;

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

function buildDeVerbCitationSurfaceCodec(lemma: DeVerbLemma) {
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

function buildDeVerbInflectionSurfaceCodec(lemma: DeVerbLemma) {
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

const schemaProjectionLemma = deVerbLemmaCodec.decode({
	canonicalForm: "arbeiten",
	coreFeatures: {
		hasGovPrep: null,
		hasSepPrefix: null,
		lexicallyReflexive: null,
	},
});

const modelCitationSurfaceSchema = buildDeVerbCitationSurfaceCodec(
	schemaProjectionLemma,
).in.omit({ normalizedSurface: true });

const modelInflectionSurfaceSchema = buildDeVerbInflectionSurfaceCodec(
	schemaProjectionLemma,
).in.omit({ normalizedSurface: true });

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
	surface: z.union([
		modelCitationSurfaceSchema,
		modelInflectionSurfaceSchema,
	]),
	lemma: modelLemmaSchema,
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
const restoreRuntimeLemmaOutputCodec = codecBuilder4.helpers.pipeCodecs(
	extractModelLemmaCodec,
	restoreRuntimeLemmaCodec,
);

const verbResolutionCodec = restoreRuntimeLemmaOutputCodec;

export const outputSchema = verbResolutionCodec.in satisfies PromptOutputSchema;
