import { codecBuilder4 } from "codec-builder-library/v4";
import { schemasFor } from "dumling/schema";
import { z } from "zod";

import { asObjectSchema } from "../../../../../../../schema/as-object-schema";
import type {
	PromptInputSchema,
	PromptOutputSchema,
} from "../../../../../../assembly";

const canonicalLemmaSchema = asObjectSchema(
	schemasFor.de.entity.Lemma.Lexeme.PROPN(),
);
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Lexeme.PROPN(),
);
const canonicalInflectionSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Inflection.Lexeme.PROPN(),
);

export const deProperNounLemmaCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalLemmaSchema,
	{
		language: "de",
		family: "Lexeme",
		kind: "PROPN",
	},
);

export const deProperNounModelLemmaSchema = deProperNounLemmaCodec.in;

type DeProperNounLemma = z.output<typeof deProperNounLemmaCodec>;

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

export function buildDeProperNounCitationSurfaceCodec(
	lemma: DeProperNounLemma,
) {
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

export function buildDeProperNounInflectionSurfaceCodec(
	lemma: DeProperNounLemma,
) {
	const canonicalCodec = codecBuilder4.buildFixedFieldsCodec(
		canonicalInflectionSurfaceSchema,
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
	canonicalForm: "Berlin",
	family: "Lexeme",
	kind: "PROPN",
	coreFeatures: { abbr: null, foreign: null, gender: "Neut" },
} satisfies DeProperNounLemma;

export const deProperNounModelCitationSurfaceSchema =
	buildDeProperNounCitationSurfaceCodec(schemaProjectionLemma).in;
export const deProperNounModelInflectionSurfaceSchema =
	buildDeProperNounInflectionSurfaceCodec(schemaProjectionLemma).in;

export const inputSchema = z.strictObject({
	markedContext: z.string().min(1),
}) satisfies PromptInputSchema;

export const outputSchema = z.strictObject({
	decision: z.enum(["Resolved", "Unresolved"]),
	resolution: z
		.strictObject({
			memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(1),
			surface: z.union([
				deProperNounModelCitationSurfaceSchema,
				deProperNounModelInflectionSurfaceSchema,
			]),
			lemma: deProperNounModelLemmaSchema,
		})
		.nullable(),
}) satisfies PromptOutputSchema;
