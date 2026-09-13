// Generated concrete schemas. Run bun run generate.
import { HePunctuationFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/he/lexeme/punctuation.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "he", family: "Lexeme", kind: "PUNCT" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
