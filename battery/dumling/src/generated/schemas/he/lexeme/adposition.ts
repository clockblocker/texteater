// Generated concrete schemas. Run bun run generate.
import { HeAdpositionFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/he/lexeme/adposition.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "he", family: "Lexeme", kind: "ADP" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
