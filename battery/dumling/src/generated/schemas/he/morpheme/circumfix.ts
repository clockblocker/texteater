// Generated concrete schemas. Run bun run generate.
import { HeCircumfixMorphemeFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/he/morpheme/circumfix.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "he", family: "Morpheme", kind: "Circumfix" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
