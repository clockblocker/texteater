import { codecBuilder4 } from "codec-builder-library/v4";
import { schemasFor } from "dumling/schema";
import { z } from "zod";

import { asObjectSchema } from "../../../../../../schema/as-object-schema";
import {
	grammaticalResolutionMarkedContextSchema,
	normalizedMembersSchema,
	type PromptInputSchema,
	type PromptOutputSchema,
} from "../../../../../assembly";

const canonicalLemmaSchema = asObjectSchema(
	schemasFor.de.entity.Lemma.Construction.Fusion(),
);
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Construction.Fusion(),
);

const deFusionLemmaCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalLemmaSchema,
	{ language: "de", family: "Construction", kind: "Fusion" },
);

const modelLemmaCodec = codecBuilder4.buildFixedFieldsCodec(
	deFusionLemmaCodec.in,
	{ coreFeatures: {} },
);

const deFusionModelLemmaSchema = modelLemmaCodec.in;

type DeFusionLemma = z.output<typeof deFusionLemmaCodec>;

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

function buildDeFusionCitationSurfaceCodec(lemma: DeFusionLemma) {
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

const schemaProjectionLemma = {
	language: "de",
	canonicalForm: "im",
	family: "Construction",
	kind: "Fusion",
	coreFeatures: {},
} satisfies DeFusionLemma;

const deFusionModelCitationSurfaceSchema = buildDeFusionCitationSurfaceCodec(
	schemaProjectionLemma,
).in.omit({
	normalizedSurface: true,
	surfaceKind: true,
});

export const inputSchema = z
	.strictObject({
		markedContext: grammaticalResolutionMarkedContextSchema,
		members: z.array(z.string().min(1)).length(1),
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
	memberOrthographies: z.array(z.enum(["Standard", "Typo"])).length(1),
	normalizedMembers: normalizedMembersSchema.length(1),
	surface: deFusionModelCitationSurfaceSchema,
	lemma: deFusionModelLemmaSchema,
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

const fusionResolutionCodec = codecBuilder4.helpers.pipeCodecs(
	extractModelLemmaCodec,
	restoreRuntimeLemmaCodec,
);

export const outputSchema =
	fusionResolutionCodec.in satisfies PromptOutputSchema;
