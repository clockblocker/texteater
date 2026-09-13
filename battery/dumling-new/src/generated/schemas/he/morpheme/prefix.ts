// Generated concrete schemas. Run bun run generate.
import { HePrefixMorphemeFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/he/morpheme/prefix.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "he", family: "Morpheme", kind: "Prefix" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
