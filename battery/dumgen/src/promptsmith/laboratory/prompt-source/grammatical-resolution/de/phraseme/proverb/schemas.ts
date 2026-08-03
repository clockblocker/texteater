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
	schemasFor.de.entity.Lemma.Phraseme.Proverb(),
);
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Phraseme.Proverb(),
);

export const deProverbLemmaCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalLemmaSchema,
	{ language: "de", family: "Phraseme", kind: "Proverb" },
);

export const deProverbModelLemmaSchema = deProverbLemmaCodec.in;

type DeProverbLemma = z.output<typeof deProverbLemmaCodec>;

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

export function buildDeProverbCitationSurfaceCodec(lemma: DeProverbLemma) {
	const canonicalCodec = codecBuilder4.buildFixedFieldsCodec(
		canonicalCitationSurfaceSchema,
		{ language: "de", lemma },
	);
	const modelSchema = canonicalCodec.in.extend({
		realizationCoverage: z.literal("Full"),
		surfaceFeatures: modelSurfaceFeaturesSchema,
	});
	return z.codec(modelSchema, canonicalCodec.out, {
		decode: (model) =>
			canonicalCodec.decode(normalizeModelSurfaceFeatures(model)),
		encode: (canonical) =>
			modelSchema.parse(canonicalCodec.encode(canonical)),
	});
}

const schemaProjectionLemma = deProverbLemmaCodec.decode({
	canonicalForm: "Morgenstund hat Gold im Mund",
	coreFeatures: {},
});

export const deProverbModelCitationSurfaceSchema =
	buildDeProverbCitationSurfaceCodec(schemaProjectionLemma).in;

const targetPairPattern = /<TARGET>(.*?)<\/TARGET>/gsu;
const proverbMarkedContextSchema =
	grammaticalResolutionMarkedContextSchema.superRefine(
		(markedContext, context) => {
			const members = [...markedContext.matchAll(targetPairPattern)].map(
				(match) => match[1] ?? "",
			);
			if (members.length < 2) {
				context.addIssue({
					code: "custom",
					message:
						"Proverb input requires at least two TARGET members.",
				});
			}
		},
	);

export const inputSchema = z.strictObject({
	markedContext: proverbMarkedContextSchema,
}) satisfies PromptInputSchema;

export const outputSchema = z.strictObject({
	decision: z.enum(["Resolved", "Unresolved"]),
	resolution: z
		.strictObject({
			memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(2),
			surface: deProverbModelCitationSurfaceSchema,
			lemma: deProverbModelLemmaSchema,
		})
		.nullable(),
}) satisfies PromptOutputSchema;
