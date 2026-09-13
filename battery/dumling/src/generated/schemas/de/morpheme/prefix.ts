// Generated concrete schemas. Run bun run generate.
import { DePrefixMorphemeFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/de/morpheme/prefix.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "de", family: "Morpheme", kind: "Prefix" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
