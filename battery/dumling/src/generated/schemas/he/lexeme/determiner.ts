// Generated concrete schemas. Run bun run generate.
import { HeDeterminerFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/he/lexeme/determiner.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "he", family: "Lexeme", kind: "DET" },
	featureBags.shape.core,
	featureBags.shape.inflectional,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
