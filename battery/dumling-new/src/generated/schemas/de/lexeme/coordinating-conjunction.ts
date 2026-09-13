// Generated concrete schemas. Run bun run generate.
import { DeCoordinatingConjunctionFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/de/lexeme/coordinating-conjunction.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "de", family: "Lexeme", kind: "CCONJ" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
