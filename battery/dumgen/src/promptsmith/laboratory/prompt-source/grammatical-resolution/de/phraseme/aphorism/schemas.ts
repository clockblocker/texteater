import { codecBuilder4 } from "codec-builder-library/v4";
import { schemasFor } from "dumling/schema";
import { z } from "zod";

import { asObjectSchema } from "../../../../../../../schema/as-object-schema";
import {
	grammaticalResolutionMarkedContextSchema,
	normalizedMembersSchema,
	type PromptInputSchema,
	type PromptOutputSchema,
} from "../../../../../../assembly";

const canonicalLemmaSchema = asObjectSchema(
	schemasFor.de.entity.Lemma.Phraseme.Aphorism(),
);
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Phraseme.Aphorism(),
);

export const deAphorismLemmaCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalLemmaSchema,
	{ language: "de", family: "Phraseme", kind: "Aphorism" },
);

export const deAphorismModelLemmaSchema = deAphorismLemmaCodec.in;

type DeAphorismLemma = z.output<typeof deAphorismLemmaCodec>;

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

export function buildDeAphorismCitationSurfaceCodec(lemma: DeAphorismLemma) {
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
	canonicalForm: "Alt werden, heißt sehend werden",
	family: "Phraseme",
	kind: "Aphorism",
	coreFeatures: {},
} satisfies DeAphorismLemma;

export const deAphorismModelCitationSurfaceSchema =
	buildDeAphorismCitationSurfaceCodec(schemaProjectionLemma).in.omit({
		normalizedSurface: true,
	});

const targetPairPattern = /<TARGET>(.*?)<\/TARGET>/gsu;
const aphorismMarkedContextSchema =
	grammaticalResolutionMarkedContextSchema.superRefine(
		(markedContext, context) => {
			const members = [...markedContext.matchAll(targetPairPattern)].map(
				(match) => match[1] ?? "",
			);
			if (members.length < 2) {
				context.addIssue({
					code: "custom",
					message:
						"Aphorism input requires at least two TARGET members.",
				});
			}
		},
	);

export const inputSchema = z.strictObject({
	markedContext: aphorismMarkedContextSchema,
}) satisfies PromptInputSchema;

export const outputSchema = z.strictObject({
	decision: z.enum(["Resolved", "Unresolved"]),
	resolution: z
		.strictObject({
			memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(2),
			normalizedMembers: normalizedMembersSchema,
			realizationCoverage: z.enum(["Full", "Partial"]),
			surface: deAphorismModelCitationSurfaceSchema,
			lemma: deAphorismModelLemmaSchema,
		})
		.nullable(),
}) satisfies PromptOutputSchema;
