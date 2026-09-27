// Generated concrete schemas. Run bun run generate.
import { HeInterjectionLocutionFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/he/locution/interjection.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "he", family: "Locution", kind: "INTJ" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
