import { codecBuilder4 } from "codec-builder-library/v4";
import { schemasFor } from "dumling/schema";
import { z } from "zod";

import { asObjectSchema } from "../../../../../../../schema/as-object-schema";
import type {
	PromptInputSchema,
	PromptOutputSchema,
} from "../../../../../../assembly";

const canonicalLemmaSchema = asObjectSchema(
	schemasFor.de.entity.Lemma.Lexeme.PART(),
);
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Lexeme.PART(),
);

export const deParticleLemmaCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalLemmaSchema,
	{
		language: "de",
		family: "Lexeme",
		kind: "PART",
	},
);

export const deParticleModelLemmaSchema = deParticleLemmaCodec.in;

type DeParticleLemma = z.output<typeof deParticleLemmaCodec>;

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

export function buildDeParticleCitationSurfaceCodec(lemma: DeParticleLemma) {
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
	canonicalForm: "nicht",
	family: "Lexeme",
	kind: "PART",
	coreFeatures: {
		abbr: null,
		foreign: null,
		partType: null,
		polarity: "Neg",
	},
} satisfies DeParticleLemma;

export const deParticleModelCitationSurfaceSchema =
	buildDeParticleCitationSurfaceCodec(schemaProjectionLemma).in;

export const inputSchema = z.strictObject({
	markedContext: z.string().min(1),
}) satisfies PromptInputSchema;

export const outputSchema = z.strictObject({
	decision: z.enum(["Resolved", "Unresolved"]),
	resolution: z
		.strictObject({
			memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(1),
			surface: deParticleModelCitationSurfaceSchema,
			lemma: deParticleModelLemmaSchema,
		})
		.nullable(),
}) satisfies PromptOutputSchema;
