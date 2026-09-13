// Generated concrete schemas. Run bun run generate.
import { EnNumeralFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/en/lexeme/numeral.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "en", family: "Lexeme", kind: "NUM" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
