// Generated concrete schemas. Run bun run generate.
import { HeSuffixoidMorphemeFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/he/morpheme/suffixoid.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "he", family: "Morpheme", kind: "Suffixoid" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
