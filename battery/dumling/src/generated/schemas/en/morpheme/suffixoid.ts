// Generated concrete schemas. Run bun run generate.
import { EnSuffixoidMorphemeFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/en/morpheme/suffixoid.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "en", family: "Morpheme", kind: "Suffixoid" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
