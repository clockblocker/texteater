import { codecBuilder4 } from "codec-builder-library/v4";
import { schemasFor } from "dumling/schema";
import { z } from "zod";

import { asObjectSchema } from "../../../../../../../schema/as-object-schema";
import {
	grammaticalResolutionMarkedContextSchema,
	type PromptInputSchema,
	type PromptOutputSchema,
} from "../../../../../../assembly";

const canonicalLemmaSchema = asObjectSchema(
	schemasFor.de.entity.Lemma.Construction.Fusion(),
);
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Construction.Fusion(),
);

export const deFusionLemmaCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalLemmaSchema,
	{ language: "de", family: "Construction", kind: "Fusion" },
);
export const deFusionModelLemmaSchema = deFusionLemmaCodec.in;

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

export function buildDeFusionCitationSurfaceCodec(lemma: DeFusionLemma) {
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
		encode: (canonical) =>
			modelSchema.parse(canonicalCodec.encode(canonical)),
	});
}

const schemaProjectionLemma = deFusionLemmaCodec.decode({
	canonicalForm: "im",
	coreFeatures: {},
});

export const deFusionModelCitationSurfaceSchema =
	buildDeFusionCitationSurfaceCodec(schemaProjectionLemma).in;

export const inputSchema = z.strictObject({
	markedContext: grammaticalResolutionMarkedContextSchema,
}) satisfies PromptInputSchema;

export const outputSchema = z.strictObject({
	decision: z.enum(["Resolved", "Unresolved"]),
	resolution: z
		.strictObject({
			memberOrthographies: z
				.array(z.enum(["Standard", "Typo"]))
				.length(1),
			realizationCoverage: z.enum(["Full", "Partial"]),
			surface: deFusionModelCitationSurfaceSchema,
			lemma: deFusionModelLemmaSchema,
		})
		.nullable(),
}) satisfies PromptOutputSchema;
