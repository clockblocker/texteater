// Generated concrete schemas. Run bun run generate.
import { EnOtherFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/en/lexeme/other.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "en", family: "Lexeme", kind: "X" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
