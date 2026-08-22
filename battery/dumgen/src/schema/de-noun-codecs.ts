import { codecBuilder4 } from "codec-builder-library/v4";
import { dangerouslyHeavySchemasForAbout100MiBRss as schemasFor } from "dumling/dangerously-heavy-schema-tree";
import { z } from "zod";

import { asObjectSchema } from "./as-object-schema";

const canonicalLemmaSchema = asObjectSchema(
	schemasFor.de.entity.Lemma.Lexeme.NOUN(),
);
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Lexeme.NOUN(),
);
const canonicalInflectionSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Inflection.Lexeme.NOUN(),
);

export const deNounLemmaCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalLemmaSchema,
	{
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
	},
);

export const deNounModelLemmaSchema = deNounLemmaCodec.in;

type DeNounLemma = z.output<typeof deNounLemmaCodec>;

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

export function buildDeNounCitationSurfaceCodec(lemma: DeNounLemma) {
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

export function buildDeNounInflectionSurfaceCodec(lemma: DeNounLemma) {
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

// A fixed field's value does not affect the derived input shape. Keeping these
// schemas beside their codec factories lets Promptsmith import the exact model
// boundary without rebuilding it with independent omit masks.
const schemaProjectionLemma = {
	language: "de",
	canonicalForm: "Schema",
	family: "Lexeme",
	kind: "NOUN",
	coreFeatures: { gender: "Neut", hyph: null },
} satisfies DeNounLemma;

export const deNounModelCitationSurfaceSchema = buildDeNounCitationSurfaceCodec(
	schemaProjectionLemma,
).in;
export const deNounModelInflectionSurfaceSchema =
	buildDeNounInflectionSurfaceCodec(schemaProjectionLemma).in;
