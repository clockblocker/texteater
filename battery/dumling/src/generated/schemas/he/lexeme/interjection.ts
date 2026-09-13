// Generated concrete schemas. Run bun run generate.
import { HeInterjectionFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/he/lexeme/interjection.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "he", family: "Lexeme", kind: "INTJ" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
